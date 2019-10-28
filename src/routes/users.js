const userService = require('../services/users');

const userRoute = router => {
    router.get('/users', (req, res, next) => {
        userService.getUsers(req.query)
            .then(data => res.send(data))
            .catch(next);
    });

    router.get('/users/:id', (req, res, next) => {
        userService.getSingleUser(req.params.id)
            .then(data => {
                if (data) {
                    return res.send(data);
                }
                return res.status(404).end();
            })
            .catch(next);
    });

    router.post('/users', (req, res, next) => {
        userService.addUser(req.body)
            .then(data => res.send(data))
            .catch(next);
    });

    router.put('/users/:id', (req, res, next) => {
        userService.updateUser(req.params.id, req.body)
            .then(data => {
                if (data) {
                    return res.send(data);
                }
                return res.status(404).end();
            })
            .catch(next);
    });

    router.delete('/users/:id', (req, res, next) => {
        userService.deleteUser(req.params.id)
            .then(data => res.status(data ? 200 : 404).end())
            .catch(next);
    });

    return router;
}

module.exports = userRoute;