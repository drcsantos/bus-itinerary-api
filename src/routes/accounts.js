const AccountsService = require("../services/accounts");

const accountRoute = router => {
  const getAccounts = (req, res, next) => {
    AccountsService.getAccounts(req.query)
      .then(data => res.send(data))
      .catch(next);
  };

  const getSingleAccount = (req, res, next) => {
    AccountsService.getSingleAccount(req.params.id)
      .then(data => {
        if (data) {
          return res.send(data);
        }
        return res.status(404).end();
      })
      .catch(next);
  };

  const addAccount = (req, res, next) => {
    AccountsService.addAccount(req.body)
      .then(data => res.send(data))
      .catch(next);
  };

  const updateAccount = (req, res, next) => {
    AccountsService.updateAccount(req.params.id, req.body)
      .then(data => {
        if (data) {
          return res.send(data);
        }
        return res.status(404).end();
      })
      .catch(next);
  };

  const deleteAccount = (req, res, next) => {
    AccountsService.deleteAccount(req.params.id)
      .then(data => res.status(data ? 200 : 404).end())
      .catch(next);
  };

  const addAddress = (req, res, next) => {
    const account_id = req.params.id;
    AccountsService.addAddress(account_id, req.body)
      .then(data => res.end())
      .catch(next);
  };

  const updateAddress = (req, res, next) => {
    const account_id = req.params.id;
    const { address_id } = req.params;
    AccountsService.updateAddress(account_id, address_id, req.body)
      .then(data => res.end())
      .catch(next);
  };

  const deleteAddress = (req, res, next) => {
    const account_id = req.params.id;
    const { address_id } = req.params;
    AccountsService.deleteAddress(account_id, address_id)
      .then(data => res.end())
      .catch(next);
  };

  const setDefaultBilling = (req, res, next) => {
    const account_id = req.params.id;
    const { address_id } = req.params;
    AccountsService.setDefaultBilling(account_id, address_id)
      .then(data => res.end())
      .catch(next);
  };

  const setDefaultShipping = (req, res, next) => {
    const account_id = req.params.id;
    const { address_id } = req.params;
    AccountsService.setDefaultShipping(account_id, address_id)
      .then(data => res.end())
      .catch(next);
  };

  router.get(
    "/accounts",
    security.checkUserScope.bind(this, security.scope.READ_CUSTOMERS),
    getAccounts
  );
  router.post(
    "/accounts",
    security.checkUserScope.bind(this, security.scope.WRITE_CUSTOMERS),
    addAccount
  );
  router.get(
    "/accounts/:id",
    security.checkUserScope.bind(this, security.scope.READ_CUSTOMERS),
    getSingleAccount
  );
  router.put(
    "/accounts/:id",
    security.checkUserScope.bind(this, security.scope.WRITE_CUSTOMERS),
    updateAccount
  );
  router.delete(
    "/accounts/:id",
    security.checkUserScope.bind(this, security.scope.WRITE_CUSTOMERS),
    deleteAccount
  );
  router.post(
    "/accounts/:id/addresses",
    security.checkUserScope.bind(this, security.scope.WRITE_CUSTOMERS),
    addAddress
  );
  router.put(
    "/accounts/:id/addresses/:address_id",
    security.checkUserScope.bind(this, security.scope.WRITE_CUSTOMERS),
    updateAddress
  );
  router.delete(
    "/accounts/:id/addresses/:address_id",
    security.checkUserScope.bind(this, security.scope.WRITE_CUSTOMERS),
    deleteAddress
  );
  router.post(
    "/accounts/:id/addresses/:address_id/default_billing",
    security.checkUserScope.bind(this, security.scope.WRITE_CUSTOMERS),
    setDefaultBilling
  );
  router.post(
    "/accounts/:id/addresses/:address_id/default_shipping",
    security.checkUserScope.bind(this, security.scope.WRITE_CUSTOMERS),
    setDefaultShipping
  );

  return router;
};

module.exports = accountRoute;
