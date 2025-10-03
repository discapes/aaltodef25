import com.typesafe.scalalogging.Logger

import scala.concurrent.duration.Duration
import scala.concurrent.{Await, Future}

val logger = Logger("MJBot")
def getBot(token: String) = TextToSpeechBot(token)


/*
https://www.scala-lang.org/api/current/scala/App.html:
> In Scala 3, the DelayedInit feature was dropped.
> App exists only in a limited form that also does not support command line arguments and will be deprecated in the future.
> @main methods are the recommended scheme to generate programs that can be invoked from the command line in Scala 3.
*/
@main def main() =
  val token = sys.env("BOT_TOKEN")
  logger.debug(s"Using bot token: '$token'")
  val bot = getBot(token)
  val eol: Future[Unit] = bot.run()
  println("Press [ENTER] to shutdown the bot, it may take a few seconds...")
  scala.io.StdIn.readLine()
  println("Shutting down the bot... Since it's long polling, sending an event will allow the connection to end.")
  bot.shutdown()
  Await.result(eol, Duration.Inf)
  println("Bot exited.")

