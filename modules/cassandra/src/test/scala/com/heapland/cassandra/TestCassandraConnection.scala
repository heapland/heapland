package com.heapland.cassandra

import com.heapland.services.CassandraConnection
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.must.Matchers

class TestCassandraConnection extends AnyFlatSpec with Matchers {

  val conn = CassandraConnection(
    name = "test",
    datacenter = "datacenter1",
    contactPoints = "127.0.0.1:9042",
    username = "",
    password = ""
  )

  it should "get database info" in {
    val meta = CassandraService.getDBInfo(conn)
    val schemas = CassandraService.getCatalogs(conn)
    val tables = CassandraService.listTables("sales", conn)
    val qResult = CassandraService.executeQuery("""CREATE TABLE store.shopping_cart3 (
                                                  |userid text PRIMARY KEY,
                                                  |item_count int,
                                                  |last_update_timestamp timestamp
                                                  |);""".stripMargin, conn)
    val tableMeta = CassandraService.tableDataView("store", "shopping_cart", conn)
    assert(meta.isSuccess)
  }



}
