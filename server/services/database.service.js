
const couchbase = require('couchbase');
const config = require('../config/couchbase');
const path = require('path');
const fs = require('fs');

let cluster = null;
let bucket = null;
let scope = null;
let connected = false;

/**
 * Initializes the Couchbase connection as a Singleton.
 * Uses 'wanDevelopment' profile for optimized cloud connectivity.
 */
const connect = async () => {
    if (cluster && connected) return { cluster, bucket, scope };

    // Check if user has updated the password in config/couchbase.js
    if (config.password === 'YOUR_PASSWORD_HERE') {
        console.warn("⚠️  [Attention] Default password detected in server/config/couchbase.js");
        console.warn("   Please open that file and enter your actual DB password to connect.");
        console.warn("   Running in Offline Mock Mode for now.");
        throw new Error("Credentials not configured");
    }

    try {
        console.log('🔵 Initializing Couchbase Capella Connection...');
        
        // Define connection options
        const connectOptions = {
            username: config.username,
            password: config.password,
            configProfile: 'wanDevelopment', // Cloud-optimized settings
            timeouts: {
                kvTimeout: config.kvTimeout,
                queryTimeout: config.queryTimeout
            }
        };

        // Check for certificate.pem and add to trust store if it exists
        const certPath = path.resolve(__dirname, '../certificate.pem');
        if (fs.existsSync(certPath)) {
            console.log(`   🔐 Found security certificate at: ${certPath}`);
            connectOptions.trustStorePath = certPath;
        } else {
            console.log(`   ℹ️ No certificate found at ${certPath}. Proceeding without explicit trust store.`);
        }

        // Sanitize connection string if needed
        let connStr = config.clusterConnStr;
        // Ensure we are using correct protocol for Capella
        if (!connStr.includes('://')) connStr = 'couchbases://' + connStr;

        cluster = await couchbase.connect(connStr, connectOptions);

        bucket = cluster.bucket(config.bucketName);
        
        // Verify connection by waiting for the bucket to be ready
        await bucket.onConnect();
        
        scope = bucket.scope(config.scopeName);
        connected = true;
        
        console.log(`🟢 Connected to Bucket: "${config.bucketName}" | Scope: "${config.scopeName}"`);
        return { cluster, bucket, scope };
    } catch (err) {
        console.error('🔴 Database Connection Failed:', err.message);
        connected = false;
        throw err; // Propagate up to server.js to handle soft-fail
    }
};

const getCollection = (collectionName) => {
    if (!scope) throw new Error('Database not initialized. Call connect() first.');
    return scope.collection(collectionName);
};

const getScope = () => {
    if (!scope) throw new Error('Database not initialized. Call connect() first.');
    return scope;
};

const getCluster = () => {
    if (!cluster) throw new Error('Database not initialized. Call connect() first.');
    return cluster;
};

const isConnected = () => connected;

const close = async () => {
    if (cluster) {
        await cluster.close();
        connected = false;
        console.log('🟡 Couchbase connection closed.');
    }
};

module.exports = { connect, getCollection, getScope, getCluster, close, isConnected };
