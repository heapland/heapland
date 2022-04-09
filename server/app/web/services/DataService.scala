package web.services

import java.io.File

import com.heapland.aws.S3DataService
import com.heapland.services.fs.FileSummary
import com.heapland.services.MariaDBConnection
import com.heapland.services.fs.{FileListingResult, FileSummary}
import com.heapland.services.{DataServiceProvider, DatabaseServer, DatabaseServiceProvider, QueryExecutionResult, ServiceConnection}

import scala.util.{Failure, Try}

class FileServiceManager[T <: ServiceConnection](connection: T, dataServiceProvider: DataServiceProvider[T]) {

  def isValidConnection(): Try[Boolean] = {
    dataServiceProvider.isValidConfig(connection)
  }

  def listFiles(path: Option[String], marker: Option[String], fsName: String, provider: String): Try[FileListingResult] =
    dataServiceProvider.listFileItems(connection, path, marker).map(_.copy(fsName = fsName, provider = provider))

  def createDirectory(path: String): Try[Boolean] = dataServiceProvider.createDirectory(connection, path)

  def getFileSummary(path: String): Try[FileSummary] = dataServiceProvider.getFileSummary(connection, path)

  def deleteFile(path: String): Try[Boolean] = dataServiceProvider.deleteFile(connection, path)

  def uploadFile(path: String, f: File) = dataServiceProvider.uploadFile(connection, path, f)
}

class DatabaseServiceManager[T <: ServiceConnection](connection: T, dbService: DatabaseServiceProvider[T]) {
  type QueryResult = Vector[Map[String, Object]]
   private val dmlKeywords = Set("create", "insert", "update", "delete", "drop")

  def getSummary(name: String): Try[DatabaseServer] = dbService.getDBInfo(connection).map(_.copy(connectionName = name))

  def getCatalogs(): Try[List[String]] = dbService.getCatalogs(connection)

  def getSchemas(): Try[List[String]] = dbService.getSchemas(connection)

  def listTables(schema: String): Try[List[String]] = dbService.listTables(schema, connection)

  def getTableData(schema: String, table: String): Try[QueryExecutionResult] = dbService.tableDataView(schema, table, connection)

  def executeQuery(q: String): Try[QueryExecutionResult] = {
    val query = q.toLowerCase().trim.split(" ").headOption
    query match {
      case None => Failure(new RuntimeException("Invalid query provided"))
      case Some(value) => if(dmlKeywords.contains(value)){
        dbService.executeUpdate(q, connection).map(c => QueryExecutionResult(Seq.empty, Vector.empty, c))
      } else {
        dbService.executeQuery(q, connection)
      }
    }
  }

}
