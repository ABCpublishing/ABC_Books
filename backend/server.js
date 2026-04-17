
// ===== ABC Books Backend Server =====
// Multi-Database PostgreSQL Architecture (Neon DB)
// 4 Databases: English Books, Urdu Books, Arabic Books, Admin/General

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// Import routes
const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const ordersRoutes = require('./routes/orders');
const usersRoutes = require('./routes/users');
const cartRoutes = require('./routes/cart');
const wishlistRoutes = require('./routes/wishlist');
const paymentRoutes = require('./routes/payment');
const categoriesRoutes = require('./routes/categories');

// Import security middleware
const {
    securityHeaders,
    sanitizeInput,
    rateLimit,
    requestLogger,
    authenticateAdmin
} = require('./middleware/security');

const app = express();
const PORT = process.env.PORT || 3001;

// ===== Multi-Database Connection Pools =====
// Each pool connects to a separate Neon PostgreSQL database

function createPool(connectionString, name) {
    if (!connectionString) {
        console.warn(`⚠️ No connection string for ${name} database`);
        return null;
    }
    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false },
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000
    });
    pool.on('error', (err) => {
        console.error(`❌ Unexpected error on ${name} pool:`, err.message);
    });
    console.log(`✅ ${name} database pool created`);
    return pool;
}

const pools = {
    admin:   createPool(process.env.DATABASE_URL_ADMIN,   'Admin'),
    english: createPool(process.env.DATABASE_URL_ENGLISH, 'English'),
    urdu:    createPool(process.env.DATABASE_URL_URDU,    'Urdu'),
    arabic:  createPool(process.env.DATABASE_URL_ARABIC,  'Arabic')
};

// ===== PostgreSQL Tagged Template Query Helper =====
// Usage: await db.query`SELECT * FROM users WHERE id = ${userId}`
// Converts tagged template to parameterized query ($1, $2, etc.)

function createQueryHelper(pool) {
    if (!pool) {
        return async () => { throw new Error('Database pool not configured'); };
    }

    const queryFn = async (strings, ...values) => {
        // Build parameterized query: replace ${val} positions with $1, $2, etc.
        let query = '';
        strings.forEach((str, i) => {
            query += str;
            if (i < values.length) {
                query += `$${i + 1}`;
            }
        });

        try {
            const result = await pool.query(query, values);
            // Return rows array (compatible with existing code that expects array)
            // Attach rowCount and other metadata for INSERT/UPDATE/DELETE
            const rows = result.rows;
            rows.rowCount = result.rowCount;
            // For INSERT RETURNING, the inserted row is in rows[0]
            return rows;
        } catch (error) {
            console.error('❌ SQL Error:', error.message);
            console.error('   Query:', query);
            throw error;
        }
    };

    return queryFn;
}

// Create query helpers for each database
const db = {
    admin:   createQueryHelper(pools.admin),
    english: createQueryHelper(pools.english),
    urdu:    createQueryHelper(pools.urdu),
    arabic:  createQueryHelper(pools.arabic),
    pools    // Expose raw pools if needed
};

// Helper to get the right book database based on language/category
db.getBookDb = (language) => {
    if (!language) return null;
    const lang = language.toLowerCase().trim();
    if (lang === 'english') return db.english;
    if (lang === 'urdu')    return db.urdu;
    if (lang === 'arabic')  return db.arabic;
    return null;
};

// Helper to get all book databases (for aggregate queries)
db.getAllBookDbs = () => {
    const dbs = [];
    if (pools.english) dbs.push({ name: 'English', query: db.english });
    if (pools.urdu)    dbs.push({ name: 'Urdu',    query: db.urdu });
    if (pools.arabic)  dbs.push({ name: 'Arabic',  query: db.arabic });
    return dbs;
};

// ===== Security Middleware =====
app.use(securityHeaders);
app.use(requestLogger);

// Rate limiting - 100 requests per 15 minutes per IP
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
}));

// Stricter rate limit for auth endpoints
app.use('/api/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 20,
    message: 'Too many login attempts. Please try again in 15 minutes.'
}));

// CORS Configuration
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:5000',
            'http://127.0.0.1:5000',
            'http://localhost:5500',
            'http://127.0.0.1:5500',
            'http://localhost:8080',
            'http://127.0.0.1:8080',
            'http://localhost:3001',
            'http://127.0.0.1:3001',
            'https://www.abcbooks.store',
            'https://abcbooks.store',
            'http://www.abcbooks.store',
            'http://abcbooks.store'
        ];

        if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing with size limit
app.use(express.json({ limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// ===== Make database helpers available to all routes =====
app.use((req, res, next) => {
    req.db = db;
    // Legacy compatibility: req.sql points to admin db (used by auth, users, orders, etc.)
    req.sql = db.admin;
    next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    const status = {};
    for (const [name, pool] of Object.entries(pools)) {
        try {
            if (pool) {
                await pool.query('SELECT 1');
                status[name] = 'connected';
            } else {
                status[name] = 'not configured';
            }
        } catch (e) {
            status[name] = 'error: ' + e.message;
        }
    }
    res.json({
        status: 'ok',
        message: 'ABC Books API v3.0 (Multi-DB PostgreSQL) is running!',
        databases: status
    });
});

// Maintenance Route - Verify All Users (admin only)
app.get('/api/verify-all-users', authenticateAdmin, async (req, res) => {
    try {
        const result = await req.db.admin`
            UPDATE users SET is_verified = TRUE WHERE is_verified = FALSE
        `;
        res.json({
            success: true,
            message: `✅ Successfully verified users. Affected rows: ${result.rowCount}`,
            affectedRows: result.rowCount
        });
    } catch (error) {
        console.error('Verification failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/categories', categoriesRoutes);

// Serve frontend
const rootDir = path.join(__dirname, '..');

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(rootDir, 'favicon.svg'));
});

app.use(express.static(rootDir));
app.get('/', (req, res) => res.sendFile(path.join(rootDir, 'index.html')));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server if run directly
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 ABC Books API running on http://localhost:${PORT}`);
        console.log(`📖 Open the site in your browser: http://localhost:${PORT}`);
        console.log(`📚 Database: Multi-DB PostgreSQL (Neon)`);
    });
}


module.exports = app;
