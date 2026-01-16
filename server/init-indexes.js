
const { getCluster } = require('./services/database.service');
const config = require('./config/couchbase');

/**
 * Ensures all required Global Secondary Indexes (GSI) exist.
 * Essential for N1QL queries to work efficiently.
 */
const ensureIndexes = async () => {
    const cluster = getCluster();
    const { bucketName, scopeName } = config;
    const target = `\`${bucketName}\`.\`${scopeName}\``;

    const indexes = [
        // USERS Indexes
        `CREATE PRIMARY INDEX IF NOT EXISTS idx_users_primary ON ${target}.\`users\``,
        `CREATE INDEX IF NOT EXISTS idx_users_role ON ${target}.\`users\`(role)`,
        `CREATE INDEX IF NOT EXISTS idx_users_type ON ${target}.\`users\`(type)`,
        
        // ORDERS Indexes
        `CREATE PRIMARY INDEX IF NOT EXISTS idx_orders_primary ON ${target}.\`orders\``,
        `CREATE INDEX IF NOT EXISTS idx_orders_status ON ${target}.\`orders\`(status)`,
        `CREATE INDEX IF NOT EXISTS idx_orders_customer ON ${target}.\`orders\`(customerName)`,
        
        // BLOCKS Indexes
        `CREATE PRIMARY INDEX IF NOT EXISTS idx_blocks_primary ON ${target}.\`blocks\``,
        `CREATE INDEX IF NOT EXISTS idx_blocks_status ON ${target}.\`blocks\`(status)`
    ];

    console.log('🔍 Checking Index Health...');
    
    for (const query of indexes) {
        try {
            await cluster.query(query);
            // Logging shortened version of query for readability
            const indexName = query.split('ON')[0].replace('CREATE PRIMARY INDEX IF NOT EXISTS', 'Primary:').replace('CREATE INDEX IF NOT EXISTS', 'Index:');
            console.log(`   ✅ Verified ${indexName}`);
        } catch (err) {
            console.error(`   ❌ Index Error [${query}]:`, err.message);
        }
    }
    console.log('🛡️  Database Indexing Complete.');
};

module.exports = ensureIndexes;
