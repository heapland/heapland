package com.heapland.postgres

import java.sql.{Connection, ResultSet}

import com.heapland.services.{ColumnDetail, ColumnMeta, DatabaseServer, DatabaseServiceProvider, ForeignKey, PgConnection, PrimaryKey, QueryExecutionResult, SchemaObjects, TableIndex, TableKey, TableMeta}
import scalikejdbc.{ConnectionPool, using}

import scala.collection.mutable
import scala.collection.mutable.{ArrayBuffer, ListBuffer}
import scala.util.Try

object PostgresDBService extends DatabaseServiceProvider[PgConnection] {
  private val driverClass   = "org.postgresql.Driver"
  private val connectionIds = new mutable.HashSet[String]()

  private def usingConfig[T](config: PgConnection)(handler: Connection => T): Try[T] = {
    val id = s"${config.hostname}:${config.port}"
    if (!connectionIds.contains(id)) {
      Try {
        Class.forName(driverClass)
        ConnectionPool.add(id, s"jdbc:postgresql://${config.hostname}:${config.port}/${config.database}", config.username, config.password)
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

  override def getDBInfo(config: PgConnection): Try[DatabaseServer] = {
    usingConfig(config) { conn =>
      val dbMetadata = conn.getMetaData
      DatabaseServer(
        majorVersion = dbMetadata.getDatabaseMajorVersion,
        minorVersion = dbMetadata.getDatabaseMinorVersion,
        productName = dbMetadata.getDatabaseProductName,
        dbName = config.database
      )
    }
  }

  override def getSchemas(config: PgConnection): Try[List[String]] = {
    usingConfig(config) { conn =>
      val rs = conn.getMetaData.getSchemas
      val ls = new ListBuffer[String]
      while (rs.next()) {
        ls.addOne(rs.getString("TABLE_SCHEM"))
      }
      ls.toList
    }
  }

  override def getCatalogs(config: PgConnection): Try[List[String]] = {
    usingConfig(config) { conn =>
      val rs = conn.getMetaData.getCatalogs
      val ls = new ListBuffer[String]
      while (rs.next()) {
        ls.addOne(rs.getString("TABLE_CAT"))
      }
      ls.toList
    }
  }

  override def listTables(schema: String, config: PgConnection): Try[List[String]] = {
    usingConfig(config) { conn =>
      val rs = conn.getMetaData.getTables(conn.getCatalog, schema, null, Array("TABLE"))
      val ls = new ListBuffer[String]
      while (rs.next()) {
        ls.addOne(rs.getString("TABLE_NAME"))
      }
      ls.toList
    }
  }

  override def listSchemaObjects(schema: String, config: PgConnection): Try[SchemaObjects] = usingConfig(config) { conn =>
    val rsTables = conn.getMetaData.getTables(config.database, schema, null, Array("TABLE"))
    val rsViews = conn.getMetaData.getTables(config.database, schema, null, Array("VIEW"))
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
      s"""SELECT format('%I(%s)', p.proname, oidvectortypes(p.proargtypes)) as func_name
         FROM pg_proc p INNER JOIN pg_namespace ns ON p.pronamespace = ns.oid WHERE ns.nspname = ?"""
    val prepStatement = conn.prepareStatement(q)
    prepStatement.setString(1, schema)
    val rs       = prepStatement.executeQuery()
    while(rs.next()){
      listFunctions.addOne(rs.getString("func_name"))
    }
    SchemaObjects(views = listViews.toSeq, tables = listTables.toSeq, routines = listFunctions.toSeq)
  }

  override def listTablesWithMeta(schema: String, config: PgConnection): Try[Map[String,TableMeta]] =
    listTables(schema, config).flatMap(tables => {
      Try(tables.map(t => describeTable(schema, t, config).map(tm  => t -> tm)).map(_.get).toMap)
    })

  override def describeTable(schema: String, table: String, config: PgConnection): Try[TableMeta] = usingConfig(config) { conn =>
  val q = s"SELECT * FROM ${schema}.${table} LIMIT 1"
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

    val indexRS = conn.getMetaData.getIndexInfo(config.database, schema, table, true, false)
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



  override def tableDataView(schema: String, table: String, config: PgConnection): Try[QueryExecutionResult] =
    executeQuery(s"SELECT * FROM ${schema}.${table}", config)

  private def buildMap(queryResult: ResultSet, colNames: Seq[String]): Option[Map[String, Object]] =
    if (queryResult.next())
      Some(colNames.map(n => n -> queryResult.getObject(n)).toMap)
    else
      None

  override def executeQuery(q: String, config: PgConnection): Try[QueryExecutionResult] = {
    usingConfig(config) { conn =>
      val rs       = conn.prepareStatement(q).executeQuery()
      val md       = rs.getMetaData
      val colNames = (1 to md.getColumnCount) map md.getColumnName
      val columns = (1 to md.getColumnCount).map { id =>
        ColumnMeta(name = md.getColumnName(id), dataType = md.getColumnTypeName(id))
      }
      val result = Iterator.continually(buildMap(rs, colNames)).takeWhile(_.isDefined).map(_.get).toVector
      QueryExecutionResult(columns, result)
    }
  }

  override def executeUpdate(q: String, config: PgConnection): Try[Int] = {
    usingConfig(config) { conn =>
      conn.prepareStatement(q).executeUpdate()
    }
  }

}
