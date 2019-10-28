const express = require('express');
const directionRoute = require('./routes/directions');

const userRoute = require('./routes/users');
const productRoute = require('./routes/products');
const paymentMethodRoute = require('./routes/paymentMethods');
const orderRoute = require('./routes/orders');

const apiRouter = express.Router();

directionRoute(apiRouter);
userRoute(apiRouter);
productRoute(apiRouter);
paymentMethodRoute(apiRouter);
orderRoute(apiRouter);

module.exports = apiRouter;
