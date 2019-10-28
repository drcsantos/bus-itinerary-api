
const mongo = require('../lib/mongo');
const parse = require('../lib/parse');
const utils = require('../lib/utils');
const ObjectID = require('mongodb').ObjectID;

const DEFAULT_SORT = { name: 1 };

const collection = () => mongo.db().collection('paymentMethods');

const getValidDocumentForInsert = data => {
  const paymentMethod = {
    date_created: new Date()
  };

  paymentMethod.name = parse.getString(data.name);
  paymentMethod.enabled = parse.getBooleanIfValid(data.enabled, true);

  return Promise.resolve(paymentMethod);
}

const getFilter = (params = {}) => {
  const filter = {};
  const id = parse.getObjectIDIfValid(params.id);
  const name = parse.getString(params.name);
  const enabled = parse.getString(params.enabled);
  if (id) {
    filter._id = id;
  }
  if (name) {
    filter.name = name;
  }
  if (enabled) {
    filter.enabled = enabled.toLowerCase() === 'true' ? true : false;
  }
  return filter;
}

const getSortQuery = ({ sort }) => {
  if (sort && sort.length > 0) {
    const fields = sort.split(',');
    return Object.assign(
      ...fields.map(field => ({
        [field.startsWith('-') ? field.slice(1) : field]: field.startsWith(
          '-'
        )
          ? -1
          : 1
      }))
    );
  }
  return DEFAULT_SORT;
}

const getPaymentMethods = async (params = {}) => {
  const filter = getFilter(params);
  const sortQuery = getSortQuery(params);
  const projection = utils.getProjectionFromFields(params.fields);
  const paymentMethods = await collection()
    .find(filter, { projection })
    .sort(sortQuery)
    .toArray();

  return paymentMethods.map(paymentMethod => {
    if (paymentMethod) {
      paymentMethod.id = paymentMethod._id.toString();
      paymentMethod._id = undefined;
    }

    return paymentMethod;
  });
}

const getSinglePaymentMethod = id => {
  if (!ObjectID.isValid(id)) {
    return Promise.reject('Invalid identifier');
  }
  return getPaymentMethods({ id }).then(paymentMethods =>
    paymentMethods.length > 0 ? paymentMethods[0] : null
  );
}

const getValidDocumentForUpdate = (id, data) => {
  if (Object.keys(data).length === 0) {
    return Promise.reject('Required fields are missing');
  }
  return getSinglePaymentMethod(id).then(prevPaymentMethodData => {
    const paymentMethod = {
      date_updated: new Date()
    };

    if (data.name !== undefined) {
      paymentMethod.name = parse.getString(data.name);
    }

    if (data.enabled !== undefined) {
      paymentMethod.enabled = parse.getBooleanIfValid(data.enabled, true);
    }

    return paymentMethod;
  });
}

const updatePaymentMethod = (id, data) => {
  if (!ObjectID.isValid(id)) {
    return Promise.reject('Invalid identifier');
  }
  const paymentMethodID = new ObjectID(id);

  return getValidDocumentForUpdate(id, data).then(paymentMethod =>
    collection()
      .updateOne({ _id: paymentMethodID }, { $set: paymentMethod })
      .then(res => getSinglePaymentMethod(id))
  );
}

const addPaymentMethod = data => {
  return getValidDocumentForInsert(data).then(paymentMethod =>
    collection()
      .insertMany([paymentMethod])
      .then(res => getSinglePaymentMethod(res.ops[0]._id.toString()))
  );
}

const deletePaymentMethod = id => {
  if (!ObjectID.isValid(id)) {
    return Promise.reject('Invalid identifier');
  }
  const objectID = new ObjectID(id);
  return collection()
    .deleteOne({ _id: objectID })
    .then(deleteResponse => deleteResponse.deletedCount > 0);
}

module.exports = {
  addPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  getSinglePaymentMethod
};
