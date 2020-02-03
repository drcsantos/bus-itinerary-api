const mongo = require("../lib/mongo");
const parse = require("../lib/parse");
const ObjectID = require("mongodb").ObjectID;

const collection = () => mongo.db().collection("accounts");

const getFilter = (params = {}) => {
  const filter = {};
  const id = parse.getObjectIDIfValid(params.id);
  const group_id = parse.getObjectIDIfValid(params.group_id);

  if (id) {
    filter._id = new ObjectID(id);
  }

  if (group_id) {
    filter.group_id = group_id;
  }

  if (params.email) {
    filter.email = params.email.toLowerCase();
  }

  if (params.search) {
    filter.$or = [
      { email: new RegExp(params.search, "i") },
      { mobile: new RegExp(params.search, "i") },
      { $text: { $search: params.search } }
    ];
  }

  return filter;
};

const changeProperties = account => {
  if (account) {
    account.id = account._id.toString();
    delete account._id;

    if (account.addresses && account.addresses.length === 1) {
      account.billing = account.shipping = account.addresses[0];
    } else if (account.addresses && account.addresses.length > 1) {
      const default_billing = account.addresses.find(
        address => address.default_billing
      );
      const default_shipping = account.addresses.find(
        address => address.default_shipping
      );
      account.billing = default_billing || account.addresses[0];
      account.shipping = default_shipping || account.addresses[0];
    } else {
      account.billing = {};
      account.shipping = {};
    }
  }

  return account;
};

