
const { getCollection, getCluster } = require('../services/database.service');
const config = require('../config/couchbase');

class UserRepository {
    get collection() {
        return getCollection('users');
    }

    async upsert(user) {
        const key = user.id.startsWith('user::') ? user.id : `user::${user.id}`;
        const doc = { 
            ...user, 
            type: 'user', 
            updatedAt: new Date().toISOString() 
        };
        await this.collection.upsert(key, doc);
        return doc;
    }

    async getAll(limit = 200) {
        const query = `
            SELECT t.* 
            FROM \`${config.bucketName}\`.\`${config.scopeName}\`.\`users\` t 
            WHERE t.type = 'user' 
            LIMIT $1
        `;
        const result = await getCluster().query(query, { parameters: [limit] });
        return result.rows;
    }

    async getByRole(role) {
        const query = `
            SELECT t.* 
            FROM \`${config.bucketName}\`.\`${config.scopeName}\`.\`users\` t 
            WHERE t.type = 'user' AND t.role = $1
        `;
        const result = await getCluster().query(query, { parameters: [role] });
        return result.rows;
    }
}

module.exports = new UserRepository();
