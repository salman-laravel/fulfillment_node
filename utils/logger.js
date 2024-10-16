const { createLogger, format, transports } = require("winston");
const fs = require("fs");
const DailyRotate = require("winston-daily-rotate-file");
const dotenv = require("dotenv");

dotenv.config({
  path: "./.env",
});

const logDir = "log";

let infoLogger;

class Logger {
  constructor() {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }

    infoLogger = createLogger({
      level: process.env.NODE_ENVIRONMENT === "development" ? "info" : "debug",
      format: format.combine(
        format.timestamp({
          format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`
        )
      ),
      transports: [
        new transports.Console({
          levels: "info",
          format: format.combine(
            format.colorize(),
            format.printf(
              (info) => `${info.timestamp} ${info.level}: ${info.message}`
            )
          ),
        }),
        new DailyRotate({
          filename: `${logDir}/%DATE%-info-results.log`,
          datePattern: "YYYY-MM-DD",
        }),
      ],
      exitOnError: false,
    });
  }

  info(message, data = null) {
    const severity = "info";
    if (data) {
      infoLogger.log(severity, `${message} - ${data}`);
    } else {
      infoLogger.log(severity, message);
    }
  }
}

module.exports = Logger;
