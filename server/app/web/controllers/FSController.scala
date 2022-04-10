package web.controllers

import java.io.File
import java.nio.file.Paths

import akka.actor.ActorSystem
import akka.stream.Materializer
import com.heapland.aws.S3DataService
import com.heapland.services.MySQLConnection
import com.heapland.services.{AWSS3Connection, ServiceConnection}
import com.heapland.services.fs.FailedFileListing
import com.mohiva.play.silhouette.api.{HandlerResult, Silhouette}
import controllers.AssetsFinder
import javax.inject.Inject
import play.api.Configuration
import web.models.{ErrorResponse, IllegalParam, InternalServerErrorResponse}
import web.models.formats.{AuthResponseFormats, ConnectionFormats}
import web.services.{ClusterService, DatabaseServiceManager, FileServiceManager, MemberService, SecretStore, WorkspaceService}
import play.api.cache.SyncCacheApi
import play.api.i18n.I18nSupport
import play.api.libs.json.{JsError, Json, Reads}
import play.api.mvc.{ControllerComponents, InjectedController, Result}
import play.cache.NamedCache
import utils.auth.{DefaultEnv, RandomGenerator}
import web.controllers.handlers.SecuredWebRequestHandler
import web.models.requests.WorkspaceConnection

import scala.concurrent.{ExecutionContext, Future, blocking}
import scala.util.Failure

