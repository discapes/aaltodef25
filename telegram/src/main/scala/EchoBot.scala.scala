import cats.syntax.functor.*
import com.bot4s.telegram.future.Polling
import com.bot4s.telegram.methods.SendMessage
import com.bot4s.telegram.models.Message

import scala.concurrent.Future

class EchoBot(token: String) extends MyBot(token) with Polling:
  override def receiveMessage(msg: Message): Future[Unit] =
    println("Received " + msg)
    msg.text.fold(Future.successful(())) { text =>
      request(SendMessage(msg.source, text.reverse)).void
    }
