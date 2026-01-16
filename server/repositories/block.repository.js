
const { getCollection, getCluster } = require('../services/database.service');
const config = require('../config/couchbase');

class BlockRepository {
    get collection() {
        return getCollection('blocks');
    }

    async upsert(block) {
        const key = block.id.startsWith('block::') ? block.id : `block::${block.id}`;
        const doc = { 
            ...block, 
            type: 'block', 
            updatedAt: new Date().toISOString() 
        };
        await this.collection.upsert(key, doc);
        return doc;
    }

    async getAll() {
        const query = `
            SELECT t.* 
            FROM \`${config.bucketName}\`.\`${config.scopeName}\`.\`blocks\` t 
            WHERE t.type = 'block'
        `;
        const result = await getCluster().query(query);
        return result.rows;
    }
}

module.exports = new BlockRepository();
