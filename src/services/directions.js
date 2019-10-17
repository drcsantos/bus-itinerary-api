
const mongo = require('../lib/mongo');
const parse = require('../lib/parse');
const utils = require('../lib/utils');
const ObjectID = require('mongodb').ObjectID;

const DEFAULT_SORT = { orientation: -1, title: 1 };

const collection = () => mongo.db().collection('directions');

const getValidDocumentForInsert = data => {
  const direction = {
    date_created: new Date()
  };

  direction.name = parse.getString(data.name).toUpperCase();
  direction.title = parse.getString(data.title);
  direction.orientation = parse.getString(data.orientation).toLowerCase();
  direction.city = parse.getString(data.city);
  direction.enabled = parse.getBooleanIfValid(data.enabled, true);
  direction.pathPoints = parse.getArrayIfValid(data.pathPoints) || [];
  direction.wayPoints = parse.getArrayIfValid(data.wayPoints) || [];
  direction.center = utils.getAverageFromPoints(direction.wayPoints);
  direction.length = utils.getRouteLength(direction.pathPoints, false);

  return Promise.resolve(direction);
}

const getFilter = (params = {}) => {
  const filter = {};
  const id = parse.getObjectIDIfValid(params.id);
  const orientation = parse.getString(params.orientation);
  const enabled = parse.getString(params.enabled);
  if (id) {
    filter._id = id;
  }
  if (orientation) {
    filter.orientation = orientation;
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

const getDirections = async (params = {}) => {
  const filter = getFilter(params);
  const sortQuery = getSortQuery(params);
  const projection = utils.getProjectionFromFields(params.fields);
  const directions = await collection()
    .find(filter, { projection: Object.keys(projection).length === 0 ? { wayPoints: 0, pathPoints: 0 } : projection })
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

const getValidDocumentForUpdate = (id, data) => {
  if (Object.keys(data).length === 0) {
    return Promise.reject('Required fields are missing');
  }
  return getSingleDirection(id).then(prevDirectionData => {
    const direction = {
      date_updated: new Date()
    };

    if (data.name !== undefined) {
      direction.name = parse.getString(data.name).toUpperCase();
    }

    if (data.title !== undefined) {
      direction.title = parse.getString(data.title);
    }

    if (data.orientation !== undefined) {
      direction.orientation = parse.getString(data.orientation).toLowerCase();
    }

    if (data.city !== undefined) {
      direction.city = parse.getString(data.city);
    }

    if (data.enabled !== undefined) {
      direction.enabled = parse.getBooleanIfValid(data.enabled, true);
    }

    if (data.pathPoints !== undefined) {
      direction.pathPoints = parse.getArrayIfValid(data.pathPoints) || [];
      direction.length = utils.getRouteLength(direction.pathPoints, false);
    }

    if (data.wayPoints !== undefined) {
      direction.wayPoints = parse.getArrayIfValid(data.wayPoints) || [];
      direction.center = utils.getAverageFromPoints(direction.wayPoints);
    }

    return direction;
  });
}

const updateDirection = (id, data) => {
  if (!ObjectID.isValid(id)) {
    return Promise.reject('Invalid identifier');
  }
  const directionID = new ObjectID(id);

  return getValidDocumentForUpdate(id, data).then(direction =>
    collection()
      .updateOne({ _id: directionID }, { $set: direction })
      .then(res => getSingleDirection(id))
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
  updateDirection,
  deleteDirection,
  getDirections,
  getSingleDirection
};
