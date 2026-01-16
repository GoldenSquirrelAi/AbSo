
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config(); // Ensure env vars are loaded early

// Services & Repositories
const { connect, isConnected } = require('./services/database.service');
const ensureIndexes = require('./init-indexes');
const userRepo = require('./repositories/user.repository');
const orderRepo = require('./repositories/order.repository');
const blockRepo = require('./repositories/block.repository');
const { geocodeAddress, delay } = require('./utils/geocoder');
const { generateMockData } = require('./utils/mockDataGenerator');
const config = require('./config/couchbase');

// AI Controller (Robust Import)
let aiController;
try {
    aiController = require('./controllers/ai.controller');
} catch (error) {
    console.warn("⚠️ AI Controller could not be loaded (Dependency missing or Config error). AI features will return fallback responses.");
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- Mock Store (In-Memory) ---
let mockStore = {
    users: [],
    orders: [],
    blocks: []
};

// --- Routes ---

// 1. Health Check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        db: isConnected() ? 'connected' : 'disconnected', 
        mode: isConnected() ? 'live' : 'mock',
        ai: aiController ? 'active' : 'disabled',
        timestamp: new Date() 
    });
});

// Middleware to serve Mock Data if DB is offline
const dataProvider = async (req, res, next) => {
    // If DB connected, proceed to normal route handlers (which assume DB usage)
    if (!isConnected()) {
        const path = req.path;
        
        if (req.method === 'GET') {
            if (path === '/api/users') return res.json(mockStore.users);
            if (path === '/api/orders') return res.json(mockStore.orders);
            if (path === '/api/blocks') return res.json(mockStore.blocks);
        }
        
        if (req.method === 'POST') {
             if (path === '/api/orders') {
                 const newOrder = { ...req.body, id: req.body.id || `INV-${Math.random()}` };
                 // Update or Add
                 const idx = mockStore.orders.findIndex(o => o.id === newOrder.id);
                 if (idx >= 0) mockStore.orders[idx] = newOrder;
                 else mockStore.orders.push(newOrder);
                 return res.status(201).json(newOrder);
             }
             if (path === '/api/blocks') {
                 const newBlock = { ...req.body, id: req.body.id || `BLK-${Date.now()}` };
                 const idx = mockStore.blocks.findIndex(b => b.id === newBlock.id);
                 if (idx >= 0) mockStore.blocks[idx] = newBlock;
                 else mockStore.blocks.push(newBlock);
                 return res.status(201).json(newBlock);
             }
        }
    }
    next();
};

app.use(dataProvider);

// 2. Users (GET)
app.get('/api/users', async (req, res) => {
    try {
        const users = await userRepo.getAll();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Orders (GET & POST)
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await orderRepo.getAll();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const order = req.body;
        if (!order.id) order.id = `INV-${Math.floor(Math.random() * 10000)}`;
        const savedOrder = await orderRepo.upsert(order);
        res.status(201).json({ message: 'Order saved', order: savedOrder });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 4. Blocks (GET & POST)
app.get('/api/blocks', async (req, res) => {
    try {
        const blocks = await blockRepo.getAll();
        res.json(blocks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/blocks', async (req, res) => {
    try {
        const block = req.body;
        if (!block.id) block.id = `BLK-${Date.now()}`;
        const savedBlock = await blockRepo.upsert(block);
        res.status(201).json({ message: 'Block saved', block: savedBlock });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. AI Routes (Secured Backend)
if (aiController) {
    app.post('/api/ai/analyze-block', aiController.analyzeBlockEfficiency);
    app.post('/api/ai/ops-report', aiController.generateDailyOpsReport);
    app.post('/api/ai/support-suggestion', aiController.generateSupportSuggestion);
} else {
    // Fallback if SDK missing
    const aiFallback = (req, res) => res.json({ text: "AI Service temporarily unavailable (Backend Config)." });
    app.post('/api/ai/analyze-block', aiFallback);
    app.post('/api/ai/ops-report', aiFallback);
    app.post('/api/ai/support-suggestion', aiFallback);
}

// 6. Admin Utilities
app.post('/api/admin/seed-orders', async (req, res) => {
    // If offline, just re-run mock generator
    if (!isConnected()) {
        mockStore = generateMockData();
        return res.json({ message: 'Offline Mock Data Refreshed', orders: mockStore.orders });
    }

    try {
        const users = await userRepo.getAll();
        if (users.length === 0) {
            return res.status(400).json({ message: 'No users found.' });
        }
        // ... (Database seeding logic would go here) ...
        res.json({ message: `Seeding implementation for DB pending.` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/admin/geocode-batch', async (req, res) => {
    try {
        const { addresses } = req.body;
        if (!addresses || !Array.isArray(addresses)) return res.status(400).json({ error: "Invalid payload." });
        
        if (addresses.length > 50) return res.status(400).json({ error: "Batch too large." });

        const results = [];
        console.log(`Processing batch geocode for ${addresses.length} items...`);

        for (const rawAddress of addresses) {
            const coordinates = await geocodeAddress(rawAddress);
            if (coordinates) {
                results.push({
                    id: `TEST-${uuidv4().slice(0,6)}`,
                    customerName: "Test Record",
                    auctionHouse: "Test Source",
                    pickupLocation: "Test Hub",
                    dropoffAddress: rawAddress,
                    coordinates: coordinates,
                    items: [{ id: "1", title: "Test Item", lotNumber: "000", dimensions: "Standard" }],
                    status: 'Pending',
                    cost: 0,
                    isTest: true 
                });
            }
            await delay(1100);
        }
        res.json(results);
    } catch (error) {
        console.error("Batch geocode failed", error);
        res.status(500).json({ error: error.message });
    }
});

// --- Server Boot Sequence ---
async function start() {
    try {
        console.log("---------------------------------------------------------");
        console.log("📦 AbSo Delivery Ops - Server Startup");
        console.log("---------------------------------------------------------");

        // Initialize Mock Data immediately so fallback is available
        console.log('⚡ Generating Local Mock Data (Fallback)...');
        mockStore = generateMockData();

        // 1. Start Listening IMMEDIATELY
        // This prevents "Failed to fetch" on frontend if DB is slow/fails
        app.listen(PORT, () => {
            console.log(`\n🚀 Server listening on port ${PORT}`);
            console.log(`   (API Ready. Serving Mock Data until DB connects)`);
        });

        // 2. Attempt DB Connection in Background
        if (config.password === 'YOUR_PASSWORD_HERE') {
            console.log("\n⚠️  OFFLINE MODE: Database credentials not configured.");
        } else {
            console.log("⏳ Attempting Database Connection...");
            try {
                await connect();
                await ensureIndexes();
                console.log("✅ LIVE MODE: Connected to Couchbase Capella.");
            } catch (dbErr) {
                console.warn("⚠️  CONNECTION FAILED: Could not reach Couchbase.");
                console.warn("   Serving Mock Data instead.");
                console.error("   Error:", dbErr.message);
            }
        }

    } catch (e) {
        console.error("🔥 Fatal Error during startup:", e);
        process.exit(1);
    }
}

start();
