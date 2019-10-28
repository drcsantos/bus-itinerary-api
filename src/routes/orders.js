const orderService = require('../services/orders');

const orderRoute = router => {
    router.get('/orders', (req, res, next) => {
        orderService.getOrders(req.query)
            .then(data => res.send(data))
            .catch(next);
    });

    router.get('/orders/:id', (req, res, next) => {
        orderService.getSingleOrder(req.params.id)
            .then(data => {
                if (data) {
                    return res.send(data);
                }
                return res.status(404).end();
            })
            .catch(next);
    });

    router.post('/orders', (req, res, next) => {
        orderService.addOrder(req.body)
            .then(data => res.send(data))
            .catch(next);
    });

    router.put('/orders/:id', (req, res, next) => {
        orderService.updateOrder(req.params.id, req.body)
            .then(data => {
                if (data) {
                    return res.send(data);
                }
                return res.status(404).end();
            })
            .catch(next);
    });

    router.delete('/orders/:id', (req, res, next) => {
        orderService.deleteOrder(req.params.id)
            .then(data => res.status(data ? 200 : 404).end())
            .catch(next);
    });

    return router;
}

module.exports = orderRoute;