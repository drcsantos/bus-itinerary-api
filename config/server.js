// config used by server side only
const dbHost = process.env.DB_HOST || '127.0.0.1';
const dbPort = process.env.DB_PORT || 27017;
const dbName = process.env.DB_NAME || 'bus-itinerary';
const dbUser = process.env.DB_USER || '';
const dbPass = process.env.DB_PASS || '';
const dbCredential =
    dbUser.length > 0 || dbPass.length > 0 ? `${dbUser}:${dbPass}@` : '';

const dbUrl =
    process.env.DB_URL || `mongodb://${dbCredential}${dbHost}:${dbPort}/${dbName}`;

module.exports = {
    apiBaseUrl: process.env.API_BASE_URL || `http://localhost:4000/api/`,
    apiListenPort: process.env.PORT || 4000,
    mongodbServerUrl: dbUrl,
    // assest
    assetServer: {
        type: process.env.ASSETS_TYPE || 'local', // 'local' | 's3'
        domain: process.env.ASSETS_BASE_URL || 'http://localhost:4000', // add localBasePath to S3 domain
        // S3 Config
        bucket: 's3'
    },
    // key to sign tokens
    jwtSecretKey: process.env.JWT_SECRET_KEY || '123456',
    // UI language
    language: process.env.LANGUAGE || 'en',
    developerMode: process.env.DEVELOPER_MODE || true
};