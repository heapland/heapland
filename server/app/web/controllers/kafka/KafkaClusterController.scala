package web.controllers.kafka

import akka.actor.{ActorRef, ActorSystem}
import akka.stream.Materializer
import com.mohiva.play.silhouette.api.Silhouette
import controllers.AssetsFinder
import javax.inject.{Inject, Named}
import web.models.{BadConnection, ErrorResponse, IllegalParam, InternalServerErrorResponse}
import web.models.cluster.{FilterTopicMessage, KafkaClusterJsonFormatter, KafkaConfigurationRequest, KafkaNode, KafkaProcesses, TopicConfig}
import web.services.{ClusterService, DatabaseServiceManager, MemberService, SecretStore, WorkspaceService}
import play.api.cache.SyncCacheApi

import scala.jdk.FutureConverters._
import scala.jdk.CollectionConverters._
import play.api.i18n.I18nSupport
import play.api.libs.json.{JsError, Json, Reads}
import play.api.libs.ws.WSClient
import play.api.mvc.{Action, AnyContent, AnyContentAsEmpty, InjectedController, Request, Result, WebSocket}
import play.cache.NamedCache
import utils.auth.DefaultEnv

import concurrent.duration._
import akka.stream.scaladsl.Source
import com.heapland.cassandra.CassandraService
import com.heapland.commons.models.RunStatus
import com.heapland.kafka.KafkaService
import com.heapland.mariadb.MariaDBService
import com.heapland.mysql.MySQLDatabaseService
import com.heapland.postgres.PostgresDBService
import com.heapland.services.{CassandraConnection, KafkaConnection, MariaDBConnection, MySQLConnection, PgConnection, ServiceConnection}
import web.models
import org.apache.kafka.clients.admin.{Admin, NewTopic}
import web.controllers.handlers.SecuredWebRequestHandler
import web.models.formats.ConnectionFormats
import web.models.requests.WorkspaceConnection

import scala.concurrent.{ExecutionContext, Future}
import scala.util.{Failure, Success, Try}

