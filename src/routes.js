const express = require('express');
const service = require('./service');

const apiRouter = router => {
    router.get('/routes', (req, res, next) => {
        const data = service.getRoutes();
        res.status(data !== null ? 200 : 404).send(data);
    });

    return router;
}

module.exports = apiRouter(express.Router());