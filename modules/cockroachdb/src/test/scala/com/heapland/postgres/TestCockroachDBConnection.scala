package com.heapland.postgres

import com.heapland.services.CockroachDBConnection
import com.heapland.cockroachdb.CockroachDBService
import com.heapland.services.CockroachDBConnection
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.must.Matchers

class TestCockroachDBConnection extends AnyFlatSpec with Matchers {

  val conn = CockroachDBConnection(
    name = "test-cockroachdb",
    clusterId = sys.env("CDB_CLUSTER_ID"),
    database = sys.env("CDB_DATABASE"),
    username = sys.env("CDB_USERNAME"),
    hostname = sys.env("CDB_HOSTNAME"),
    password = sys.env("CDB_PASSWORD"),
    port = 26257
  )

  it should "get database info" in {
    val meta = CockroachDBService.getDBInfo(conn)
    val schemas = CockroachDBService.getSchemas(conn)
    val catalogs = CockroachDBService.getCatalogs(conn)
    val create = CockroachDBService.executeUpdate("create table if not exists account(name varchar(100), balance float)", conn)
    val tables = CockroachDBService.listTables("defaultdb", conn)
    val qs = CockroachDBService.executeQuery("select count(*) as count FROM account", conn)

    assert(meta.isSuccess)
    assert(schemas.isSuccess)
    assert(catalogs.isSuccess)
  }




}