class KafkaClusterController @Inject()(@Named("spark-cluster-manager") clusterManager: ActorRef,
                                       @NamedCache("workspace-keypairs") workspaceKeyCache: SyncCacheApi,
                                       @NamedCache("session-cache") userCache: SyncCacheApi,
                                       silhouette: Silhouette[DefaultEnv],
                                       memberService: MemberService,
                                       clusterService: ClusterService,
                                       workspaceService: WorkspaceService,
                                       secretStore: SecretStore,
                                       ws: WSClient)(
    implicit
    ex: ExecutionContext,
    assets: AssetsFinder,
    system: ActorSystem,
    mat: Materializer
) extends InjectedController
    with I18nSupport
    with SecuredWebRequestHandler
    with ErrorResponse
    with KafkaClusterJsonFormatter
    with KafkaClientHandler
    with ConnectionFormats {

  private def validateJson[A: Reads] = parse.json.validate(
    _.validate[A].asEither.left.map(e => BadRequest(JsError.toJson(e)))
  )

  private def usingKafkaConnection(workspaceId: Long, connectionId: Long, path: String)(
      connHandler: (WorkspaceConnection, Admin) => Future[Result]): Future[Result] = {
    workspaceService
      .getConnection(workspaceId, connectionId)
      .flatMap {
        case Left(e) => Future(InternalServerError(Json.toJson(InternalServerErrorResponse(path, e.getMessage))))
        case Right(Some(v)) =>

          secretStore
            .decryptText(v.encProperties, workspaceId, workspaceKeyCache)
            .map{ p =>
              Try(Json.parse(p).as[ServiceConnection]) match {
                case Failure(exception) => Future(BadRequest(Json.toJson(BadConnection(exception.getMessage, v.name,v.provider))))
                case Success(x) => x match {
                  case x: KafkaConnection =>
                    KafkaService
                      .getAdmin(x.bootstrapServers, x.additionalProperties)
                      .map(admin => connHandler(v, admin))
                      .fold(
                        th => Future(BadRequest(Json.toJson(BadConnection(th.getMessage, v.name,v.provider)))),
                        r => r
                      )
                }
              }
            }
            .getOrElse(Future(
              BadRequest(Json.toJson(IllegalParam(path, 0, "Unable to decrypt the connection details due to missing encryption keys.")))))
        case _ => Future(BadRequest(Json.toJson(IllegalParam(path, 0, "Unable to get the connection details"))))
      }
  }

  def saveLocalKafkaClusterConfig: Action[KafkaConfigurationRequest] =
    silhouette.UserAwareAction.async(validateJson[KafkaConfigurationRequest]) { implicit request =>
      handleMemberRequest(request, memberService) { (roles, profile) =>
        if (hasWorkspaceManagePermission(profile, roles, profile.orgId, profile.workspaceId)) {
          clusterService
            .saveLocalKafkaConfiguration(request.body, profile.workspaceId, workspaceKeyCache)
            .map(result => {
              if (result > 0) {
                Created(Json.toJson(Map("clusterId" -> result)))
              } else {
                BadRequest(Json.toJson(
                  Map("error" -> "There is already an existing Kafka service installed on this host. Delete it before proceeding.")))
              }
            })
            .recoverWith {
              case e: Exception =>
                Future.successful(InternalServerError(Json.toJson(InternalServerErrorResponse(request.path, e.getMessage))))
            }
        } else {
          Future.successful(Forbidden)
        }
      }
    }

  def fetchKafkaCluster(clusterId: Long): Action[AnyContent] = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceViewPermission(profile, roles, profile.orgId, profile.workspaceId)) {
        clusterService
          .getKafkaCluster(clusterId, profile.workspaceId)
          .map {
            case None    => NotFound
            case Some(v) => Ok(Json.toJson(v))
          }
          .recoverWith {
            case e: Exception =>
              Future.successful(InternalServerError(Json.toJson(InternalServerErrorResponse(request.path, e.getMessage))))
          }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def streamKafkaClusterState(clusterId: Long) =
    WebSocket.acceptOrResult[String, String] { implicit request =>
      implicit val req = Request(request, AnyContentAsEmpty)
      handleSparkClusterWebsocketRequest(silhouette, memberService, userCache, request) { (orgId, workspaceId) =>
        Source
          .tick(2.seconds, 2.seconds, "tick")
          .mapAsync(1)(_ => clusterService.getKafkaCluster(clusterId, workspaceId))
          .map {
            case None        => Json.toJson(models.IllegalParam(request.path, 0, "Not found")).toString()
            case Some(value) => Json.toJson(value).toString()
          }

      }
    }

  def describeCluster(connectionId: Long) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceManagePermission(profile, roles, profile.orgId, profile.workspaceId)) {
        usingKafkaConnection(profile.workspaceId, connectionId, request.path) { (wc, admin) =>
          val result = admin
            .describeCluster()
            .clusterId()
            .toCompletableFuture
            .asScala
            .map { id =>
              Ok(Json.toJson(Map("clusterId" -> id, "name" -> wc.name, "provider" -> wc.provider )))
            }
          result.onComplete(_ => admin.close())
          result
        }.recover {
          case e: BadConnection => BadRequest(Json.toJson(e))
        }

      } else {
        Future.successful(Forbidden)
      }
    }
  }

  /**
    * List all the brokers in the given kafka cluster
    * @param connectionId
    * @return
    */
  def listBrokers(connectionId: Long) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceManagePermission(profile, roles, profile.orgId, profile.workspaceId)) {
        usingKafkaConnection(profile.workspaceId, connectionId, request.path) { (_, admin) =>
          val result = admin
            .describeCluster()
            .nodes()
            .toCompletableFuture
            .asScala
            .map { nodes =>
              Ok(Json.toJson(nodes.asScala.map(n => KafkaNode(n.idString(), n.host(), n.port(), n.rack()))))
            }
          result.onComplete(_ => admin.close())
          result
        }

      } else {
        Future.successful(Forbidden)
      }
    }
  }

  /**
    * List the consumer group and the respective members
    * @param connectionId
    * @return
    */
  def listConsumerGroups(connectionId: Long) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceManagePermission(profile, roles, profile.orgId, profile.workspaceId)) {
        usingKafkaConnection(profile.workspaceId, connectionId, request.path) { (_, admin) =>
          val futureConsumerGroups = getConsumerGroups(admin)
          val result               = futureConsumerGroups.map(cg => Ok(Json.toJson(cg)))
          result.onComplete(_ => admin.close())
          result
        }.recoverWith {
          case e: Exception =>
            Future.successful(InternalServerError(Json.toJson(InternalServerErrorResponse(request.path, e.getMessage))))
        }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def listTopicPartitions(connectionId: Long, topic: String) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceManagePermission(profile, roles, profile.orgId, profile.workspaceId)) {
        usingKafkaConnection(profile.workspaceId, connectionId, request.path) { (_, admin) =>
          val result = KafkaService.getTopicPartitions(admin, topic).map(tps => Ok(Json.toJson(tps)))
          result.onComplete(_ => admin.close())
          result
        }

      } else {
        Future.successful(Forbidden)
      }
    }
  }

  def listTopicMessages(connectionId: Long, topic: String) = silhouette.UserAwareAction.async(validateJson[FilterTopicMessage]) {
    implicit request =>
      handleMemberRequest(request, memberService) { (roles, profile) =>
        if (hasWorkspaceManagePermission(profile, roles, profile.orgId, profile.workspaceId)) {
          usingKafkaConnection(profile.workspaceId, connectionId, request.path) { (_, admin) =>
            val result = KafkaService
              .getTopicMessages(admin, topic, request.body.maxResults, request.body.startingFrom)
              .map(messages =>
                Ok(Json.toJson(messages)))
            result.onComplete(_ => admin.close())
            result
          }
        } else {
          Future.successful(Forbidden)
        }
      }
  }

  /**
    * List all the topics in the given kafka cluster
    * @param connectionId
    * @return
    */
  def listTopics(connectionId: Long) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceManagePermission(profile, roles, profile.orgId, profile.workspaceId)) {
        usingKafkaConnection(profile.workspaceId, connectionId, request.path) { (_, admin) =>
          val result = KafkaService.getTopicSummary(admin).map(tds => Ok(Json.toJson(tds)))
          result.onComplete(_ => admin.close())
          result
        }

      } else {
        Future.successful(Forbidden)
      }
    }
  }

  /**
    * List all the topics in the given kafka cluster
    * @param connectionId
    * @return
    */
  def listTopicConfigurations(connectionId: Long, topic: String) = silhouette.UserAwareAction.async { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceManagePermission(profile, roles, profile.orgId, profile.workspaceId)) {

        usingKafkaConnection(profile.workspaceId, connectionId, request.path) { (_, admin) =>
          val result = KafkaService.getTopicConfig(admin, topic).map(tds => Ok(Json.toJson(tds)))
          result.onComplete(_ => admin.close())
          result
        }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

  /**
    * List all the topics in the given kafka cluster
    * @param clusterId
    * @return
    */
  def createTopic(clusterId: Long) = silhouette.UserAwareAction.async(validateJson[TopicConfig]) { implicit request =>
    handleMemberRequest(request, memberService) { (roles, profile) =>
      if (hasWorkspaceManagePermission(profile, roles, profile.orgId, profile.workspaceId)) {
        clusterService
          .getKafkaCluster(clusterId, profile.workspaceId)
          .flatMap(info =>
            info match {
              case None => Future(NotFound)
              case Some(v) =>
                v.processes.find(_.name.equals(KafkaProcesses.KAFKA_SERVER)) match {

                  case Some(p) if p.status == RunStatus.Running =>
                    withAdmin(p.host, p.port) { admin =>
                      val topic = new NewTopic(request.body.name, request.body.partitions, request.body.replicationFactor)
                      val result = admin
                        .createTopics(Seq(topic).asJava)
                        .topicId(request.body.name)
                        .toCompletableFuture
                        .asScala
                        .map(uuid => Created(Json.toJson(Map("uuid" -> uuid.toString))))
                      result.onComplete(_ => admin.close())
                      result
                    }
                  case _ => Future(NotFound)
                }
          })
          .recoverWith {
            case e: Exception =>
              Future.successful(InternalServerError(Json.toJson(InternalServerErrorResponse(request.path, e.getMessage))))
          }
      } else {
        Future.successful(Forbidden)
      }
    }
  }

}
