//const routes = require('../data/all.json');
const mongo = require('../lib/mongo');
const parse = require('../lib/parse');
const utils = require('../lib/utils');
const ObjectID = require('mongodb').ObjectID;

const DEFAULT_SORT = { orientation: -1, title: 1 };

const collection = () => mongo.db().collection('directions');

const getValidDocumentForInsert = data => {
  const direction = {
    date_created: new Date(),
    ...data
  };

  return Promise.resolve(direction);
}

const getFilter = (params = {}) => {
  const filter = {};
  const id = parse.getObjectIDIfValid(params.id);
  const orientation = parse.getString(params.orientation);
  if (id) {
    filter._id = id;
  }
  if (orientation) {
    filter.orientation = orientation;
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

const getDirections = async (params = {}) => {
  const filter = getFilter(params);
  const sortQuery = getSortQuery(params);
  const projection = utils.getProjectionFromFields(params.fields);
  const directions = await collection()
    .find(filter, { projection })
    .sort(sortQuery)
    .toArray();

  return directions.map(direction => {
    if (direction) {
      direction.id = direction._id.toString();
      direction._id = undefined;
    }

    return direction;
  });
}

const getSingleDirection = id => {
  if (!ObjectID.isValid(id)) {
    return Promise.reject('Invalid identifier');
  }
  return getDirections({ id }).then(directions =>
    directions.length > 0 ? directions[0] : null
  );
}

const addDirection = data => {
  return getValidDocumentForInsert(data).then(direction =>
    collection()
      .insertMany([direction])
      .then(res => getSingleDirection(res.ops[0]._id.toString()))
  );
}

const deleteDirection = id => {
  if (!ObjectID.isValid(id)) {
    return Promise.reject('Invalid identifier');
  }
  const objectID = new ObjectID(id);
  return collection()
    .deleteOne({ _id: objectID })
    .then(deleteResponse => deleteResponse.deletedCount > 0);
}

module.exports = {
  addDirection,
  deleteDirection,
  getDirections,
  getSingleDirection
};
