package utils.auth

import web.models.Member
import com.mohiva.play.silhouette.api.{Authenticator, Authorization}
import play.api.mvc.Request

import scala.concurrent.Future

/**
 * Grants only access if a user has authenticated with the given provider.
 *
 * @param provider The provider ID the user must authenticated with.
 * @tparam A The type of the authenticator.
 */
case class WithProvider[A <: Authenticator](provider: String) extends Authorization[Member, A] {

  /**
   * Indicates if a user is authorized to access an action.
   *
   * @param user The usr object.
   * @param authenticator The authenticator instance.
   * @param request The current request.
   * @tparam B The type of the request body.
   * @return True if the user is authorized, false otherwise.
   */
  override def isAuthorized[B](user: Member, authenticator: A)(
    implicit
    request: Request[B]): Future[Boolean] = {

    Future.successful(user.loginInfo.providerID == provider)
  }
}
