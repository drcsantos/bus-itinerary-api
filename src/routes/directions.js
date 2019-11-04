const directionService = require('../services/directions');

const directionRoute = router => {
    router.get('/directions', (req, res, next) => {
        // TODO: BugFix for mobile, remove it
        /*if (typeof req.query.enabled === 'undefined') {
            if (!req.query.fields) {
                req.query.fields = '-pathPoints,-wayPoints';
            }            
        }*/

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

    router.put('/directions/:id', (req, res, next) => {
        directionService.updateDirection(req.params.id, req.body)
            .then(data => {
                if (data) {
                    return res.send(data);
                }
                return res.status(404).end();
            })
            .catch(next);
    });

    router.delete('/directions/:id', (req, res, next) => {
        directionService.deleteDirection(req.params.id)
            .then(data => res.status(data ? 200 : 404).end())
            .catch(next);
    });

    return router;
}

module.exports = directionRoute;