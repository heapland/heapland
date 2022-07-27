package com.heapland.services

case class DatabaseServer(majorVersion: Int, minorVersion: Int, productName: String, dbName: String, patchVersion: Int = 0, connectionName: String = "")
case class RequestQueryExecution(q: String)
case class ColumnMeta(name: String, dataType: String)
case class ColumnDetail(name: String, dataType: String, isPrimaryKey: Boolean, isForeignKey: Boolean)
case class PrimaryKey(colName: String, name: String)
case class ForeignKey(colName: String, name: String, foreignTable: String, foreignCol: String)
case class QueryExecutionResult(columns: Seq[ColumnMeta], result: Vector[Map[String, Any]], resultSize: Long = -1)
case class SchemaObjects(views: Seq[String], tables: Seq[String], routines: Seq[String])
case class NewQuery(name: String, text: String)
case class QueryView(id: Long, name: String, text: String)
case class TableKey(pkTableCat: String,
                    pkTableSchema: String,
                    pkTableName: String,
                    pkColName: String,
                    fkTableName: String,
                    fkColumnName: String,
                    updateRule: Short,
                    deleteRule: Short,
                    fkName: String, pkName: String, isImportedKeys: Boolean)
case class TableIndex(name: String, col: String)
case class TableMeta(columns: Seq[ColumnDetail], primaryKeys: Seq[PrimaryKey], foreignKeys: Seq[ForeignKey], indexes: Seq[TableIndex])