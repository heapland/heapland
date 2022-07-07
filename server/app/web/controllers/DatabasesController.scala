package web.controllers

import akka.actor.ActorSystem
import akka.stream.Materializer
import com.fasterxml.jackson.databind.{ObjectMapper, SerializationFeature}
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.heapland.services.{CassandraConnection, MariaDBConnection, MySQLConnection, NewQuery, PgConnection, RequestQueryExecution, ServiceConnection}
import com.mohiva.play.silhouette.api.Silhouette
import controllers.AssetsFinder
import javax.inject.Inject
import web.models.{BadConnection, EntityNotFound, ErrorResponse, IllegalParam, InternalServerErrorResponse}
import web.models.formats.{AuthResponseFormats, ConnectionFormats, DBFormats}
import web.services.{DatabaseServiceManager, MemberService, SecretStore, WorkspaceService}
import play.api.cache.SyncCacheApi
import play.api.i18n.I18nSupport
import play.api.mvc._
import play.api.libs.json.{JsError, Json, Reads}
import play.api.mvc.{ControllerComponents, InjectedController}
import play.cache.NamedCache
import utils.auth.DefaultEnv
import web.controllers.handlers.SecuredWebRequestHandler
import com.fasterxml.jackson.module.scala.DefaultScalaModule
import com.heapland.cassandra.CassandraService
import com.heapland.mariadb.MariaDBService
import com.heapland.mysql.MySQLDatabaseService
import com.heapland.postgres.PostgresDBService
import web.models.requests.{OrgRequestsJsonFormat, WorkspaceConnection}

import scala.concurrent.Future
import scala.concurrent.ExecutionContext
import scala.util.{Failure, Success, Try}

