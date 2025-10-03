import cats.syntax.functor.*
import com.bot4s.telegram.Implicits.toOption
import com.bot4s.telegram.api.ChatActions
import com.bot4s.telegram.api.declarative.{Commands, InlineQueries, whenOrElse}
import com.bot4s.telegram.future.Polling
import com.bot4s.telegram.methods.SendVoice
import com.bot4s.telegram.models.*
import sttp.client3.*
import sttp.model.Uri

import java.net.URLEncoder
import scala.concurrent.Future

/**
 * Text-to-speech bot (using Google TTS API)
 *
 * Google will rightfully block your IP in case of abuse.
 * '''Usage:''' /speak Hello World
 * '''Inline mode:''' @YourBot This is awesome
 */
class TextToSpeechBot(token: String) extends MyBot(token)
    with Polling
    with Commands[Future]
    with InlineQueries[Future]
    with ChatActions[Future] {

  def ttsUrl(text: String) =
    s"http://translate.google.com/translate_tts?client=tw-ob&tl=en-us&q=${URLEncoder.encode(text, "UTF-8")}"

  onCommand("speak" | "say" | "talk") { implicit msg =>
    withArgs { args =>
      val text = args.mkString(" ")
      // https://sttp.softwaremill.com/en/v3.0.0/model/model.html?highlight=unsafeparse
      val x = basicRequest.get(Uri.unsafeParse(ttsUrl(text))).response(asByteArrayAlways).send()
      for {
        r <- x
        if r.isSuccess
        bytes = r.body
        _ <- uploadingAudio // hint the user
        voiceMp3 = InputFile("voice.mp3", bytes)
        _ <- request(SendVoice(msg.source, voiceMp3))
      } yield ()
    }
  }

  def nonEmptyQuery(iq: InlineQuery): Boolean = iq.query.nonEmpty

  whenOrElse(onInlineQuery, nonEmptyQuery) { implicit iq =>
    answerInlineQuery(
      Seq(
        // Inline "playable" preview
        InlineQueryResultVoice("inline: " + iq.query, ttsUrl(iq.query), iq.query),
        // Redirection to /speak command
        InlineQueryResultArticle(
          "command: " + iq.query,
          iq.query,
          inputMessageContent = InputTextMessageContent("/speak " + iq.query),
          description = "/speak " + iq.query
        )
      )
    ).void
  } /* empty query */ {
    answerInlineQuery(Seq())(_).void
  }
}
