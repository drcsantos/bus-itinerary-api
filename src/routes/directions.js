const directionService = require('../services/directions');

const directionRoute = router => {
    router.get('/routes', (req, res, next) => {
        const data = directionService.getRoutes();
        res.status(data !== null ? 200 : 404).send(data);
    });

    return router;
}

module.exports = directionRoute;