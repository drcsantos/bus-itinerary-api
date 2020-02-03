const express = require("express");
const settings = require("./lib/settings");
const bcrypt = require("bcrypt");
const auth = require("./lib/auth");
const AccountService = require("./services/accounts");
const OrderService = require("./services/orders");
const db = require("./lib/mongo").db();

const router = express.Router();

router.post("/reset-password", async (req, res, next) => {
  await bcrypt.hash(
    req.body.password,
    settings.saltRounds,
    async (err, hash) => {
      const data = {
        status: false,
        id: null,
        verified: false
      };

      const userId =
        "token" in req.body
          ? auth.decodeUserLoginAuth(req.body.token)
          : auth.decodeUserLoginAuth(req.body.id).userId.userId;

      const filter = {
        id: userId
      };
      const customerDraft = {
        password: hash
      };

      // update customer password after checking customer id
      if ("id" in req.body) {
        await AccountService.updateAccount(userId, customerDraft).then(
          ({ status, json }) => {
            data.status = true;
            data.id = userId;
            data.verified = true;
            return res.status(status).send(data);
          }
        );
        return false;
      }

      if ("name" in userId && userId.name.indexOf("JsonWebTokenErro") !== -1) {
        res.send(data);
        return false;
      }

      // if customer email exists send status back
      const { status, json } = await api.customers.list(filter);
      if (json.total_count > 0) {
        data.status = true;
        data.id = auth.encodeUserLoginAuth(userId);
      }
      return res.status(status).send(data);
    }
  );
});

router.post("/forgot-password", async (req, res, next) => {
  const filter = {
    email: req.body.email.toLowerCase()
  };
  const data = {
    status: true
  };

  // send forgot password email
  async function sendEmail(userId) {
    const countryCode = undefined;
    const [emailTemp] = await Promise.all([
      EmailTemplatesService.getEmailTemplate(
        `forgot_password_${serverConfigs.language}`
      )
    ]);
    await handlebars.registerHelper("forgot_password_link", obj => {
      const url = `${serverConfigs.storeBaseUrl}${
        countryCode !== undefined ? `/${countryCode}/` : "/"
      }reset-password?token=${AuthHeader.encodeUserLoginAuth(userId)}`;
      let text = emailTemp.link;
      if (text == undefined) {
        text = url;
      }
      return new handlebars.SafeString(
        `<a style="position: relative;text-transform: uppercase;border: 1px solid #ccc;color: #000;padding: 5px;text-decoration: none;" value="${text}" href="${url}"> ${text} </a>`
      );
    });
    const [bodyTemplate, settings] = await Promise.all([
      handlebars.compile(emailTemp.body),
      SettingsService.getSettings()
    ]);
    await Promise.all([
      mailer.send({
        to: req.body.email,
        subject: `${emailTemp.subject} ${settings.store_name}`,
        html: bodyTemplate({
          shop_name: settings.store_name
        })
      }),
      res.send(data)
    ]);
  }

  // check if account exists
  await api.accounts.list(filter).then(({ status, json }) => {
    if (json.total_count < 1) {
      data.status = false;
      res.status(status).send(data);
      return false;
    }
    sendEmail(json.data[0].id);
  });
});

