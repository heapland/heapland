package web.models.formats

import java.sql.Timestamp

import com.heapland.services.{
  AWSS3Connection,
  CassandraConnection,
  CockroachDBConnection,
  ColumnDetail,
  ColumnMeta,
  DatabaseServer,
  ForeignKey,
  KafkaConnection,
  MariaDBConnection,
  MySQLConnection,
  NewQuery,
  PgConnection,
  PrimaryKey,
  QueryExecutionResult,
  QueryView,
  RequestQueryExecution,
  SchemaObjects,
  ServiceConnection,
  TableIndex,
  TableKey,
  TableMeta
}
import com.heapland.services.fs.{FailedFileListing, FileListing, FileListingResult, FileSummary}
import play.api.libs.json.{JsBoolean, JsNull, JsNumber, JsString, Json, Writes}

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
  implicit val anyWrite: Writes[Any] = Writes { (someClass: Any) =>
    someClass match {
      case x: Int       => JsNumber(x)
      case x: Double    => JsNumber(BigDecimal(x))
      case x: Float     => JsNumber(BigDecimal(x))
      case x: Long      => JsNumber(x)
      case x: String    => JsString(x)
      case x: Timestamp => JsString(x.toString)
      case x: Boolean   => JsBoolean(x)
      case x: java.time.Instant => {
        println(Timestamp.from(x).toString)

        JsString(Timestamp.from(x).toString)
      }
      case x: Any            => {
        print(x.getClass.getName)
        JsString(x.toString)
      }
    }
  }
  implicit val dbServer       = Json.format[DatabaseServer]
  implicit val qReq           = Json.format[RequestQueryExecution]
  implicit val newQueryFmt    = Json.format[NewQuery]
  implicit val updateQueryFmt = Json.format[QueryView]
  implicit val tableKeyFmt    = Json.format[TableKey]
  implicit val schemaObjsFmt  = Json.format[SchemaObjects]

  implicit val colDetailFmt  = Json.format[ColumnDetail]
  implicit val primaryKeyFmt = Json.format[PrimaryKey]
  implicit val foreignKeyFmt = Json.format[ForeignKey]
  implicit val tableIndexFmt = Json.format[TableIndex]
  implicit val tableMetaFmt  = Json.format[TableMeta]
  implicit val colMeta       = Json.format[ColumnMeta]

  implicit val queryResultWrites = new Writes[QueryExecutionResult] {
    def writes(qr: QueryExecutionResult) = Json.obj(
      "columns"    -> qr.columns,
      "result"     -> qr.result,
      "resultSize" -> qr.resultSize
    )
  }

}
