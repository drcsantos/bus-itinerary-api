const productService = require('../services/products');

const productRoute = router => {
    router.get('/products', (req, res, next) => {
        productService.getProducts(req.query)
            .then(data => res.send(data))
            .catch(next);
    });

    router.get('/products/:id', (req, res, next) => {
        productService.getSingleProduct(req.params.id)
            .then(data => {
                if (data) {
                    return res.send(data);
                }
                return res.status(404).end();
            })
            .catch(next);
    });

    router.post('/products', (req, res, next) => {
        productService.addProduct(req.body)
            .then(data => res.send(data))
            .catch(next);
    });

    router.put('/products/:id', (req, res, next) => {
        productService.updateProduct(req.params.id, req.body)
            .then(data => {
                if (data) {
                    return res.send(data);
                }
                return res.status(404).end();
            })
            .catch(next);
    });

    router.delete('/products/:id', (req, res, next) => {
        productService.deleteProduct(req.params.id)
            .then(data => res.status(data ? 200 : 404).end())
            .catch(next);
    });

    return router;
}

module.exports = productRoute;