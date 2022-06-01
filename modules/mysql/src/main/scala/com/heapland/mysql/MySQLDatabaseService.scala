package com.heapland.mysql

import java.sql.Connection

import com.heapland.services.{ColumnMeta, DatabaseServer, DatabaseServiceProvider, MySQLConnection, QueryExecutionResult, SchemaObjects, TableKey, TableMeta}
import scalikejdbc._
import java.sql.ResultSet

import scala.collection.mutable
import scala.collection.mutable.ListBuffer
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
    executeQuery(s"SELECT * FROM ${config.database}.${table} limit 100", config)

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

  override def describeTable(schema: String, table: String, config: MySQLConnection): Try[TableMeta] = ???

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

  override def getTableKeys(catalog: String, schema: String, table: String,config: MySQLConnection): Try[Seq[TableKey]] = ???

}
