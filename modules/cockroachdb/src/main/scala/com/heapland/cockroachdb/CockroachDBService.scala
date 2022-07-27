package com.heapland.cockroachdb

import java.sql.{Connection, ResultSet}

import com.heapland.postgres.PostgresDBService.usingConfig
import com.heapland.services.{CockroachDBConnection, DatabaseServer, DatabaseServiceProvider, QueryExecutionResult, SchemaObjects, TableKey, TableMeta}
import scalikejdbc.{ConnectionPool, using}

import scala.collection.mutable
import scala.collection.mutable.ListBuffer
import scala.util.Try

object CockroachDBService extends DatabaseServiceProvider[CockroachDBConnection] {

  private val driverClass   = "org.postgresql.Driver"
  private val connectionIds = new mutable.HashSet[String]()

  private def usingConfig[T](config: CockroachDBConnection)(handler: Connection => T): Try[T] = {
    val id = s"${config.hostname}:${config.port}"
    if (!connectionIds.contains(id)) {
      Class.forName(driverClass)
      ConnectionPool.add(
        id,
        s"jdbc:postgresql://${config.hostname}:${config.port}/${config.database}?options=--cluster%3D${config.clusterId}",
        config.username,
        config.password
      )
      connectionIds.add(id)
    }

    using(ConnectionPool.borrow(id)) { c =>
      Try(handler(c))
    }
  }

  override def getDBInfo(config: CockroachDBConnection): Try[DatabaseServer] = usingConfig(config) { conn =>
    val dbMetadata = conn.getMetaData
    DatabaseServer(majorVersion = dbMetadata.getDatabaseMajorVersion,
                   minorVersion = dbMetadata.getDatabaseMinorVersion,
                   productName = dbMetadata.getDatabaseProductName,
      dbName = config.database)
  }

  override def getSchemas(config: CockroachDBConnection): Try[List[String]] = usingConfig(config) { conn =>
    val rs = conn.getMetaData.getSchemas
    val ls = new ListBuffer[String]
    while (rs.next()) {
      ls.addOne(rs.getString("TABLE_SCHEM"))
    }
    ls.toList
  }

  override def getCatalogs(config: CockroachDBConnection): Try[List[String]] = usingConfig(config) { conn =>
    val rs = conn.getMetaData.getCatalogs
    val ls = new ListBuffer[String]
    while (rs.next()) {
      ls.addOne(rs.getString("TABLE_CAT"))
    }
    ls.toList
  }

  override def listTables(schema: String, config: CockroachDBConnection): Try[List[String]] = usingConfig(config) { conn =>
    val rs = conn.getMetaData.getTables(schema, "", null, Array("TABLE"))
    val ls = new ListBuffer[String]
    while (rs.next()) {
      ls.addOne(rs.getString("TABLE_NAME"))
    }
    ls.toList
  }

  override def tableDataView(schema: String, table: String, config: CockroachDBConnection): Try[QueryExecutionResult] = ???

  override def listSchemaObjects(schema: String, config: CockroachDBConnection): Try[SchemaObjects] = usingConfig(config) { conn =>
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

  override def listTablesWithMeta(schema: String, config: CockroachDBConnection): Try[Map[String, TableMeta]] =
    listTables(schema, config).flatMap(tables => {
      Try(tables.map(t => describeTable(schema, t, config).map(tm  => t -> tm)).map(_.get).toMap)
    })

  override def describeTable(schema: String, table: String, config: CockroachDBConnection): Try[TableMeta] = ???

  private def buildMap(queryResult: ResultSet, colNames: Seq[String]): Option[Map[String, Object]] =
    if (queryResult.next())
      Some(colNames.map(n => n -> queryResult.getObject(n)).toMap)
    else
      None

  override def executeQuery(q: String, config: CockroachDBConnection): Try[QueryExecutionResult] = usingConfig(config) { conn =>
    val rs       = conn.prepareStatement(q).executeQuery()
    val md       = rs.getMetaData
    val colNames = (1 to md.getColumnCount) map md.getColumnName
    val result = Iterator.continually(buildMap(rs, colNames)).takeWhile(_.isDefined).map(_.get).toVector
    QueryExecutionResult(Seq.empty, result)

  }

  override def executeUpdate(q: String, config: CockroachDBConnection): Try[Int] = usingConfig(config) { conn =>
    conn.prepareStatement(q).executeUpdate()
  }
}