router.post("/user-account", async (req, res, next) => {
  const accountData = {
    token: "",
    authenticated: false,
    account_settings: null,
    order_statuses: null
  };

  if (req.body.token) {
    accountData.token = AuthHeader.decodeUserLoginAuth(req.body.token);
    if (accountData.token.userId !== undefined) {
      const userId = JSON.stringify(accountData.token.userId).replace(
        /["']/g,
        ""
      );
      const filter = {
        account_id: userId
      };

      // retrieve account data
      await api.accounts.retrieve(userId).then(({ status, json }) => {
        accountData.account_settings = json;
        accountData.account_settings.password = "*******";
        accountData.token = AuthHeader.encodeUserLoginAuth(userId);
        accountData.authenticated = false;
      });

      // retrieve orders data
      await api.orders.list(filter).then(({ status, json }) => {
        accountData.order_statuses = json;
        let objJsonB64 = JSON.stringify(accountData);
        objJsonB64 = Buffer.from(objJsonB64).toString("base64");
        return res.status(status).send(JSON.stringify(objJsonB64));
      });
    }
  }
});

router.post("/login", async (req, res, next) => {
  const accountData = {
    token: "",
    authenticated: false,
    loggedin_failed: false,
    account_settings: null,
    order_statuses: null,
    cartLayer: req.body.cartLayer !== undefined ? req.body.cartLayer : false
  };
  // check if account exists in database and grant or denie access
  await db
    .collection("accounts")
    .find({
      email: req.body.email.toLowerCase()
    })
    .limit(1)
    .next((error, result) => {
      if (error) {
        // alert
        throw error;
      }
      if (!result) {
        AccountService.getAccounts().then(accounts => {
          accountData.loggedin_failed = true;
          let objJsonB64 = JSON.stringify(accountData);
          objJsonB64 = Buffer.from(objJsonB64).toString("base64");
          return res
            .status(accounts.length === 0 ? 404 : 200)
            .send(JSON.stringify(objJsonB64));
        });
        return;
      }
      const accountPassword = result.password;
      const inputPassword = req.body.password;

      bcrypt.compare(inputPassword, accountPassword, async (err, out) => {
        if (out === true) {
          accountData.token = auth.encodeUserLoginAuth(result._id);
          accountData.authenticated = true;

          await AccountService.getSingleAccount(result._id).then(account => {
            accountData.account_settings = account;
            accountData.account_settings.password = "*******";

            const filter = {
              account_id: account.id
            };

            OrderService.getOrders(filter).then(orders => {
              accountData.order_statuses = json;
              let objJsonB64 = JSON.stringify(accountData);
              objJsonB64 = Buffer.from(objJsonB64).toString("base64");
              return res
                .status(orders.length === 0 ? 404 : 200)
                .send(JSON.stringify(objJsonB64));
            });
          });
          return true;
        }
        accountData.loggedin_failed = true;
        let objJsonB64 = JSON.stringify(accountData);
        objJsonB64 = Buffer.from(objJsonB64).toString("base64");
        res.status(200).send(JSON.stringify(objJsonB64));
      });
    });
});

router.post("/register", async (req, res, next) => {
  // set data for response
  const data = {
    status: false,
    isRightToken: true,
    isAccountSaved: false
  };
  const filter = {
    email: req.body.email
  };

  // check if url params contains token
  const requestToken = "token" in req.body ? req.body.token : false;

  if (requestToken && !data.status) {
    const requestTokenArray = requestToken.split("xXx");

    // if requestToken array has no splitable part response token is wrong
    if (requestTokenArray.length < 2) {
      data.isRightToken = false;
      res.status("200").send(data);
      return false;
    }

    (async () => {
      // decode token parts and check if valid email is the second part of them
      const firstName = await AuthHeader.decodeUserLoginAuth(
        requestTokenArray[0]
      ).userId;
      const lastName = await AuthHeader.decodeUserLoginAuth(
        requestTokenArray[1]
      ).userId;
      const eMail = await AuthHeader.decodeUserLoginAuth(requestTokenArray[2])
        .userId;
      const passWord = requestTokenArray[3];

      if (
        requestTokenArray.length < 1 ||
        !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
          eMail
        )
      ) {
        // if (requestTokenArray.length < 1) {
        data.isRightToken = false;
        res.status("200").send(data);
        return false;
      }

      // check once if account email is existig in database
      filter.email = eMail;
      await api.accounts.list(filter).then(({ status, json }) => {
        if (json.total_count > 0) {
          data.isAccountSaved = true;
          res.status(status).send(data);
          return false;
        }
      });
      // generate password-hash
      const salt = bcrypt.genSaltSync(saltRounds);
      const hashPassword = bcrypt.hashSync(passWord, salt);

      const accountDraft = {
        full_name: `${firstName} ${lastName}`,
        first_name: firstName,
        last_name: lastName,
        email: eMail.toLowerCase(),
        password: hashPassword
      };

      // create new account in database
      await api.accounts.create(accountDraft).then(({ status, json }) => {
        data.isAccountSaved = true;
        return res.status(status).send(data);
      });
      return true;
    })();
  }

  // send account a doi email
  async function registerAccount() {
    if (data.status) {
      const countryCode = undefined;
      const [emailTemp] = await Promise.all([
        EmailTemplatesService.getEmailTemplate(
          `register_doi_${serverConfigs.language}`
        )
      ]);
      await handlebars.registerHelper("register_doi_link", obj => {
        const url = `${serverConfigs.storeBaseUrl}${
          countryCode !== undefined ? `/${countryCode}/` : "/"
        }register?token=${tokenConcatString}`;
        let text = emailTemp.link;
        if (text == undefined) {
          text = url;
        }
        return new handlebars.SafeString(
          `<a style="position: relative;text-transform: uppercase;border: 1px solid #ccc;color: #000;padding: 5px;text-decoration: none;" value="${text}" href="${url}"> ${text} </a>`
        );
      });
      const [bodyTemplate, settings] = await Promise.all([
        handlebars.compile(emailTemp.body),
        SettingsService.getSettings()
      ]);
      const tokenConcatString = `${AuthHeader.encodeUserLoginAuth(
        req.body.first_name
      )}xXx${AuthHeader.encodeUserLoginAuth(
        req.body.last_name
      )}xXx${AuthHeader.encodeUserLoginAuth(req.body.email)}xXx${
        req.body.password
      }`;
      await Promise.all([
        mailer.send({
          to: req.body.email,
          subject: `${emailTemp.subject} ${settings.store_name}`,
          html: bodyTemplate({
            shop_name: settings.store_name
          })
        }),
        res.status("200").send(data)
      ]);
    }
    return false;
  }
  // check if account exist in database
  if (!requestToken) {
    await api.accounts.list(filter).then(({ status, json }) => {
      if (json.total_count > 0) {
        res.status(status).send(data);
        return false;
      }
      data.status = true;
      registerAccount();
    });
  }
});

