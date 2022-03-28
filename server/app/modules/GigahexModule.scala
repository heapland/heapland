package modules

import java.util.concurrent.Executors

import web.models.CredentialInfo
import web.providers.EmailCredentialsProvider
import web.repo.{ ClusterRepo, ClusterRepoImpl, CredentialsRepository, LoginInfoRepo, MemberRepository, WorkspaceRepo}
import web.services.{AppInitializer, AuthTokenService, AuthTokenServiceImpl, ClusterService, ClusterServiceImpl, DefaultKeyPairGenerator,
  MemberService, MemberServiceImpl, OrgService, OrgServiceImpl, SecretStore, WorkspaceService, WorkspaceServiceImpl}
import com.google.inject.name.Named
import com.google.inject.{AbstractModule, Provides}
import com.goterl.lazycode.lazysodium.SodiumJava
import com.mohiva.play.silhouette.api.actions.{SecuredErrorHandler, UnsecuredErrorHandler}
import com.mohiva.play.silhouette.api.crypto._
import com.mohiva.play.silhouette.api.repositories.AuthInfoRepository
import com.mohiva.play.silhouette.api.services._
import com.mohiva.play.silhouette.api.util._
import com.mohiva.play.silhouette.api.{Environment, EventBus, Silhouette, SilhouetteProvider}
import com.mohiva.play.silhouette.crypto.{JcaCrypter, JcaCrypterSettings, JcaSigner, JcaSignerSettings}
import com.mohiva.play.silhouette.impl.authenticators._
import com.mohiva.play.silhouette.impl.providers._
import com.mohiva.play.silhouette.impl.providers.oauth1.secrets.{CookieSecretProvider, CookieSecretSettings}
import com.mohiva.play.silhouette.impl.providers.state.{CsrfStateItemHandler, CsrfStateSettings}
import com.mohiva.play.silhouette.impl.services._
import com.mohiva.play.silhouette.impl.util._
import com.mohiva.play.silhouette.password.{BCryptPasswordHasher, BCryptSha256PasswordHasher}
import com.mohiva.play.silhouette.persistence.daos.DelegableAuthInfoDAO
import com.mohiva.play.silhouette.persistence.repositories.DelegableAuthInfoRepository
import com.typesafe.config.Config
import web.actors.clusters.{ClusterManager, ClusterStatusChecker}
import web.actors.{ SystemInitializer}
import web.auth.GithubOAuthProvider
import web.controllers.read.{DefaultRememberMeConfig, DefaultSilhouetteControllerComponents, RememberMeConfig, SilhouetteControllerComponents}
import web.repo.pg.{OAuth2InfoDAO, PgHDFSClusterRepo, PgKafkaClusterRepo, PgLoginInfoRepo, PgMemberRepoImpl, PgSparkClusterRepo, PgWorkspaceRepoImpl}
import web.utils.ApplicationHooks
import net.ceedubs.ficus.Ficus._
import net.ceedubs.ficus.readers.ArbitraryTypeReader._
import net.ceedubs.ficus.readers.ValueReader
import net.codingwell.scalaguice.ScalaModule
import play.api.Configuration
import play.api.libs.openid.OpenIdClient
import play.api.libs.ws.WSClient
import play.api.mvc.{Cookie, CookieHeaderEncoding}
import utils.auth.{APIJwtEnv, CustomSecuredErrorHandler, CustomUnsecuredErrorHandler, DefaultEnv, WorkspaceAPIJwtEnv}
import net.ceedubs.ficus.readers.EnumerationReader._
import javax.inject.Singleton
import web.repo.clusters.{HDFSClusterRepo, KafkaClusterRepo, SparkClusterRepo}
import play.api.libs.concurrent.AkkaGuiceSupport

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.ExecutionContext
import scala.concurrent.duration.FiniteDuration

/**
  * The Guice module which wires all Silhouette dependencies.
  */
class GigahexModule extends AbstractModule with ScalaModule with AkkaGuiceSupport {

  private lazy val blockingEC = ExecutionContext.fromExecutor(Executors.newCachedThreadPool())

  /**
    * A very nested optional reader, to support these cases:
    * Not set, set None, will use default ('Lax')
    * Set to null, set Some(None), will use 'No Restriction'
    * Set to a string value try to match, Some(Option(string))
    */
  implicit val sameSiteReader: ValueReader[Option[Option[Cookie.SameSite]]] =
    (config: Config, path: String) => {
      if (config.hasPathOrNull(path)) {
        if (config.getIsNull(path))
          Some(None)
        else {
          Some(Cookie.SameSite.parse(config.getString(path)))
        }
      } else {
        None
      }
    }

