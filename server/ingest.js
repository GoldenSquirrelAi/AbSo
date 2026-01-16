
const fs = require('fs');
const csv = require('csv-parser');
const { v4: uuidv4 } = require('uuid');
const { connect, close } = require('./services/database.service');
const userRepo = require('./repositories/user.repository');
const { geocodeAddress, delay } = require('./utils/geocoder');

async function ingestUsers() {
    try {
        // 1. Connect to Database
        await connect();

        const usersToInsert = [];
        console.log('📂 Reading server/users.csv...');

        const parsePromise = new Promise((resolve, reject) => {
            fs.createReadStream('server/users.csv')
                .on('error', (err) => {
                    if (err.code === 'ENOENT') {
                        console.error('❌ Error: server/users.csv not found! Please create it.');
                        process.exit(1);
                    }
                    reject(err);
                })
                .pipe(csv())
                .on('data', (row) => {
                    const firstName = row['FirstName']?.trim() || '';
                    const lastName = row['LastName']?.trim() || '';
                    const name = `${firstName} ${lastName}`.trim();

                    let address = row['Address City State Zip'];
                    if (!address || address.trim() === '') {
                        const street = row['Address'] || '';
                        const city = row['City'] || '';
                        const state = row['State'] || '';
                        const zip = row['Zipcode'] || '';
                        address = `${street}, ${city}, ${state} ${zip}`.trim();
                    }

                    const phone = row['Telephone number'] || '';
                    const role = (row['Role'] || 'Buyer').toLowerCase();
                    const email = row['Email'] || `user_${Math.floor(Math.random()*10000)}@example.com`;

                    if (name && address && address !== ', ,') {
                        usersToInsert.push({ name, address, phone, email, role });
                    }
                })
                .on('end', () => {
                    resolve();
                });
        });

        await parsePromise;
        console.log(`📊 Found ${usersToInsert.length} users in CSV. Starting processing...`);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < usersToInsert.length; i++) {
            const user = usersToInsert[i];
            console.log(`[${i + 1}/${usersToInsert.length}] Processing: ${user.name}...`);

            // Geocode using shared utility
            let coordinates = await geocodeAddress(user.address);
            if (!coordinates) {
                console.warn(`   ⚠️ Could not geocode "${user.address}". Using default LV coordinates.`);
            }

            const userId = `user::${uuidv4()}`;
            const userDoc = {
                id: userId,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                address: user.address,
                coordinates: coordinates || { lat: 36.1699, lng: -115.1398 },
                geoStatus: coordinates ? 'accurate' : 'fallback'
            };

            try {
                // Use Repository Layer
                await userRepo.upsert(userDoc);
                successCount++;
            } catch (err) {
                console.error(`❌ Failed to insert ${user.name}:`, err.message);
                failCount++;
            }

            // Delay for OSM API limits
            await delay(1100); 
        }

        console.log('-----------------------------------');
        console.log(`✅ Ingestion Complete.`);
        console.log(`Saved: ${successCount}`);
        console.log(`Failed: ${failCount}`);

    } catch (err) {
        console.error("Ingestion Script Failed:", err);
    } finally {
        await close();
    }
}

ingestUsers();
