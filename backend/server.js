
// ===== ABC Books Backend Server =====
// Using MySQL Database with Enhanced Security

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

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

// ===== Security Middleware =====
// Apply security headers to all responses
app.use(securityHeaders);

// Request logging for monitoring
app.use(requestLogger);

// Rate limiting - 100 requests per 15 minutes per IP
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
}));

// Stricter rate limit for auth endpoints (prevent brute force)
app.use('/api/auth', rateLimit({
    windowMs: 15 * 60 * 1000,
    maxRequests: 20,
    message: 'Too many login attempts. Please try again in 15 minutes.'
}));

// CORS Configuration
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // List of allowed origins
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

        // Allow any Vercel domain
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

// Body parsing with size limit (prevent large payload attacks)
app.use(express.json({ limit: '10mb' }));

// Input sanitization for all requests
app.use(sanitizeInput);

// MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'abc_books',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
});

// SQL Tagged Template Helper for MySQL
const sql = async (strings, ...params) => {
    const query = strings.join('?');
    try {
        const [rows] = await pool.execute(query, params);
        return rows;
    } catch (error) {
        console.error('❌ SQL Error:', error.message);
        throw error;
    }
};

// Make sql available to routes
app.use((req, res, next) => {
    req.sql = sql;
    req.db = pool;
    next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'ABC Books API v2.0 (Verified) is running!' });
});

// Maintenance Route - Verify All Users (admin only)
app.get('/api/verify-all-users', authenticateAdmin, async (req, res) => {
    try {
        // MySQL doesn't support RETURNING, so we just update and return success
        const result = await req.sql`UPDATE users SET is_verified = TRUE WHERE is_verified = FALSE`;
        res.json({
            success: true,
            message: `✅ Successfully verified users. Affect rows: ${result.affectedRows}`,
            affectedRows: result.affectedRows
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

// Serve frontend: static files + index.html at root
const rootDir = path.join(__dirname, '..');

// Serve favicon.ico from favicon.svg (prevents 404)
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
        console.log(`📚 Database: MySQL`);
    });
}


module.exports = app;