  /**
    * Configures the module.
    */
  override def configure() {
    bind(classOf[ApplicationHooks]).asEagerSingleton()
    bind[Silhouette[DefaultEnv]].to[SilhouetteProvider[DefaultEnv]]
    bind[Silhouette[APIJwtEnv]].to[SilhouetteProvider[APIJwtEnv]]
    bind[Silhouette[WorkspaceAPIJwtEnv]].to[SilhouetteProvider[WorkspaceAPIJwtEnv]]
    bind[UnsecuredErrorHandler].to[CustomUnsecuredErrorHandler]
    bind[SecuredErrorHandler].to[CustomSecuredErrorHandler]
    bind[CacheLayer].to[PlayCacheLayer]
    bind[IDGenerator].toInstance(new SecureRandomIDGenerator())
    bind[FingerprintGenerator].toInstance(new DefaultFingerprintGenerator(false))
    bind[EventBus].toInstance(EventBus())
    bind[Clock].toInstance(Clock())
    bind[MemberService].to[MemberServiceImpl]
    bind[OrgService].to[OrgServiceImpl]
    bind[WorkspaceService].to[WorkspaceServiceImpl]
    bind[DelegableAuthInfoDAO[CredentialInfo]].toInstance(new CredentialsRepository)
    bind[DelegableAuthInfoDAO[OAuth2Info]].toInstance(new OAuth2InfoDAO)
    bind[ClusterService].to[ClusterServiceImpl]
    bind[AuthTokenService].to[AuthTokenServiceImpl]
    bind[SparkClusterRepo].to[PgSparkClusterRepo]
    bind[KafkaClusterRepo].to[PgKafkaClusterRepo]
    bind[HDFSClusterRepo].to[PgHDFSClusterRepo]
    bindActor[ClusterManager](name = "spark-cluster-manager")
    bindActor[SystemInitializer](name = "system-init")
    bind[AppInitializer].asEagerSingleton()

  }


  @Provides
  def provideMemberRepository: MemberRepository = {
    new PgMemberRepoImpl(blockingEC, new DefaultKeyPairGenerator)
  }

  @Provides
  @Singleton
  def provideSecretStore(configuration: Configuration): SecretStore = {
    val playEnv = play.Environment.simple()
    val rootPath = playEnv.rootPath().getAbsolutePath
    val appRoot = rootPath.substring(0, rootPath.lastIndexOf('.'))
    val libPath = configuration.underlying.as[String]("play.assets.libsodium")
    val sodium = new SodiumJava(appRoot + libPath)
    new SecretStore(sodium)
  }

  @Provides
  def provideLoginInfoRepo: LoginInfoRepo = {
    new PgLoginInfoRepo()
  }

  @Provides
  def provideClusterRepo: ClusterRepo = {
    new ClusterRepoImpl(blockingEC)
  }

  @Provides
  def provideWorkspaceRepo: WorkspaceRepo = {
    new PgWorkspaceRepoImpl(blockingEC)
  }

  /**
    * Provides the HTTP layer implementation.
    *
    * @param client Play's WS client.
    * @return The HTTP layer implementation.
    */
  @Provides
  def provideHTTPLayer(client: WSClient): HTTPLayer = new PlayHTTPLayer(client)

  /**
    * Provides the Silhouette environment.
    *
    * @param memberService        The user service implementation.
    * @param authenticatorService The authentication service implementation.
    * @param eventBus             The event bus instance.
    * @return The Silhouette environment.
    */
  @Provides
  def provideEnvironment(memberService: MemberService,
                         authenticatorService: AuthenticatorService[CookieAuthenticator],
                         eventBus: EventBus): Environment[DefaultEnv] = {

    Environment[DefaultEnv](
      memberService,
      authenticatorService,
      Seq(),
      eventBus
    )
  }

  @Provides
  def provideApiAuthEnvironment(orgService: OrgService,
                                authenticatorService: AuthenticatorService[JWTAuthenticator],
                                eventBus: EventBus): Environment[APIJwtEnv] = {

    Environment[APIJwtEnv](
      orgService,
      authenticatorService,
      Seq(),
      eventBus
    )
  }

