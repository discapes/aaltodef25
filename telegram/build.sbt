val scala3Version = "3.7.3"

lazy val root = project
  .in(file("."))
  .settings(
    name := "Scala 3 Project Template",
    version := "0.1.0-SNAPSHOT",

    scalaVersion := scala3Version,

    // Core with minimal dependencies, enough to spawn your first bot.
    libraryDependencies += "com.bot4s" %% "telegram-core" % "6.0.0",
    // Extra goodies: Webhooks, support for games, bindings for actors.
    libraryDependencies += "com.bot4s" %% "telegram-akka" % "6.0.0",
    libraryDependencies += "com.github.tototoshi" %% "scala-csv" % "2.0.0",
    libraryDependencies += "org.xerial" % "sqlite-jdbc" % "3.50.3.0",
    libraryDependencies += "com.typesafe.slick" %% "slick" % "3.6.1",
    // note the % instead of %% since it's not a scala dependency
    libraryDependencies += "ch.qos.logback" % "logback-classic" % "1.5.19",
    libraryDependencies += "com.typesafe.scala-logging" %% "scala-logging" % "3.9.4",
  )
