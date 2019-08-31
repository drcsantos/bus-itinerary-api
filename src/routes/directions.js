const directionService = require('../services/directions');

const directionRoute = router => {
    router.get('/directions', (req, res, next) => {
        directionService.getDirections(req.query)
            .then(data => res.send(data))
            .catch(next);
    });

    router.get('/directions/:id', (req, res, next) => {
        directionService.getSingleDirection(req.params.id)
            .then(data => {
                if (data) {
                    return res.send(data);
                }
                return res.status(404).end();
            })
            .catch(next);
    });

    router.post('/directions', (req, res, next) => {
        directionService.addDirection(req.body)
            .then(data => res.send(data))
            .catch(next);
    });

    return router;
}

module.exports = directionRoute;