  @Provides
  def provideWorkspaceApiAuthEnvironment(workspaceService: WorkspaceService,
                                         authenticatorService: AuthenticatorService[JWTAuthenticator],
                                         eventBus: EventBus): Environment[WorkspaceAPIJwtEnv] = {

    Environment[WorkspaceAPIJwtEnv](
      workspaceService,
      authenticatorService,
      Seq(),
      eventBus
    )
  }

  /**
    * Provides the social provider registry.
    *
    * @return The Silhouette environment.
    */
  @Provides
  def provideSocialProviderRegistry(): SocialProviderRegistry = {

    SocialProviderRegistry(
      Seq(
      ))
  }

  /**
    * Provides the signer for the OAuth1 token secret provider.
    *
    * @param configuration The Play configuration.
    * @return The signer for the OAuth1 token secret provider.
    */
  @Provides @Named("oauth1-token-secret-signer")
  def provideOAuth1TokenSecretSigner(configuration: Configuration): Signer = {
    val config = configuration.underlying.as[JcaSignerSettings]("silhouette.oauth1TokenSecretProvider.signer")

    new JcaSigner(config)
  }


  /**
    * Provides the signer for the CSRF state item handler.
    *
    * @param configuration The Play configuration.
    * @return The signer for the CSRF state item handler.
    */
  @Provides
  @Named("csrf-state-item-signer")
  def provideCSRFStateItemSigner(configuration: Configuration): Signer = {
    val config = configuration.underlying.as[JcaSignerSettings]("silhouette.csrfStateItemHandler.signer")

    new JcaSigner(config)
  }

  /**
    * Provides the signer for the social state handler.
    *
    * @param configuration The Play configuration.
    * @return The signer for the social state handler.
    */
  @Provides
  @Named("social-state-signer")
  def provideSocialStateSigner(configuration: Configuration): Signer = {
    val config = configuration.underlying.as[JcaSignerSettings]("silhouette.socialStateHandler.signer")

    new JcaSigner(config)
  }

  /**
    * Provides the signer for the authenticator.
    *
    * @param configuration The Play configuration.
    * @return The signer for the authenticator.
    */
  @Provides
  @Named("authenticator-signer")
  def provideAuthenticatorSigner(configuration: Configuration): Signer = {
    val config = configuration.underlying.as[JcaSignerSettings]("silhouette.authenticator.signer")

    new JcaSigner(config)
  }

  /**
    * Provides the crypter for the authenticator.
    *
    * @param configuration The Play configuration.
    * @return The crypter for the authenticator.
    */
  @Provides
  @Named("authenticator-crypter")
  def provideAuthenticatorCrypter(configuration: Configuration): Crypter = {
    val config = configuration.underlying.as[JcaCrypterSettings]("silhouette.authenticator.crypter")

    new JcaCrypter(config)
  }

  @Provides
  def providesSilhouetteComponents(components: DefaultSilhouetteControllerComponents): SilhouetteControllerComponents = {
    components
  }

  /**
    * Provides the auth info repository.
    *
    * @param credsDAO The implementation of the delegable password auth info DAO.
    * @return The auth info repository instance.
    */
  @Provides
  def provideAuthInfoRepository(credsDAO: DelegableAuthInfoDAO[CredentialInfo],
                                oauth2InfoDAO: DelegableAuthInfoDAO[OAuth2Info]): AuthInfoRepository = {
    new DelegableAuthInfoRepository(credsDAO, oauth2InfoDAO)
  }

  /**
    * Provides the authenticator service.
    *
    * @param signer               The signer implementation.
    * @param crypter              The crypter implementation.
    * @param cookieHeaderEncoding Logic for encoding and decoding `Cookie` and `Set-Cookie` headers.
    * @param fingerprintGenerator The fingerprint generator implementation.
    * @param idGenerator          The ID generator implementation.
    * @param configuration        The Play configuration.
    * @param clock                The clock instance.
    * @return The authenticator service.
    */
  @Provides
  def provideAuthenticatorService(@Named("authenticator-signer") signer: Signer,
                                  @Named("authenticator-crypter") crypter: Crypter,
                                  cookieHeaderEncoding: CookieHeaderEncoding,
                                  fingerprintGenerator: FingerprintGenerator,
                                  idGenerator: IDGenerator,
                                  configuration: Configuration,
                                  clock: Clock): AuthenticatorService[CookieAuthenticator] = {

    val config = configuration.underlying.as[CookieAuthenticatorSettings]("silhouette.authenticator")
    val authenticatorEncoder = new CrypterAuthenticatorEncoder(crypter)

    new CookieAuthenticatorService(config,
      None,
      signer,
      cookieHeaderEncoding,
      authenticatorEncoder,
      fingerprintGenerator,
      idGenerator,
      clock)
  }