class DatabasesController @Inject()(
    components: ControllerComponents,
    silhouette: Silhouette[DefaultEnv],
    memberService: MemberService,
    workspaceService: WorkspaceService,
    @NamedCache("workspace-keypairs") workspaceKeyCache: SyncCacheApi,
    secretStore: SecretStore
)(
    implicit
    ex: ExecutionContext,
    assets: AssetsFinder,
    system: ActorSystem,
    mat: Materializer
) extends InjectedController
    with I18nSupport
    with AuthResponseFormats
    with ErrorResponse
    with SecuredWebRequestHandler
    with OrgRequestsJsonFormat
    with ConnectionFormats
    with DBFormats {

  def validateJson[A: Reads] = parse.json.validate(
    _.validate[A].asEither.left.map(e => BadRequest(JsError.toJson(e)))
  )
  val mapper = new ObjectMapper()
  mapper
    .registerModule(DefaultScalaModule)
    .registerModule(new JavaTimeModule)
    .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)

  private def usingDBConnection(workspaceId: Long, connectionId: Long, path: String)(
      connHandler: (WorkspaceConnection, DatabaseServiceManager[_]) => Result): Future[Result] = {
    workspaceService
      .getConnection(workspaceId, connectionId)
      .map {
        case Left(e) => InternalServerError(Json.toJson(InternalServerErrorResponse(path, e.getMessage)))
        case Right(Some(v)) =>
          secretStore
            .decryptText(v.encProperties, workspaceId, workspaceKeyCache)
            .map { p =>
              Try(Json.parse(p).as[ServiceConnection]) match {
                case Failure(exception) => BadRequest(Json.toJson(BadConnection(exception.getMessage, v.name, v.provider)))
                case Success(conn) =>
                  val dbm = conn match {
                    case x: PgConnection => new DatabaseServiceManager[PgConnection](x, PostgresDBService)
                    case x: MySQLConnection => new DatabaseServiceManager[MySQLConnection](x, MySQLDatabaseService)
                    case x: MariaDBConnection => new DatabaseServiceManager[MariaDBConnection](x, MariaDBService)
                    case x: CassandraConnection => new DatabaseServiceManager[CassandraConnection](x, CassandraService)
                  }
                  connHandler(v, dbm)
              }
            }
            .getOrElse(BadRequest(
              Json.toJson(IllegalParam(path, 0, "Unable to decrypt the connection details due to missing encryption keys."))))
        case _ => BadRequest(Json.toJson(IllegalParam(path, 0, "Unable to get the connection details")))

      }
  }

  def summary(connectionId: Long) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceViewPermission(profile, roles, profile.orgId, profile.workspaceId)) {
        usingDBConnection(profile.workspaceId, connectionId, request.path) { (wc, dbm) =>
          dbm
            .getSummary(wc.name)
            .fold(
              err => BadRequest(Json.toJson(BadConnection(s"${err.getClass.getName}: ${err.getMessage}", wc.name, wc.provider))),
              res => Ok(Json.toJson(res))
            )
        }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def testDBConnection = silhouette.UserAwareAction.async(validateJson[WorkspaceConnection]) { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceManagePermission(profile, roles, profile.orgId, profile.workspaceId)) {
        val v = request.body
        secretStore
          .decryptText(v.encProperties, profile.workspaceId, workspaceKeyCache)
          .map(p => Json.parse(p).as[ServiceConnection])
          .map {
            case x: PgConnection => new DatabaseServiceManager[PgConnection](x, PostgresDBService)
            case x: MySQLConnection => new DatabaseServiceManager[MySQLConnection](x, MySQLDatabaseService)
            case x: MariaDBConnection => new DatabaseServiceManager[MariaDBConnection](x, MariaDBService)
            case x: CassandraConnection => new DatabaseServiceManager[CassandraConnection](x, CassandraService)
          }
          .map(dbm => dbm.getSummary(v.name)) match {
          case Some(value) => value.fold(
            err => Future(BadRequest(Json.toJson(BadConnection(s"${err.getClass.getName}: ${err.getMessage}", v.name, v.provider)))),
            res => Future(Ok(Json.toJson(res)))
          )
          case None => Future.successful(NotFound)
        }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def catalogs(connectionId: Long) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceViewPermission(profile, roles, profile.orgId, profile.workspaceId)) {
        usingDBConnection(profile.workspaceId, connectionId, request.path) { (_, dbm) =>
          dbm
            .getCatalogs()
            .fold(
              err => InternalServerError(Json.toJson(InternalServerErrorResponse(request.path, err.getMessage))),
              res => Ok(Json.toJson(res))
            )
        }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def schemas(connectionId: Long) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceViewPermission(profile, roles, profile.orgId, profile.workspaceId)) {
        usingDBConnection(profile.workspaceId, connectionId, request.path) { (_, dbm) =>
          dbm
            .getSchemas()
            .fold(
              err => InternalServerError(Json.toJson(InternalServerErrorResponse(request.path, err.getMessage))),
              res => Ok(Json.toJson(res))
            )
        }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def listTables(connectionId: Long, schema: String) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceViewPermission(profile, roles, profile.orgId, profile.workspaceId)) {
        usingDBConnection(profile.workspaceId, connectionId, request.path) { (_, dbm) =>
          dbm
            .listTables(schema)
            .fold(
              err => InternalServerError(Json.toJson(InternalServerErrorResponse(request.path, err.getMessage))),
              res => Ok(Json.toJson(res))
            )
        }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def listTablesMetadata(connectionId: Long, schema: String) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceViewPermission(profile, roles, profile.orgId, profile.workspaceId)) {
        usingDBConnection(profile.workspaceId, connectionId, request.path) { (_, dbm) =>
          dbm
            .listTablesDetail(schema)
            .fold(
              err => InternalServerError(Json.toJson(InternalServerErrorResponse(request.path, err.getMessage))),
              res => Ok(Json.toJson(res))
            )
        }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def executeQuery(connectionId: Long) = silhouette.UserAwareAction.async(validateJson[RequestQueryExecution]) { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceViewPermission(profile, roles, profile.orgId, profile.workspaceId)) {
        usingDBConnection(profile.workspaceId, connectionId, request.path) { (_, dbm) =>
          dbm
            .executeQuery(request.body.q)
            .fold(
              err => BadRequest(Json.toJson(InternalServerErrorResponse(request.path, err.getMessage))),
              res => {
                val str = mapper.writeValueAsString(res)
                Ok(Json.parse(str))

              }
            )
        }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def getTableData(connectionId: Long, schema: String, table: String) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceViewPermission(profile, roles, profile.orgId, profile.workspaceId)) {
        usingDBConnection(profile.workspaceId, connectionId, request.path) { (_, dbm) =>
          dbm
            .getTableData(schema, table)
            .fold(
              err => InternalServerError(Json.toJson(InternalServerErrorResponse(request.path, err.getMessage))),
              res => {

                val str = mapper.writeValueAsString(res)
                Ok(Json.parse(str))

              }
            )
        }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def describeTable(connectionId: Long, schema: String, table: String) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceViewPermission(profile, roles, profile.orgId, profile.workspaceId)) {
        usingDBConnection(profile.workspaceId, connectionId, request.path) { (_, dbm) =>
          dbm
            .describeTable(schema, table)
            .fold(
              err => InternalServerError(Json.toJson(InternalServerErrorResponse(request.path, err.getMessage))),
              res => {

                val str = mapper.writeValueAsString(res)
                Ok(Json.parse(str))

              }
            )
        }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def listQueries(connectionId: Long) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceViewPermission(profile, roles, profile.orgId, profile.workspaceId)) {
        workspaceService
          .listQueries(connectionId)
          .map {
            case Left(err)      => InternalServerError(Json.toJson(InternalServerErrorResponse(request.path, err.getMessage)))
            case Right(queries) => Ok(Json.toJson(queries))
          }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def getQuery(connectionId: Long, queryId: Long) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceViewPermission(profile, roles, profile.orgId, profile.workspaceId)) {
        workspaceService
          .getQuery(connectionId, queryId)
          .map {
            case Left(err) => BadRequest(Json.toJson(InternalServerErrorResponse(request.path, err.getMessage)))
            case Right(qview) =>
              qview match {
                case Some(value) => Ok(Json.toJson(value))
                case None        => NotFound(Json.toJson(EntityNotFound(name = "queryId", path = request.path)))
              }
          }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def addQuery(connectionId: Long) = silhouette.UserAwareAction.async(validateJson[NewQuery]) { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceViewPermission(profile, roles, profile.orgId, profile.workspaceId)) {
        workspaceService
          .addDBQuery(connectionId, request.body.name, request.body.text)
          .map {
            case Left(err)  => InternalServerError(Json.toJson(InternalServerErrorResponse(request.path, err.getMessage)))
            case Right(qId) => Created(Json.toJson(Map("queryId" -> qId)))
          }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def deleteQuery(connectionId: Long, queryId: Long) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceViewPermission(profile, roles, profile.orgId, profile.workspaceId)) {
        workspaceService
          .deleteDBQuery(connectionId, queryId)
          .map {
            case Left(err)  => InternalServerError(Json.toJson(InternalServerErrorResponse(request.path, err.getMessage)))
            case Right(hasDeleted) => Ok(Json.toJson(Map("success" -> hasDeleted)))
          }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def listSchemaObjects(connectionId: Long, schema: String) =   silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceViewPermission(profile, roles, profile.orgId, profile.workspaceId)) {
        usingDBConnection(profile.workspaceId, connectionId, request.path) { (_, dbm) =>
          dbm
            .listSchemaObjects(schema)
            .fold(
              err => InternalServerError(Json.toJson(InternalServerErrorResponse(request.path, err.getMessage))),
              res => {

                val str = mapper.writeValueAsString(res)
                Ok(Json.parse(str))

              }
            )
        }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def updateQuery(connectionId: Long, queryId: Long) = silhouette.UserAwareAction.async(validateJson[NewQuery]) { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceViewPermission(profile, roles, profile.orgId, profile.workspaceId)) {
        workspaceService
          .updateDBQuery(connectionId, queryId, request.body.name, request.body.text)
          .map {
            case Left(err)         => BadRequest(Json.toJson(InternalServerErrorResponse(request.path, err.getMessage)))
            case Right(hasUpdated) => Ok(Json.toJson(Map("success" -> hasUpdated)))
          }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

}
