
const { getCollection, getCluster } = require('../services/database.service');
const config = require('../config/couchbase');

class OrderRepository {
    get collection() {
        return getCollection('orders');
    }

    async upsert(order) {
        const key = order.id.startsWith('order::') ? order.id : `order::${order.id}`;
        const doc = { 
            ...order, 
            type: 'order', 
            updatedAt: new Date().toISOString() 
        };
        await this.collection.upsert(key, doc);
        return doc;
    }

    async getAll() {
        const query = `
            SELECT t.* 
            FROM \`${config.bucketName}\`.\`${config.scopeName}\`.\`orders\` t 
            WHERE t.type = 'order'
        `;
        const result = await getCluster().query(query);
        return result.rows;
    }

    async getById(id) {
        const key = id.startsWith('order::') ? id : `order::${id}`;
        try {
            const result = await this.collection.get(key);
            return result.content;
        } catch (e) {
            return null;
        }
    }
}

module.exports = new OrderRepository();