router.put("/user-account", async (req, res, next) => {
  const accountData = req.body;
  const token = AuthHeader.decodeUserLoginAuth(req.body.token);
  const userId = JSON.stringify(token.userId).replace(/["']/g, "");

  // generate password-hash
  const inputPassword = accountData.password;
  const salt = bcrypt.genSaltSync(saltRounds);
  const hashPassword = bcrypt.hashSync(inputPassword, salt);

  // setup objects and filter
  const accountDataObj = {
    token: "",
    authenticated: false,
    account_settings: null,
    order_statuses: null
  };
  const accountDraftObj = {
    full_name: `${accountData.first_name} ${accountData.last_name}`,
    first_name: accountData.first_name,
    last_name: accountData.last_name,
    email: accountData.email.toLowerCase(),
    password: hashPassword,
    addresses: [accountData.billing_address, accountData.shipping_address]
  };
  const filter = {
    email: accountData.email
  };
  // update account profile and addresses
  await api.accounts.list(filter).then(({ status, json }) => {
    // if account email exists already do not update
    if (json.total_count > 0) {
      delete accountDraftObj.email;
    }
  });
  try {
    // update account
    await db.collection("accounts").updateMany(
      { _id: ObjectID(userId) },
      {
        $set: accountDraftObj
      },
      { ordered: false },
      async (error, result) => {
        if (error) {
          // alert
          res.status("200").send(error);
        }
        accountDataObj.account_settings = result;
        accountDataObj.account_settings.password = "*******";
        accountDataObj.token = AuthHeader.encodeUserLoginAuth(userId);
        accountData.authenticated = false;

        if (accountData.saved_addresses === 0) {
          let objJsonB64 = JSON.stringify(accountDataObj);
          objJsonB64 = Buffer.from(objJsonB64).toString("base64");
          res.status("200").send(JSON.stringify(objJsonB64));
          return false;
        }

        // update orders
        await db.collection("orders").updateMany(
          { account_id: ObjectID(userId) },
          {
            $set: {
              shipping_address: accountData.shipping_address,
              billing_address: accountData.billing_address
            }
          },
          (error, result) => {
            if (error) {
              // alert
              res.status("200").send(error);
            }
            accountDataObj.order_statuses = result;
            let objJsonB64 = JSON.stringify(accountDataObj);
            objJsonB64 = Buffer.from(objJsonB64).toString("base64");
            res.status("200").send(JSON.stringify(objJsonB64));
          }
        );
      }
    );
  } catch (error) {}
});

module.exports = router;
