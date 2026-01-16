
// -------------------------------------------------------------------------
// Credentials updated for Capella Connection
// -------------------------------------------------------------------------

const config = {
    // 1. Enter your Database Username
    username: 'abso_admin', 
    
    // 2. Enter your Database Password
    password: 'fy6^icC0!@d4', 

    // 3. Connection Settings
    clusterConnStr: 'couchbases://kjwgxqnkpfir0u3f.data.cloud.couchbase.com',
    bucketName: 'abso_logistics',
    scopeName: 'core',

    // Timeouts (in milliseconds)
    kvTimeout: 10000,
    queryTimeout: 75000,
};

module.exports = config;