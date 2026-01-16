const couchbase = require('couchbase');
require('dotenv').config();

let cluster = null;
let bucket = null;
let scope = null;

/**
 * Establishes connection to Couchbase Capella
 */
async function connectToDatabase() {
    if (cluster) return { cluster, bucket, scope };

    const clusterConnStr = process.env.DB_CONN_STR;
    const username = process.env.DB_USERNAME;
    const password = process.env.DB_PASSWORD;
    const bucketName = process.env.DB_BUCKET || 'abso_logistics';

    if (!clusterConnStr || !username || !password) {
        throw new Error('Missing DB credentials in .env file');
    }

    try {
        console.log('🔵 Connecting to Couchbase Capella...');
        cluster = await couchbase.connect(clusterConnStr, {
            username: username,
            password: password,
            configProfile: 'wanDevelopment', // Optimized for cloud connections
        });

        bucket = cluster.bucket(bucketName);
        // Wait for bucket to be ready
        await bucket.onConnect();
        
        // using default scope or a specific 'core' scope if you set it up in Capella
        scope = bucket.scope('core'); 
        
        console.log('🟢 Connected to Couchbase successfully.');
        return { cluster, bucket, scope };
    } catch (error) {
        console.error('🔴 Database connection failed:', error);
        process.exit(1);
    }
}

/**
 * Helper to get a collection reference
 */
function getCollection(collectionName) {
    if (!scope) throw new Error('Database not connected. Call connectToDatabase() first.');
    return scope.collection(collectionName);
}

module.exports = {
    connectToDatabase,
    getCollection
};