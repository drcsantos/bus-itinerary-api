
const mongo = require('../lib/mongo');
const parse = require('../lib/parse');
const utils = require('../lib/utils');
const ObjectID = require('mongodb').ObjectID;

const DEFAULT_SORT = { name: 1 };

const collection = () => mongo.db().collection('users');

const getValidDocumentForInsert = data => {
  const user = {
    date_created: new Date()
  };

  user.name = parse.getString(data.name);
  user.email = parse.getString(data.email).toLowerCase();
  user.password = parse.getString(data.password);
  user.enabled = parse.getBooleanIfValid(data.enabled, true);

  return Promise.resolve(user);
}

const getFilter = (params = {}) => {
  const filter = {};
  const id = parse.getObjectIDIfValid(params.id);
  const email = parse.getString(params.email);
  const enabled = parse.getString(params.enabled);
  if (id) {
    filter._id = id;
  }
  if (email) {
    filter.email = email;
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

const getUsers = async (params = {}) => {
  const filter = getFilter(params);
  const sortQuery = getSortQuery(params);
  const projection = utils.getProjectionFromFields(params.fields);
  const users = await collection()
    .find(filter, { projection })
    .sort(sortQuery)
    .toArray();

  return users.map(user => {
    if (user) {
      user.id = user._id.toString();
      user._id = undefined;
    }

    return user;
  });
}

const getSingleUser = id => {
  if (!ObjectID.isValid(id)) {
    return Promise.reject('Invalid identifier');
  }
  return getUsers({ id }).then(users =>
    users.length > 0 ? users[0] : null
  );
}

const getValidDocumentForUpdate = (id, data) => {
  if (Object.keys(data).length === 0) {
    return Promise.reject('Required fields are missing');
  }
  return getSingleUser(id).then(prevUserData => {
    const user = {
      date_updated: new Date()
    };

    if (data.name !== undefined) {
      user.name = parse.getString(data.name);
    }

    if (data.email !== undefined) {
      user.email = parse.getString(data.email).toLowerCase();
    }

    if (data.password !== undefined) {
      user.password = parse.getString(data.password);
    }

    if (data.enabled !== undefined) {
      user.enabled = parse.getBooleanIfValid(data.enabled, true);
    }

    return user;
  });
}

const updateUser = (id, data) => {
  if (!ObjectID.isValid(id)) {
    return Promise.reject('Invalid identifier');
  }
  const userID = new ObjectID(id);

  return getValidDocumentForUpdate(id, data).then(user =>
    collection()
      .updateOne({ _id: userID }, { $set: user })
      .then(res => getSingleUser(id))
  );
}

const addUser = data => {
  return getValidDocumentForInsert(data).then(user =>
    collection()
      .insertMany([user])
      .then(res => getSingleUser(res.ops[0]._id.toString()))
  );
}

const deleteUser = id => {
  if (!ObjectID.isValid(id)) {
    return Promise.reject('Invalid identifier');
  }
  const objectID = new ObjectID(id);
  return collection()
    .deleteOne({ _id: objectID })
    .then(deleteResponse => deleteResponse.deletedCount > 0);
}

const login = (email, pass) => {
  return new Promise((resolve, reject) => {
    getUsers({
      email: email.toLowerCase(),
      enabled: true
    }).then(users => {
      const user = users[0];
      if (user && user.password === pass) {
        resolve({
          id: user.id,
          name: user.name,
          email: user.email
        });
      } else {
        reject(new Error("E-mail or Password invalid."));
      }
    }).catch(() => reject(new Error("E-mail or Password invalid.")));
  });
}

module.exports = {
  addUser,
  updateUser,
  deleteUser,
  getUsers,
  getSingleUser,
  login
};
