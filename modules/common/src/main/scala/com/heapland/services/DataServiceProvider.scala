package com.heapland.services

import java.io.File

import com.heapland.services.fs.FileSummary
import com.heapland.services.fs.{FileListingResult, FileSummary}

import scala.util.Try

trait DataServiceProvider[T <: ServiceConnection] {

  def isValidConfig(config: T): Try[Boolean]

  def uploadFile(config: T, path: String, file: File): Try[String]

  def deleteFile(config: T, path: String): Try[Boolean]

  def listFileItems(config: T, path: Option[String], marker: Option[String]): Try[FileListingResult]

  def getFileSummary(config: T, path: String): Try[FileSummary]

  def createDirectory(config: T, path: String): Try[Boolean]

}

trait DatabaseServiceProvider[T <: ServiceConnection] {

  def getDBInfo(config: T): Try[DatabaseServer]

  def getSchemas(config: T): Try[List[String]]

  def getCatalogs(config: T): Try[List[String]]

  def listTables(schema: String, config: T): Try[List[String]]

  def tableDataView(schema: String, table: String, config: T):Try[QueryExecutionResult]

  def listSchemaObjects(schema: String, config: T): Try[SchemaObjects]

  def listTablesWithMeta(schema: String, config: T): Try[Map[String,TableMeta]]

  def describeTable(schema: String, table: String, config: T): Try[TableMeta]

  def executeQuery(q: String, config: T): Try[QueryExecutionResult]

  def executeUpdate(q: String, config: T): Try[Int]

}
