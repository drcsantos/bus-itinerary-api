
const mongo = require('../lib/mongo');
const parse = require('../lib/parse');
const utils = require('../lib/utils');
const ObjectID = require('mongodb').ObjectID;

const DEFAULT_SORT = { enabled: -1, title: 1 };

const collection = () => mongo.db().collection('products');

const getValidDocumentForInsert = data => {
  const product = {
    date_created: new Date()
  };

  product.title = parse.getString(data.title);
  product.description = parse.getString(data.description);
  product.price = parse.getNumberIfPositive(data.price) || 0;
  product.images = parse.getArrayIfValid(data.images) || [];
  product.enabled = parse.getBooleanIfValid(data.enabled, true);

  return Promise.resolve(product);
}

const getFilter = (params = {}) => {
  const filter = {};
  const id = parse.getObjectIDIfValid(params.id);
  const enabled = parse.getString(params.enabled);
  if (id) {
    filter._id = id;
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

const getProducts = async (params = {}) => {
  const filter = getFilter(params);
  const sortQuery = getSortQuery(params);
  const projection = utils.getProjectionFromFields(params.fields);
  const products = await collection()
    .find(filter, { projection })
    .sort(sortQuery)
    .toArray();

  return products.map(product => {
    if (product) {
      product.id = product._id.toString();
      product._id = undefined;
    }

    return product;
  });
}

const getSingleProduct = id => {
  if (!ObjectID.isValid(id)) {
    return Promise.reject('Invalid identifier');
  }
  return getProducts({ id }).then(products =>
    products.length > 0 ? products[0] : null
  );
}

const getValidDocumentForUpdate = (id, data) => {
  if (Object.keys(data).length === 0) {
    return Promise.reject('Required fields are missing');
  }
  return getSingleProduct(id).then(prevProductData => {
    const product = {
      date_updated: new Date()
    };

    if (data.title !== undefined) {
      product.title = parse.getString(data.title);
    }

    if (data.description !== undefined) {
      product.description = parse.getString(data.description);
    }

    if (data.price !== undefined) {
      product.price = parse.getNumberIfPositive(data.price) || 0;
    }

    if (data.images !== undefined) {
      product.images = parse.getArrayIfValid(data.images) || [];
    }

    if (data.enabled !== undefined) {
      product.enabled = parse.getBooleanIfValid(data.enabled, true);
    }

    return product;
  });
}

const updateProduct = (id, data) => {
  if (!ObjectID.isValid(id)) {
    return Promise.reject('Invalid identifier');
  }
  const productID = new ObjectID(id);

  return getValidDocumentForUpdate(id, data).then(product =>
    collection()
      .updateOne({ _id: productID }, { $set: product })
      .then(res => getSingleProduct(id))
  );
}

const addProduct = data => {
  return getValidDocumentForInsert(data).then(product =>
    collection()
      .insertMany([product])
      .then(res => getSingleProduct(res.ops[0]._id.toString()))
  );
}

const deleteProduct = id => {
  if (!ObjectID.isValid(id)) {
    return Promise.reject('Invalid identifier');
  }
  const objectID = new ObjectID(id);
  return collection()
    .deleteOne({ _id: objectID })
    .then(deleteResponse => deleteResponse.deletedCount > 0);
}

module.exports = {
  addProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getSingleProduct
};
