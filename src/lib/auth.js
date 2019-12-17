const jwt = require('jsonwebtoken');
const settings = require('./settings');
const cert = settings.jwtSecretKey;

module.exports = {
    encodeUserLoginAuth: userId => jwt.sign({ userId }, cert),
    decodeUserLoginAuth: token => {
        try {
			return jwt.verify(token, cert);
		} catch (error) {
			return error;
		}
    },
    encodeUserPassword: token => jwt.sign({ password: token }, cert),
    decodeUserPassword: token => jwt.verify(token, cert)
}
