const winston = require('winston');
const url = require('url');
const MongoClient = require('mongodb');
const settings = require('./settings');

const mongodbConnection = settings.mongodbServerUrl;
const mongoPathName = url.parse(mongodbConnection).pathname;
const dbName = mongoPathName.substring(mongoPathName.lastIndexOf('/') + 1);

const RECONNECT_INTERVAL = 1000;
const CONNECT_OPTIONS = {
	reconnectTries: 3600,
	reconnectInterval: RECONNECT_INTERVAL,
	useNewUrlParser: true
};

const onClose = () => {
	winston.info('MongoDB connection was closed');
};

const onReconnect = () => {
	winston.info('MongoDB reconnected');
};

let _db = null;

const connect = () => {
	return new Promise((resolve, reject) => {
		MongoClient.connect(mongodbConnection, CONNECT_OPTIONS, (err, client) => {
			if (err) {
				winston.error(
					`MongoDB connection was failed: ${err.message}`,
					err.message
				);
				reject(err);
			} else {
				_db = client.db(dbName);
				_db.on('close', onClose);
				_db.on('reconnect', onReconnect);
				winston.info('MongoDB connected successfully');

				resolve(_db);
			}
		});
	});
};

const db = () => _db;

module.exports = {
	connect,
	db
};