const getAccounts = (params = {}) => {
  const filter = getFilter(params);
  const limit = parse.getNumberIfPositive(params.limit) || 1000;
  const offset = parse.getNumberIfPositive(params.offset) || 0;

  return Promise.all([
    collection()
      .find(filter)
      .sort({ date_created: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    collection().countDocuments(filter)
  ]).then(([accounts, accountsCount]) => {
    const items = accounts.map(account => changeProperties(account));
    return {
      total_count: accountsCount,
      has_more: offset + items.length < accountsCount,
      data: items
    };
  });
};

const getSingleAccount = id => {
  if (!ObjectID.isValid(id)) {
    return Promise.reject("Invalid identifier");
  }
  return this.getAccounts({ id }).then(items =>
    items.data.length > 0 ? items.data[0] : {}
  );
};

const addAccount = async data => {
  const account = getValidDocumentForInsert(data);

  // is email unique
  if (account.email && account.email.length > 0) {
    const accountCount = await collection().count({ email: account.email });
    if (accountCount > 0) {
      return Promise.reject("Account email must be unique");
    }
  }

  const insertResponse = await collection().insertMany([account]);
  const newAccountId = insertResponse.ops[0]._id.toString();
  const newAccount = await getSingleAccount(newAccountId);
  return newAccount;
};

const getValidDocumentForInsert = data => {
  const account = {
    date_created: new Date(),
    date_updated: null,
    total_spent: 0,
    orders_count: 0
  };

  account.note = parse.getString(data.note);
  account.email = parse.getString(data.email).toLowerCase();
  account.mobile = parse.getString(data.mobile).toLowerCase();
  account.full_name = parse.getString(data.full_name);
  account.first_name = parse.getString(data.first_name);
  account.last_name = parse.getString(data.last_name);
  account.password = parse.getString(data.password);
  account.gender = parse.getString(data.gender).toLowerCase();
  account.group_id = parse.getObjectIDIfValid(data.group_id);
  account.tags = parse.getArrayIfValid(data.tags) || [];
  account.social_accounts = parse.getArrayIfValid(data.social_accounts) || [];
  account.birthdate = parse.getDateIfValid(data.birthdate);
  account.addresses = validateAddresses(data.addresses);
  account.browser = parse.getBrowser(data.browser);

  return account;
};

const updateAccount = async (id, data) => {
  if (!ObjectID.isValid(id)) {
    return Promise.reject("Invalid identifier");
  }
  const accountObjectID = new ObjectID(id);
  const account = getValidDocumentForUpdate(id, data);

  // is email unique
  if (account.email && account.email.length > 0) {
    const accountCount = await collection().count({
      _id: {
        $ne: accountObjectID
      },
      email: account.email
    });

    if (accountCount > 0) {
      return Promise.reject("Account email must be unique");
    }
  }

  await collection().updateOne(
    {
      _id: accountObjectID
    },
    {
      $set: account
    }
  );

  const updatedAccount = await getSingleAccount(id);
  return updatedAccount;
};

const getValidDocumentForUpdate = (id, data) => {
  if (Object.keys(data).length === 0) {
    return new Error("Required fields are missing");
  }

  const account = {
    date_updated: new Date()
  };

  if (data.note !== undefined) {
    account.note = parse.getString(data.note);
  }

  if (data.email !== undefined) {
    account.email = parse.getString(data.email).toLowerCase();
  }

  if (data.mobile !== undefined) {
    account.mobile = parse.getString(data.mobile).toLowerCase();
  }

  if (data.full_name !== undefined) {
    account.full_name = parse.getString(data.full_name);
  }

  if (data.first_name !== undefined) {
    account.first_name = parse.getString(data.first_name);
  }

  if (data.last_name !== undefined) {
    account.last_name = parse.getString(data.last_name);
  }

  if (data.password !== undefined) {
    account.password = parse.getString(data.password);
  }

  if (data.gender !== undefined) {
    account.gender = parse.getString(data.gender);
  }

  if (data.group_id !== undefined) {
    account.group_id = parse.getObjectIDIfValid(data.group_id);
  }

  if (data.tags !== undefined) {
    account.tags = parse.getArrayIfValid(data.tags) || [];
  }

  if (data.social_accounts !== undefined) {
    account.social_accounts =
      parse.getArrayIfValid(data.social_accounts) || [];
  }

  if (data.birthdate !== undefined) {
    account.birthdate = parse.getDateIfValid(data.birthdate);
  }

  if (data.addresses !== undefined) {
    account.addresses = validateAddresses(data.addresses);
  }

  if (data.browser !== undefined) {
    account.browser = parse.getBrowser(data.browser);
  }

  return account;
};

const validateAddresses = addresses => {
  if (addresses && addresses.length > 0) {
    const validAddresses = addresses.map(addressItem =>
      parse.getAccountAddress(addressItem)
    );
    return validAddresses;
  }
  return [];
};

const deleteAccount = async accountId => {
  if (!ObjectID.isValid(accountId)) {
    return Promise.reject("Invalid identifier");
  }
  const accountObjectID = new ObjectID(accountId);
  const deleteResponse = await collection().deleteOne({
    _id: accountObjectID
  });
  return deleteResponse.deletedCount > 0;
};

const updateAccountStatistics = (accountId, totalSpent, ordersCount) => {
  if (!ObjectID.isValid(accountId)) {
    return Promise.reject("Invalid identifier");
  }
  const accountObjectID = new ObjectID(accountId);
  const accountData = {
    total_spent: totalSpent,
    orders_count: ordersCount
  };

  return collection().updateOne(
    { _id: accountObjectID },
    { $set: accountData }
  );
};

const addAddress = (account_id, address) => {
  if (!ObjectID.isValid(account_id)) {
    return Promise.reject("Invalid identifier");
  }
  const accountObjectID = new ObjectID(account_id);
  const validAddress = parse.getAccountAddress(address);

  return collection().updateOne(
    {
      _id: accountObjectID
    },
    {
      $push: {
        addresses: validAddress
      }
    }
  );
};

const createObjectToUpdateAddressFields = address => {
  const fields = {};

  if (address.address1 !== undefined) {
    fields["addresses.$.address1"] = parse.getString(address.address1);
  }

  if (address.address2 !== undefined) {
    fields["addresses.$.address2"] = parse.getString(address.address2);
  }

  if (address.city !== undefined) {
    fields["addresses.$.city"] = parse.getString(address.city);
  }

  if (address.country !== undefined) {
    fields["addresses.$.country"] = parse
      .getString(address.country)
      .toUpperCase();
  }

  if (address.state !== undefined) {
    fields["addresses.$.state"] = parse.getString(address.state);
  }

  if (address.phone !== undefined) {
    fields["addresses.$.phone"] = parse.getString(address.phone);
  }

  if (address.postal_code !== undefined) {
    fields["addresses.$.postal_code"] = parse.getString(address.postal_code);
  }

  if (address.full_name !== undefined) {
    fields["addresses.$.full_name"] = parse.getString(address.full_name);
  }

  if (address.company !== undefined) {
    fields["addresses.$.company"] = parse.getString(address.company);
  }

  if (address.tax_number !== undefined) {
    fields["addresses.$.tax_number"] = parse.getString(address.tax_number);
  }

  if (address.coordinates !== undefined) {
    fields["addresses.$.coordinates"] = address.coordinates;
  }

  if (address.details !== undefined) {
    fields["addresses.$.details"] = address.details;
  }

  if (address.default_billing !== undefined) {
    fields["addresses.$.default_billing"] = parse.getBooleanIfValid(
      address.default_billing,
      false
    );
  }

  if (address.default_shipping !== undefined) {
    fields["addresses.$.default_shipping"] = parse.getBooleanIfValid(
      address.default_shipping,
      false
    );
  }

  return fields;
};

const updateAddress = (account_id, address_id, data) => {
  if (!ObjectID.isValid(account_id) || !ObjectID.isValid(address_id)) {
    return Promise.reject("Invalid identifier");
  }
  const accountObjectID = new ObjectID(account_id);
  const addressObjectID = new ObjectID(address_id);
  const addressFields = createObjectToUpdateAddressFields(data);

  return collection().updateOne(
    {
      _id: accountObjectID,
      "addresses.id": addressObjectID
    },
    { $set: addressFields }
  );
};

const deleteAddress = (account_id, address_id) => {
  if (!ObjectID.isValid(account_id) || !ObjectID.isValid(address_id)) {
    return Promise.reject("Invalid identifier");
  }
  const accountObjectID = new ObjectID(account_id);
  const addressObjectID = new ObjectID(address_id);

  return collection().updateOne(
    {
      _id: accountObjectID
    },
    {
      $pull: {
        addresses: {
          id: addressObjectID
        }
      }
    }
  );
};

const setDefaultBilling = (account_id, address_id) => {
  if (!ObjectID.isValid(account_id) || !ObjectID.isValid(address_id)) {
    return Promise.reject("Invalid identifier");
  }
  const accountObjectID = new ObjectID(account_id);
  const addressObjectID = new ObjectID(address_id);

  return collection()
    .updateOne(
      {
        _id: accountObjectID,
        "addresses.default_billing": true
      },
      {
        $set: {
          "addresses.$.default_billing": false
        }
      }
    )
    .then(res =>
      collection().updateOne(
        {
          _id: accountObjectID,
          "addresses.id": addressObjectID
        },
        {
          $set: {
            "addresses.$.default_billing": true
          }
        }
      )
    );
};

const setDefaultShipping = (account_id, address_id) => {
  if (!ObjectID.isValid(account_id) || !ObjectID.isValid(address_id)) {
    return Promise.reject("Invalid identifier");
  }
  const accountObjectID = new ObjectID(account_id);
  const addressObjectID = new ObjectID(address_id);

  return collection()
    .updateOne(
      {
        _id: accountObjectID,
        "addresses.default_shipping": true
      },
      {
        $set: {
          "addresses.$.default_shipping": false
        }
      }
    )
    .then(res =>
      collection().updateOne(
        {
          _id: accountObjectID,
          "addresses.id": addressObjectID
        },
        {
          $set: {
            "addresses.$.default_shipping": true
          }
        }
      )
    );
};

module.exports = {
  getAccounts,
  getSingleAccount,
  addAccount,
  updateAccount,
  deleteAccount,
  updateAccountStatistics,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultBilling,
  setDefaultShipping
};
