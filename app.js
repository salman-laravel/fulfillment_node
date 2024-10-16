const express = require("express");

//uses to limit the request. Rate Limiter
const rateLimit = require("express-rate-limit");

//adds headers for security purpose
const helmet = require("helmet");

//excluding characters from request that uses in attacks like < or >
const xss = require("xss-clean");

//Express middleware to protect against HTTP Parameter Pollution attacks
const hpp = require("hpp");
const cors = require("cors");

//routes
const routes = require("./routes/index");

//exceptions
const globalErrHandler = require("./Exceptions/globalExceptionHandler");
const AppError = require("./Exceptions/appError");

//app
const app = express();

app.set('trust proxy', 1);

// Allow Cross-Origin requests
app.use(cors());

// Set security HTTP headers
app.use(helmet());

// Limit request from the same API
const limiter = rateLimit({
  max: 150,
  windowMs: 60 * 60 * 1000,
  message: "Too Many Request from this IP, please try again in an hour",
});
app.use("/api", limiter);

// Body parser, reading data from body into req.body
app.use(
  express.json({
    limit: "15kb",
  }),
);

// Data sanitization against XSS(clean user input from malicious HTML code)
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Routes
app.use(routes);

// handle undefined Routes
app.use("*", (req, res, next) => {
  const err = new AppError(404, "fail", "undefined route");
  next(err, req, res, next);
});

app.use("/", (req, res, next) => {
 return res.json('test response');
});
app.use(globalErrHandler);

// Require the helpers file
require("./utils/helpers");

module.exports = app;

