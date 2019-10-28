
const mongo = require('../lib/mongo');
const parse = require('../lib/parse');
const utils = require('../lib/utils');
const ObjectID = require('mongodb').ObjectID;

const DEFAULT_SORT = { date_created: -1 };

const collection = () => mongo.db().collection('orders');

const getValidDocumentForInsert = data => {
  const order = {
    date_created: new Date()
  };

  order.products = parse.getArrayIfValid(data.products) || [];
  order.paymentMethod = parse.getObjectIDIfValid(data.paymentMethod);
  order.customer = parse.getObjectIDIfValid(data.customer);
  order.shippingAddress = data.shippingAddress;
  order.enabled = parse.getBooleanIfValid(data.enabled, true);

  return Promise.resolve(order);
}

const getFilter = (params = {}) => {
  const filter = {};
  const id = parse.getObjectIDIfValid(params.id);
  const paymentMethod = parse.getString(params.paymentMethod);
  const customer = parse.getString(params.customer);
  const enabled = parse.getString(params.enabled);
  if (id) {
    filter._id = id;
  }
  if (paymentMethod) {
    filter.paymentMethod = paymentMethod;
  }
  if (customer) {
    filter.customer = customer;
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

const getOrders = async (params = {}) => {
  const filter = getFilter(params);
  const sortQuery = getSortQuery(params);
  const projection = utils.getProjectionFromFields(params.fields);
  const orders = await collection()
    .find(filter, { projection })
    .sort(sortQuery)
    .toArray();

  return orders.map(order => {
    if (order) {
      order.id = order._id.toString();
      order._id = undefined;
    }

    return order;
  });
}

const getSingleOrder = id => {
  if (!ObjectID.isValid(id)) {
    return Promise.reject('Invalid identifier');
  }
  return getOrders({ id }).then(orders =>
    orders.length > 0 ? orders[0] : null
  );
}

const getValidDocumentForUpdate = (id, data) => {
  if (Object.keys(data).length === 0) {
    return Promise.reject('Required fields are missing');
  }
  return getSingleOrder(id).then(prevOrderData => {
    const order = {
      date_updated: new Date()
    };

    if (data.products !== undefined) {
      order.products = parse.getArrayIfValid(data.products) || [];
    }

    if (data.paymentMethod !== undefined) {
      order.paymentMethod = parse.getObjectIDIfValid(data.paymentMethod);
    }

    if (data.customer !== undefined) {
      order.customer = parse.getObjectIDIfValid(data.customer);
    }
    
    if (data.shippingAddress !== undefined) {
      order.shippingAddress = data.shippingAddress;
    }

    if (data.enabled !== undefined) {
      order.enabled = parse.getBooleanIfValid(data.enabled, true);
    }

    return order;
  });
}

const updateOrder = (id, data) => {
  if (!ObjectID.isValid(id)) {
    return Promise.reject('Invalid identifier');
  }
  const orderID = new ObjectID(id);

  return getValidDocumentForUpdate(id, data).then(order =>
    collection()
      .updateOne({ _id: orderID }, { $set: order })
      .then(res => getSingleOrder(id))
  );
}

const addOrder = data => {
  return getValidDocumentForInsert(data).then(order =>
    collection()
      .insertMany([order])
      .then(res => getSingleOrder(res.ops[0]._id.toString()))
  );
}

const deleteOrder = id => {
  if (!ObjectID.isValid(id)) {
    return Promise.reject('Invalid identifier');
  }
  const objectID = new ObjectID(id);
  return collection()
    .deleteOne({ _id: objectID })
    .then(deleteResponse => deleteResponse.deletedCount > 0);
}

module.exports = {
  addOrder,
  updateOrder,
  deleteOrder,
  getOrders,
  getSingleOrder
};
