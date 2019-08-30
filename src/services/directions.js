const routes = require('../data/all.json');
const db = require('../lib/mongo');

module.exports = {
  getRoutes: () => {
    return routes;
  }
};
