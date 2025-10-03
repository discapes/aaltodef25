abstract class MyBot(token: String) extends TelegramBot:
  implicit val backend: SttpBackend[Future, Any] = HttpClientFutureBackend()
  override val client: RequestHandler[Future]    = new FutureSttpClient(token)
