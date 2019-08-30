const express = require("express");
const helmet = require("helmet");
const bodyParser = require("body-parser");
const responseTime = require("response-time");
const winston = require("winston");
const logger = require("./lib/logger");
const morgan = require("morgan");
const router = require("./routes");
const app = express();

const BASE_API_URL = "/api";

app.use(morgan("short"));
app.set("trust proxy", 1);
app.use(helmet());

app.all("*", (req, res, next) => {
  // CORS headers
  const allowedOrigins = "*";
  const { origin } = req.headers;
  if (allowedOrigins === "*") {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigins);
  } else if (allowedOrigins.indexOf(origin) > -1) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Key, Authorization"
  );
  next();
});

app.use(responseTime());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(BASE_API_URL, router);
app.use(logger.sendResponse);

const port = process.env.SERVER_PORT || 4000;
app.listen(port, () => {  
  winston.info(`API running at http://localhost:${port}`);
});
