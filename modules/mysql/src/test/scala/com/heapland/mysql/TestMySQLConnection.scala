package com.heapland.mysql

import com.heapland.mysql.MySQLDatabaseService
import com.heapland.services.MySQLConnection
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.funsuite.AnyFunSuite
import org.scalatest.matchers.must.Matchers

class TestMySQLConnection extends AnyFlatSpec with Matchers {

  val conn = MySQLConnection(
    name = "test",
    database = "sys",
    username = "root",
    hostname = "127.0.0.1",
    password = "gigapass"
  )

  it should "get database info" in {
    val meta = MySQLDatabaseService.getDBInfo(conn)
    val schemas = MySQLDatabaseService.getSchemas(conn)
    val catalogs = MySQLDatabaseService.getCatalogs(conn)
    val tables = MySQLDatabaseService.listTables("mysql", conn)
    val qs = MySQLDatabaseService.executeQuery("select * from agents", conn)
    val desc = MySQLDatabaseService.listSchemaObjects("", conn)

    assert(meta.isSuccess)
    assert(schemas.isSuccess && schemas.get.size == 0)
    assert(catalogs.isSuccess)
  }



}
