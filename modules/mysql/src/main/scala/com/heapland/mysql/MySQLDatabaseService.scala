package com.heapland.mysql

import java.sql.Connection

import com.heapland.services.{ColumnDetail, ColumnMeta, DatabaseServer, DatabaseServiceProvider, ForeignKey, MySQLConnection, PrimaryKey, QueryExecutionResult, SchemaObjects, TableIndex, TableKey, TableMeta}
import scalikejdbc._
import java.sql.ResultSet

import scala.collection.mutable
import scala.collection.mutable.{ArrayBuffer, ListBuffer}
import scala.util.Try

object MySQLDatabaseService extends DatabaseServiceProvider[MySQLConnection] {

  private val connectionIds = new mutable.HashSet[String]()
  private val driverClass = "com.mysql.cj.jdbc.Driver"

  private def usingConfig[T](config: MySQLConnection)(handler: Connection => T): Try[T] = {
    val id = s"${config.hostname}:${config.port}"
    if(!connectionIds.contains(id)) {
      Try {
        Class.forName(driverClass)
        ConnectionPool.add(id, s"jdbc:mysql://${config.hostname}:${config.port}/${config.database}", config.username, config.password)
      }.flatMap(_ => {
        using(ConnectionPool.borrow(id)) { c =>
          Try(handler(c))
        }
      })
    } else {
      using(ConnectionPool.borrow(id)) { c =>
        Try(handler(c))
      }
    }


  }

  override def getDBInfo(config: MySQLConnection): Try[DatabaseServer] = {
    usingConfig(config){ conn =>
      val dbMetadata = conn.getMetaData

      DatabaseServer(majorVersion = dbMetadata.getDatabaseMajorVersion,
        minorVersion = dbMetadata.getDatabaseMinorVersion,
        productName = dbMetadata.getDatabaseProductName,
        dbName = config.database)
    }
  }

  override def getSchemas(config: MySQLConnection): Try[List[String]] = {
    usingConfig(config){ conn =>
      val rs = conn.getMetaData.getSchemas
      val ls = new ListBuffer[String]
      while(rs.next()){
        ls.addOne(rs.getString("TABLE_SCHEM"))
      }
      ls.toList
    }
  }

  override def getCatalogs(config: MySQLConnection): Try[List[String]] = {
    usingConfig(config){ conn =>
      val rs = conn.getMetaData.getCatalogs
      val ls = new ListBuffer[String]
      while(rs.next()){
        ls.addOne(rs.getString("TABLE_CAT"))
      }
      ls.toList
    }
  }

  override def listTables(schema: String, config: MySQLConnection): Try[List[String]] = {
    usingConfig(config){ conn =>
      val rs = conn.getMetaData.getTables(config.database, "", null, Array("TABLE"))
      val ls = new ListBuffer[String]
      while(rs.next()){
        ls.addOne(rs.getString("TABLE_NAME"))
      }
      ls.toList
    }
  }

  override def tableDataView(schema: String, table: String, config: MySQLConnection): Try[QueryExecutionResult] =
    executeQuery(s"SELECT * FROM ${table} limit 100", config)

  override def listSchemaObjects(schema: String, config: MySQLConnection): Try[SchemaObjects] = usingConfig(config) { conn =>
    val rsTables = conn.getMetaData.getTables(config.database, null, null, Array("TABLE"))
    val rsViews = conn.getMetaData.getTables(config.database, null, null, Array("VIEW"))
    val listTables = new ListBuffer[String]
    val listViews = new ListBuffer[String]
    val listFunctions = new ListBuffer[String]
    while(rsTables.next()){
      listTables.addOne(rsTables.getString("TABLE_NAME"))
    }

    while(rsViews.next()){
      listViews.addOne(rsViews.getString("TABLE_NAME"))
    }

    val q =
      s"""SELECT specific_name FROM `information_schema`.`ROUTINES` WHERE routine_schema = ?"""
    val prepStatement = conn.prepareStatement(q)
    prepStatement.setString(1, config.database)
    val rs       = prepStatement.executeQuery()
    while(rs.next()){
      listFunctions.addOne(rs.getString("specific_name"))
    }
    SchemaObjects(views = listViews.toSeq, tables = listTables.toSeq, routines = listFunctions.toSeq)
  }

