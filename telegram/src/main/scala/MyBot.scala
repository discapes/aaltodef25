import com.bot4s.telegram.api.RequestHandler
import com.bot4s.telegram.clients.FutureSttpClient
import com.bot4s.telegram.future.TelegramBot
import sttp.client3.*

import scala.concurrent.Future

abstract class MyBot(token: String) extends TelegramBot:
  implicit val backend: SttpBackend[Future, Any] = HttpClientFutureBackend()
  override val client: RequestHandler[Future]    = new FutureSttpClient(token)
