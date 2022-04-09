package com.heapland.postgres

import com.heapland.services.MariaDBConnection
import com.heapland.mariadb.MariaDBService
import com.heapland.services.MariaDBConnection
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.must.Matchers

/**
  * Start the docker mariadb
  * docker run --env MARIADB_USER=maria --env MARIADB_PASSWORD=secret --env MARIADB_DATABASE=gigahex --env MARIADB_ROOT_PASSWORD=root -p 3307:3306  mariadb:latest
  */
class TestMariaDBConnection extends AnyFlatSpec with Matchers {

  val conn = MariaDBConnection(
    name = "test",
    database = "local",
    username = "maria",
    hostname = "127.0.0.1",
    password = "secret",
    port = 3307
  )

  it should "get database info" in {
    val meta = MariaDBService.getDBInfo(conn)
    val schemas = MariaDBService.getSchemas(conn)
    val catalogs = MariaDBService.getCatalogs(conn)
    val created = MariaDBService.executeUpdate("create table if not exists ludo(players INT, audience INT)", conn)
    val tables = MariaDBService.listTables("local", conn)
    val qs = MariaDBService.executeQuery("select count(*) as count from ludo", conn)

    assert(meta.isSuccess)
    assert(schemas.isSuccess)
    assert(catalogs.isSuccess)
    assert(created.isSuccess && created.get == 0)
    assert(tables.isSuccess && tables.get.size == 1)
    assert(qs.isSuccess && qs.get.result.size == 1 && qs.get.result.head.get("count").get == 0)
  }



}
