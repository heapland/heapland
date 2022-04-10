package com.heapland.services

case class DatabaseServer(majorVersion: Int, minorVersion: Int, productName: String, patchVersion: Int = 0, connectionName: String = "")
case class RequestQueryExecution(q: String)
case class ColumnMeta(name: String, dataType: String)
case class QueryExecutionResult(columns: Seq[ColumnMeta], result: Vector[Map[String, Object]], resultSize: Long = -1)
case class NewQuery(name: String, text: String)
case class QueryView(id: Long, name: String, text: String)