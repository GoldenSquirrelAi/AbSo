
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const parseCSV = () => {
    try {
        const filePath = path.join(__dirname, '../test_data.csv');
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.warn("⚠️ test_data.csv not found.");
            return [];
        }

        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split('\n').filter(l => l.trim().length > 0);
        
        // Skip header
        const data = lines.slice(1).map(line => {
            // Handle CSV parsing including quoted strings
            const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            const cols = matches || line.split(',');
            
            const clean = (val) => val ? val.replace(/^"|"$/g, '').trim() : '';
            
            // Map based on the structure: 
            // 0:First, 1:Last, 7:FullAddress, 8:Phone
            return {
                firstName: clean(cols[0]),
                lastName: clean(cols[1]),
                address: clean(cols[7]) || `${clean(cols[2])}, ${clean(cols[4])} ${clean(cols[5])} ${clean(cols[6])}`,
                phone: clean(cols[8])
            };
        });
        return data;
    } catch (e) {
        console.error("Error parsing mock CSV:", e);
        return [];
    }
};

const generateMockData = () => {
    const rawData = parseCSV();
    if (rawData.length < 30) {
        console.warn("Not enough CSV data to generate full mock set.");
        return { users: [], orders: [], blocks: [] };
    }

    // 1. Buyers (First 20 records)
    const buyers = rawData.slice(0, 20).map((r, i) => ({
        id: `user::buyer-${i + 1}`,
        name: `${r.firstName} ${r.lastName}`,
        role: 'buyer',
        email: `${r.firstName.toLowerCase()}.${r.lastName.toLowerCase()}@example.com`,
        phone: r.phone,
        address: r.address,
        // Simulate lat/lng around Las Vegas center
        coordinates: {
            lat: 36.16 + (Math.random() * 0.12 - 0.06),
            lng: -115.14 + (Math.random() * 0.12 - 0.06)
        },
        stats: {
            rating: 5.0,
            deliveries: Math.floor(Math.random() * 10)
        }
    }));

    // 2. Drivers (Next 10 records)
    const drivers = rawData.slice(20, 30).map((r, i) => ({
        id: `user::driver-${i + 1}`,
        name: `${r.firstName} ${r.lastName}`,
        role: 'driver',
        email: `driver.${r.lastName.toLowerCase()}@abso.auction`,
        phone: r.phone,
        address: r.address,
        coordinates: {
            lat: 36.16 + (Math.random() * 0.12 - 0.06),
            lng: -115.14 + (Math.random() * 0.12 - 0.06)
        },
        stats: {
            rating: parseFloat((4.2 + Math.random() * 0.8).toFixed(1)), // 4.2 - 5.0
            deliveries: Math.floor(50 + Math.random() * 500),
            earnings: Math.floor(Math.random() * 2000)
        }
    }));

    // 3. Generate Orders linked to Buyers
    const orders = [];
    const statuses = ['Pending', 'Scheduled', 'Ready for Pickup', 'In Transit', 'Delivered'];
    
    buyers.forEach((buyer, idx) => {
        // Each buyer has 1-3 orders
        const count = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < count; j++) {
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            orders.push({
                id: `INV-${10000 + (idx * 100) + j}`,
                customerName: buyer.name,
                auctionHouse: 'Nellis Auction (NLV)',
                pickupLocation: 'Nellis Auction (NLV)',
                dropoffAddress: buyer.address,
                items: Array(Math.floor(Math.random() * 4) + 1).fill(null).map((_, k) => ({
                    id: `item-${k}`,
                    title: `Lot #${Math.floor(Math.random()*9000)} - Home Goods`,
                    lotNumber: `${Math.floor(Math.random()*9000)}`,
                    dimensions: Math.random() > 0.85 ? 'Oversized' : 'Standard',
                    quantity: 1
                })),
                status: status,
                cost: 20 + Math.random() * 30,
                coordinates: buyer.coordinates,
                scheduledDate: status !== 'Pending' ? 'Today, 8:00 AM - 1:00 PM' : undefined,
                isTest: true
            });
        }
    });

    // 4. Create Active Blocks for first 3 drivers
    const blocks = [];
    const activeDrivers = drivers.slice(0, 3);
    
    activeDrivers.forEach((driver, idx) => {
        // Take some orders that are 'In Transit' or make them 'In Transit'
        const driverOrders = orders.filter((o, i) => i % 3 === idx && o.status !== 'Delivered').slice(0, 4);
        
        // Update order status to match block
        driverOrders.forEach(o => o.status = 'In Transit');

        blocks.push({
            id: `BLK-${Date.now()}-${idx}`,
            driverId: driver.id,
            startTime: '08:00 AM',
            endTime: '12:00 PM',
            region: ['North Las Vegas', 'Summerlin', 'Henderson'][idx],
            totalPay: 85 + Math.floor(Math.random() * 40),
            status: 'active',
            orderIds: driverOrders.map(o => o.id),
            routeEfficiency: 85 + Math.floor(Math.random() * 15)
        });
    });

    // Create some open blocks
    blocks.push({
        id: `BLK-OPEN-1`,
        startTime: '1:00 PM',
        endTime: '5:00 PM',
        region: 'Sunrise Manor',
        totalPay: 64.00,
        status: 'open',
        orderIds: [],
        routeEfficiency: 90
    });

    console.log(`✅ Mock Data Generated: ${buyers.length} Buyers, ${drivers.length} Drivers, ${orders.length} Orders`);

    return { 
        users: [...buyers, ...drivers], 
        orders, 
        blocks 
    };
};

module.exports = { generateMockData };
