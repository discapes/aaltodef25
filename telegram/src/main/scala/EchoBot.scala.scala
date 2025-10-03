class EchoBot(token: String) extends MyBot(token) with Polling:
  override def receiveMessage(msg: Message): Future[Unit] =
    println("Received " + msg)
    msg.text.fold(Future.successful(())) { text =>
      request(SendMessage(msg.source, text.reverse)).void
    }