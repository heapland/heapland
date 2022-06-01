package com.heapland.mariadb

import java.sql.{Connection, ResultSet}

import com.heapland.services.{ColumnMeta, DatabaseServer, DatabaseServiceProvider, MariaDBConnection, QueryExecutionResult, SchemaObjects, TableKey, TableMeta}
import scalikejdbc.{ConnectionPool, using}

import scala.collection.mutable
import scala.collection.mutable.ListBuffer
import scala.util.Try

object MariaDBService extends DatabaseServiceProvider[MariaDBConnection] {
  private val driverClass = "org.mariadb.jdbc.Driver"
  private val connectionIds = new mutable.HashSet[String]()

  private def usingConfig[T](config: MariaDBConnection)(handler: Connection => T): Try[T] = {
    val id = s"${config.hostname}:${config.port}"
    if(!connectionIds.contains(id)) {
      Class.forName(driverClass)
      ConnectionPool.add(id, s"jdbc:mariadb://${config.hostname}:${config.port}/${config.database}", config.username, config.password)
    }

    using(ConnectionPool.borrow(id)) { c =>
      Try(handler(c))
    }
  }

  override def getDBInfo(config: MariaDBConnection): Try[DatabaseServer] = {
    usingConfig(config){ conn =>
      val dbMetadata = conn.getMetaData
      DatabaseServer(majorVersion = dbMetadata.getDatabaseMajorVersion,
        minorVersion = dbMetadata.getDatabaseMinorVersion,
        productName = dbMetadata.getDatabaseProductName,
        dbName = config.database)
    }
  }

  override def getSchemas(config: MariaDBConnection): Try[List[String]] = {
    usingConfig(config){ conn =>
      val rs = conn.getMetaData.getSchemas
      val ls = new ListBuffer[String]
      while(rs.next()){
        ls.addOne(rs.getString("TABLE_SCHEM"))
      }
      ls.toList
    }
  }

  override def getCatalogs(config: MariaDBConnection): Try[List[String]] = {
    usingConfig(config){ conn =>
      val rs = conn.getMetaData.getCatalogs
      val ls = new ListBuffer[String]
      while(rs.next()){
        ls.addOne(rs.getString("TABLE_CAT"))
      }
      ls.toList
    }
  }

  override def listTables(schema: String, config: MariaDBConnection): Try[List[String]] = {
    usingConfig(config){ conn =>
      val rs = conn.getMetaData.getTables(config.database, "", null, Array("TABLE"))
      val ls = new ListBuffer[String]
      while(rs.next()){
        ls.addOne(rs.getString("TABLE_NAME"))
      }
      ls.toList
    }
  }

  override def tableDataView(schema: String, table: String, config: MariaDBConnection): Try[QueryExecutionResult] =
    executeQuery(s"SELECT * FROM ${config.database}.${table} limit 100", config)

  override def listSchemaObjects(schema: String, config: MariaDBConnection): Try[SchemaObjects] = ???

  override def describeTable(schema: String, table: String, config: MariaDBConnection): Try[TableMeta] = ???

  private def buildMap(queryResult: ResultSet, colNames: Seq[String]): Option[Map[String, Object]] =
    if (queryResult.next())
      Some(colNames.map(n => n -> queryResult.getObject(n)).toMap)
    else
      None

  override def executeQuery(q: String, config: MariaDBConnection): Try[QueryExecutionResult] = {
    usingConfig(config){ conn =>
      val rs = conn.prepareStatement(q).executeQuery()
      val md = rs.getMetaData
      val colNames = (1 to md.getColumnCount) map md.getColumnName
      val result = Iterator.continually(buildMap(rs, colNames)).takeWhile(_.isDefined).map(_.get).toVector
      val columns = (1 to md.getColumnCount).map { id =>
        ColumnMeta(name = md.getColumnName(id), dataType = md.getColumnTypeName(id))
      }
      QueryExecutionResult(columns, result)
    }
  }

  override def executeUpdate(q: String, config: MariaDBConnection): Try[Int] = {
    usingConfig(config){ conn =>
      conn.prepareStatement(q).executeUpdate()
    }
  }

  override def getTableKeys(catalog: String, schema: String, table: String, config: MariaDBConnection): Try[Seq[TableKey]] = ???

}