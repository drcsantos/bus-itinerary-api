const express = require('express');
const directionRoute = require('./routes/directions');

const apiRouter = express.Router();

directionRoute(apiRouter);

module.exports = apiRouter;