  /**
    *
    * @param crypter
    * @param idGenerator
    * @param configuration
    * @param clock
    * @return
    */
  @Provides
  def provideJWTAuthenticatorService(@Named("authenticator-crypter") crypter: Crypter,
                                     idGenerator: IDGenerator,
                                     configuration: Configuration,
                                     clock: Clock): AuthenticatorService[JWTAuthenticator] = {

    val config = configuration.underlying.as[JWTAuthenticatorSettings]("silhouette.authenticator")

    val encoder = new CrypterAuthenticatorEncoder(crypter)

    new JWTAuthenticatorService(config, None, encoder, idGenerator, clock)
  }

  /**
    * Provides the avatar service.
    *
    * @param httpLayer The HTTP layer implementation.
    * @return The avatar service implementation.
    */
  @Provides
  def provideAvatarService(httpLayer: HTTPLayer): AvatarService = new GravatarService(httpLayer)


  /**
    * Provides the CSRF state item handler.
    *
    * @param idGenerator   The ID generator implementation.
    * @param signer        The signer implementation.
    * @param configuration The Play configuration.
    * @return The CSRF state item implementation.
    */
  @Provides
  def provideCsrfStateItemHandler(idGenerator: IDGenerator,
                                  @Named("csrf-state-item-signer") signer: Signer,
                                  configuration: Configuration): CsrfStateItemHandler = {
    val settings = configuration.underlying.as[CsrfStateSettings]("silhouette.csrfStateItemHandler")
    new CsrfStateItemHandler(settings, idGenerator, signer)
  }

  /**
    * Provides the social state handler.
    *
    * @param signer The signer implementation.
    * @return The social state handler implementation.
    */
  @Provides
  def provideSocialStateHandler(@Named("social-state-signer") signer: Signer,
                                csrfStateItemHandler: CsrfStateItemHandler): SocialStateHandler = {

    new DefaultSocialStateHandler(Set(csrfStateItemHandler), signer)
  }

  /**
    * Provides the password hasher registry.
    *
    * @return The password hasher registry.
    */
  @Provides
  def providePasswordHasherRegistry(): PasswordHasherRegistry = {
    PasswordHasherRegistry(new BCryptSha256PasswordHasher(), Seq(new BCryptPasswordHasher()))
  }

  /**
    * Provides the credentials provider.
    *
    * @param authInfoRepository     The auth info repository implementation.
    * @param passwordHasherRegistry The password hasher registry.
    * @return The credentials provider.
    */
  @Provides
  @Named("user-login")
  def provideCredentialsProvider(authInfoRepository: AuthInfoRepository,
                                 passwordHasherRegistry: PasswordHasherRegistry): EmailCredentialsProvider = {

    new EmailCredentialsProvider(authInfoRepository, passwordHasherRegistry)
  }


  /**
    * Provides the remember me configuration.
    *
    * @param configuration The Play configuration.
    * @return The remember me config.
    */
  @Provides
  def providesRememberMeConfig(configuration: Configuration): RememberMeConfig = {
    val c = configuration.underlying
    DefaultRememberMeConfig(
      expiry = c.as[FiniteDuration]("silhouette.authenticator.rememberMe.authenticatorExpiry"),
      idleTimeout = c.getAs[FiniteDuration]("silhouette.authenticator.rememberMe.authenticatorIdleTimeout"),
      cookieMaxAge = c.getAs[FiniteDuration]("silhouette.authenticator.rememberMe.cookieMaxAge")
    )
  }


  /**
    * Provides the Github provider.
    *
    * @param httpLayer          The HTTP layer implementation.
    * @param socialStateHandler The social state handler implementation.
    * @param configuration      The Play configuration.
    * @return The Google provider.
    */
  @Provides
  def provideGithubProvider(httpLayer: HTTPLayer,
                            socialStateHandler: SocialStateHandler,
                            configuration: Configuration): GithubOAuthProvider = {

    new GithubOAuthProvider(httpLayer, socialStateHandler, configuration.underlying.as[OAuth2Settings]("silhouette.github"))
  }


}
