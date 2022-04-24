package web.models.formats

import com.heapland.services.fs.FailedFileListing
import com.heapland.services.{
  AWSS3Connection,
  CassandraConnection,
  CockroachDBConnection,
  DatabaseServer,
  KafkaConnection,
  MariaDBConnection,
  MySQLConnection,
  NewQuery,
  PgConnection,
  QueryView,
  RequestQueryExecution,
  ServiceConnection
}
import com.heapland.services.fs.{FailedFileListing, FileListing, FileListingResult, FileSummary}
import play.api.libs.json.Json

trait ConnectionFormats {

  implicit val s3ConnectionFmt        = Json.format[AWSS3Connection]
  implicit val pgConnectionFmt        = Json.format[PgConnection]
  implicit val mysqlConnectionFmt     = Json.format[MySQLConnection]
  implicit val mariadbConnectionFmt   = Json.format[MariaDBConnection]
  implicit val cockroachConnFmt       = Json.format[CockroachDBConnection]
  implicit val cassandraConnectionFmt = Json.format[CassandraConnection]
  implicit val kafkaConnectionFmt     = Json.format[KafkaConnection]
  implicit val connectionServiceFmt   = Json.format[ServiceConnection]
  implicit val fileListingFmt         = Json.format[FileListing]
  implicit val fileListingResultFmt   = Json.format[FileListingResult]
  implicit val failedFileListingFmt   = Json.format[FailedFileListing]
  implicit val fileSummaryFmt         = Json.format[FileSummary]

}

trait DBFormats {
  implicit val dbServer       = Json.format[DatabaseServer]
  implicit val qReq           = Json.format[RequestQueryExecution]
  implicit val newQueryFmt    = Json.format[NewQuery]
  implicit val updateQueryFmt = Json.format[QueryView]
}