class FSController @Inject()(
                              components: ControllerComponents,
                              silhouette: Silhouette[DefaultEnv],
                              memberService: MemberService,
                              workspaceService: WorkspaceService,
                              @NamedCache("workspace-keypairs") workspaceKeyCache: SyncCacheApi,
                              secretStore: SecretStore,
                              configuration: Configuration,
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
    with ConnectionFormats {

  def validateJson[A: Reads] = parse.json.validate(
    _.validate[A].asEither.left.map(e => BadRequest(JsError.toJson(e)))
  )

  private def usingFileConnection(workspaceId: Long, connectionId: Long, path: String)(connHandler: (FileServiceManager[_], WorkspaceConnection) => Result): Future[Result] = {
    workspaceService
      .getConnection(workspaceId, connectionId)
      .map {
        case Left(e) => InternalServerError(Json.toJson(InternalServerErrorResponse(path, e.getMessage)))
        case Right(Some(v)) => secretStore
          .decryptText(v.encProperties, workspaceId, workspaceKeyCache)
          .map(p => Json.parse(p).as[ServiceConnection])
          .map {
            case x: AWSS3Connection => new FileServiceManager[AWSS3Connection](x, S3DataService)
          }.map(dbm => connHandler(dbm,v))
          .getOrElse(BadRequest(Json.toJson(IllegalParam(path, 0, "Unable to decrypt the connection details due to missing encryption keys."))))
        case _ => BadRequest(Json.toJson(IllegalParam(path, 0, "Unable to get the connection details")))

      }
  }

  def listRootLevelFiles(connectionId: Long) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceManagePermission(profile, roles, profile.orgId, profile.workspaceId)) {
        usingFileConnection(profile.workspaceId, connectionId, request.path){ (fm, conn) =>
          fm.listFiles(None, None, conn.name, conn.provider)
          .fold(
            err => {
              BadRequest(Json.toJson(FailedFileListing(conn.name, conn.provider, err.getMessage)))
            },
            result => Ok(Json.toJson(result))
          )
        }

      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def getFileSummary(connectionId: Long, path: String) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceManagePermission(profile, roles, profile.orgId, profile.workspaceId)) {
        usingFileConnection(profile.workspaceId, connectionId, request.path){ (fm, conn) =>
          fm.getFileSummary(path)
            .fold(
              err => {
                BadRequest(Json.toJson(FailedFileListing(conn.name, conn.provider, err.getMessage)))
              },
              result => Ok(Json.toJson(result))
            )
        }

      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def listFiles(connectionId: Long, path: String) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceManagePermission(profile, roles, profile.orgId, profile.workspaceId)) {
        workspaceService
          .getConnection(profile.workspaceId, connectionId)
          .map {
            case Left(e) => InternalServerError(Json.toJson(InternalServerErrorResponse(request.path, e.getMessage)))
            case Right(Some(v)) =>
              secretStore
                .decryptText(v.encProperties, profile.workspaceId, workspaceKeyCache)
                .map(p => Json.parse(p).as[ServiceConnection])
                .map {
                  case x: AWSS3Connection => new FileServiceManager[AWSS3Connection](x, S3DataService)
                }
                .map(service => service.listFiles(Some(path), None, v.name, v.provider))
                .getOrElse(Failure(new RuntimeException("Failed extracting the config")))
                .fold(
                  err => {
                    BadRequest(Json.toJson(InternalServerErrorResponse(request.path, err.getMessage)))
                  },
                  result => Ok(Json.toJson(result))
                )
            case _ => BadRequest(Json.toJson(InternalServerErrorResponse(request.path, "Invalid connection configuration provided")))
          }

      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def newDirectory(connectionId: Long, path: String) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceManagePermission(profile, roles, profile.orgId, profile.workspaceId)) {
        workspaceService
          .getConnection(profile.workspaceId, connectionId)
          .map {
            case Left(e) => InternalServerError(Json.toJson(InternalServerErrorResponse(request.path, e.getMessage)))
            case Right(Some(v)) =>
              secretStore
                .decryptText(v.encProperties, profile.workspaceId, workspaceKeyCache)
                .map(p => Json.parse(p).as[ServiceConnection])
                .map {
                  case x: AWSS3Connection => new FileServiceManager[AWSS3Connection](x, S3DataService)
                }
                .map(service => service.createDirectory(path))
                .getOrElse(Failure(new RuntimeException("Failed extracting the config")))
                .fold(
                  err => {

                    BadRequest(Json.toJson(InternalServerErrorResponse(request.path, err.getMessage)))
                  },
                  result => Ok(Json.toJson(Map("success" -> result)))
                )
            case _ => BadRequest(Json.toJson(InternalServerErrorResponse(request.path, "Invalid connection configuration provided")))
          }

      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def deleteFile(connectionId: Long, path: String) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceManagePermission(profile, roles, profile.orgId, profile.workspaceId)) {
        workspaceService
          .getConnection(profile.workspaceId, connectionId)
          .map {
            case Left(e) => InternalServerError(Json.toJson(InternalServerErrorResponse(request.path, e.getMessage)))
            case Right(Some(v)) =>
              secretStore
                .decryptText(v.encProperties, profile.workspaceId, workspaceKeyCache)
                .map(p => Json.parse(p).as[ServiceConnection])
                .map {
                  case x: AWSS3Connection => new FileServiceManager[AWSS3Connection](x, S3DataService)
                }
                .map(service => service.deleteFile(path))
                .getOrElse(Failure(new RuntimeException("Failed extracting the config")))
                .fold(
                  err => {

                    BadRequest(Json.toJson(InternalServerErrorResponse(request.path, err.getMessage)))
                  },
                  result => Ok(Json.toJson(Map("success" -> result)))
                )
            case _ => BadRequest(Json.toJson(InternalServerErrorResponse(request.path, "Invalid connection configuration provided")))
          }

      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def upload(connectionId: Long, path: String) = silhouette.UserAwareAction.async(parse.multipartFormData) { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceViewPermission(profile, roles, profile.orgId, profile.workspaceId)) {
        workspaceService
          .getConnection(profile.workspaceId, connectionId)
          .map {
            case Left(e) => InternalServerError(Json.toJson(InternalServerErrorResponse(request.path, e.getMessage)))
            case Right(Some(v)) =>

              request.body
                .file("file")
                .flatMap { f =>
                  val rootpath = configuration.get[String]("heapland.tmp")
                  val filename    = Paths.get(f.filename).getFileName
                  val tmpFilePath = s"${rootpath}/${filename}"
                  val tmpFile = new File(tmpFilePath)
                  f.ref.moveTo(tmpFile, replace = true)
                  secretStore
                    .decryptText(v.encProperties, profile.workspaceId, workspaceKeyCache)
                    .map(p => Json.parse(p).as[ServiceConnection])
                    .map {
                      case x: AWSS3Connection => new FileServiceManager[AWSS3Connection](x, S3DataService)
                    }
                    .map(service => service.uploadFile(path, tmpFile))
                }
                .getOrElse(Failure(new RuntimeException("Failed extracting the config")))
                .fold(
                  err => {

                    BadRequest(Json.toJson(InternalServerErrorResponse(request.path, err.getMessage)))
                  },
                  result => {

                    Ok(Json.toJson(Map("success" -> result)))
                  }
                )
            case _ => BadRequest(Json.toJson(InternalServerErrorResponse(request.path, "Invalid connection configuration provided")))
          }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

}