  override def listTablesWithMeta(schema: String, config: MySQLConnection): Try[Map[String, TableMeta]] =
    listTables(schema, config).flatMap(tables => {
      Try(tables.map(t => describeTable(schema, t, config).map(tm  => t -> tm)).map(_.get).toMap)
    })

  override def describeTable(schema: String, table: String, config: MySQLConnection): Try[TableMeta] = usingConfig(config) { conn =>
    val q = s"SELECT * FROM ${table} LIMIT 1"
    val rs       = conn.prepareStatement(q).executeQuery()
    val md       = rs.getMetaData

    val columns = (1 to md.getColumnCount).map { id =>
      ColumnDetail(name = md.getColumnName(id), dataType = md.getColumnTypeName(id), isForeignKey = false, isPrimaryKey = false)
    }
    val primaryKeysRS = conn.getMetaData.getPrimaryKeys(config.database, schema, table)
    val tablePrimaryKeys = ArrayBuffer.empty[PrimaryKey]
    while(primaryKeysRS.next()){
      tablePrimaryKeys.addOne(PrimaryKey(colName = primaryKeysRS.getString("COLUMN_NAME"),
        name = primaryKeysRS.getString("PK_NAME")))
    }

    val indexRS = conn.getMetaData.getIndexInfo(config.database, null, table, false, false)
    val tableIndexes = ArrayBuffer.empty[TableIndex]
    while(indexRS.next()){
      tableIndexes.addOne(TableIndex(name = indexRS.getString("INDEX_NAME"), col = indexRS.getString("COLUMN_NAME")))
    }

    val irs       = conn.getMetaData.getImportedKeys(config.database, schema, table)
    val foreignKeys = ArrayBuffer.empty[ForeignKey]
    while (irs.next()) {
      foreignKeys.addOne(
        ForeignKey(colName = irs.getString("FKCOLUMN_NAME"),
          name = irs.getString("FK_NAME"),
          foreignTable = irs.getString("PKTABLE_NAME"),
          foreignCol = irs.getString("PKCOLUMN_NAME")
        )
      )
    }

    val withKeysCols = columns.map{ cm =>
      cm.copy(isForeignKey = foreignKeys.exists(_.colName.equals(cm.name)),isPrimaryKey = tablePrimaryKeys.exists(_.colName.equals(cm.name)))
    }


    TableMeta(columns = withKeysCols, primaryKeys = tablePrimaryKeys.toSeq, foreignKeys = foreignKeys.toSeq, indexes = tableIndexes.toSeq)
  }

  private def buildMap(queryResult: ResultSet, colNames: Seq[String]): Option[Map[String, Object]] =
    if (queryResult.next())
      Some(colNames.map(n => n -> queryResult.getObject(n)).toMap)
    else
      None

  override def executeQuery(q: String, config: MySQLConnection): Try[QueryExecutionResult] = {
    usingConfig(config){ conn =>
      val rs = conn.prepareStatement(q).executeQuery()
      val md = rs.getMetaData

      val colNames = (1 to md.getColumnCount) map md.getColumnName
      val columns = (1 to md.getColumnCount).map { id =>
        println(s"column = ${md.getColumnName(id)}, datatype = ${md.getColumnTypeName(id)}, size = ${md.getColumnDisplaySize(id)}")

        ColumnMeta(name = md.getColumnName(id), dataType = md.getColumnTypeName(id))
      }
      val result = Iterator.continually(buildMap(rs, colNames)).takeWhile(_.isDefined).map(_.get).toVector
      QueryExecutionResult(columns, result)
    }
  }

  override def executeUpdate(q: String, config: MySQLConnection): Try[Int] = {
    usingConfig(config){ conn =>
      conn.prepareStatement(q).executeUpdate()
    }
  }

}
