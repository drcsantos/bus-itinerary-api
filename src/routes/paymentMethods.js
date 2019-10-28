const paymentMethodService = require('../services/paymentMethods');

const paymentMethodRoute = router => {
    router.get('/paymentMethods', (req, res, next) => {
        paymentMethodService.getPaymentMethods(req.query)
            .then(data => res.send(data))
            .catch(next);
    });

    router.get('/paymentMethods/:id', (req, res, next) => {
        paymentMethodService.getSinglePaymentMethod(req.params.id)
            .then(data => {
                if (data) {
                    return res.send(data);
                }
                return res.status(404).end();
            })
            .catch(next);
    });

    router.post('/paymentMethods', (req, res, next) => {
        paymentMethodService.addPaymentMethod(req.body)
            .then(data => res.send(data))
            .catch(next);
    });

    router.put('/paymentMethods/:id', (req, res, next) => {
        paymentMethodService.updatePaymentMethod(req.params.id, req.body)
            .then(data => {
                if (data) {
                    return res.send(data);
                }
                return res.status(404).end();
            })
            .catch(next);
    });

    router.delete('/paymentMethods/:id', (req, res, next) => {
        paymentMethodService.deletePaymentMethod(req.params.id)
            .then(data => res.status(data ? 200 : 404).end())
            .catch(next);
    });

    return router;
}

module.exports = paymentMethodRoute;