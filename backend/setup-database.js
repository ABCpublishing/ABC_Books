// ===== Database Setup Script (PostgreSQL Multi-DB Version) =====
// Creates tables in all 4 Neon PostgreSQL databases
// Run: node setup-database.js

require('dotenv').config();
const { Pool } = require('pg');

const DB_CONFIGS = {
    admin: {
        name: 'Admin',
        url: process.env.DATABASE_URL_ADMIN
    },
    english: {
        name: 'English Books',
        url: process.env.DATABASE_URL_ENGLISH
    },
    urdu: {
        name: 'Urdu Books',
        url: process.env.DATABASE_URL_URDU
    },
    arabic: {
        name: 'Arabic Books',
        url: process.env.DATABASE_URL_ARABIC
    }
};

async function createBookTables(pool, dbName) {
    console.log(`\n📘 Setting up ${dbName} database...`);

    // Books table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS books (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            author VARCHAR(100) NOT NULL,
            publisher VARCHAR(255) DEFAULT 'ABC Publishing',
            price DECIMAL(10,2) NOT NULL,
            original_price DECIMAL(10,2),
            image TEXT,
            description TEXT,
            category VARCHAR(50) DEFAULT 'General',
            language VARCHAR(50) DEFAULT 'Urdu',
            subcategory VARCHAR(100),
            isbn VARCHAR(20),
            publish_year INTEGER,
            rating DECIMAL(2,1) DEFAULT 4.5,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('  ✅ books table');

    // Book sections table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS book_sections (
            id SERIAL PRIMARY KEY,
            book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
            section_name VARCHAR(50) NOT NULL,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('  ✅ book_sections table');

    // Indexes
    try { await pool.query(`CREATE INDEX IF NOT EXISTS idx_books_category ON books(category)`); } catch(e) {}
    try { await pool.query(`CREATE INDEX IF NOT EXISTS idx_books_title ON books(title)`); } catch(e) {}
    try { await pool.query(`CREATE INDEX IF NOT EXISTS idx_books_language ON books(language)`); } catch(e) {}
    try { await pool.query(`CREATE INDEX IF NOT EXISTS idx_book_sections_book_id ON book_sections(book_id)`); } catch(e) {}
    try { await pool.query(`CREATE INDEX IF NOT EXISTS idx_book_sections_section ON book_sections(section_name)`); } catch(e) {}
    console.log('  ✅ indexes created');
}

async function createAdminTables(pool) {
    console.log('\n🔐 Setting up Admin database...');

    // Users table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            phone VARCHAR(20),
            password_hash VARCHAR(255) NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE,
            verification_token VARCHAR(255),
            is_verified BOOLEAN DEFAULT FALSE,
            reset_password_token VARCHAR(255),
            reset_password_expires TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('  ✅ users table');

    // Orders table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            order_id VARCHAR(50) UNIQUE NOT NULL,
            user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            subtotal DECIMAL(10,2) NOT NULL,
            discount DECIMAL(10,2) DEFAULT 0,
            total DECIMAL(10,2) NOT NULL,
            shipping_first_name VARCHAR(50),
            shipping_last_name VARCHAR(50),
            shipping_email VARCHAR(100),
            shipping_phone VARCHAR(20),
            shipping_address1 TEXT,
            shipping_address2 TEXT,
            shipping_city VARCHAR(50),
            shipping_state VARCHAR(50),
            shipping_pincode VARCHAR(10),
            payment_method VARCHAR(20) DEFAULT 'COD',
            status VARCHAR(20) DEFAULT 'confirmed',
            tracking_id VARCHAR(100),
            courier_name VARCHAR(100),
            estimated_delivery_date DATE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('  ✅ orders table');

    // Order status history
    await pool.query(`
        CREATE TABLE IF NOT EXISTS order_status_history (
            id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            status VARCHAR(20) NOT NULL,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('  ✅ order_status_history table');

    // Order items (self-contained with book metadata)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS order_items (
            id SERIAL PRIMARY KEY,
            order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
            book_id INTEGER,
            quantity INTEGER DEFAULT 1,
            price DECIMAL(10,2) NOT NULL,
            book_title VARCHAR(255),
            book_author VARCHAR(100),
            book_image TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('  ✅ order_items table');

    // Cart (with cached book metadata for cross-DB compatibility)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS cart (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            book_id INTEGER NOT NULL,
            quantity INTEGER DEFAULT 1,
            book_title VARCHAR(255),
            book_author VARCHAR(100),
            book_price DECIMAL(10,2),
            book_original_price DECIMAL(10,2),
            book_image TEXT,
            book_source VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, book_id)
        )
    `);
    console.log('  ✅ cart table');

    // Wishlist (with cached book metadata)
    await pool.query(`
        CREATE TABLE IF NOT EXISTS wishlist (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            book_id INTEGER NOT NULL,
            book_title VARCHAR(255),
            book_author VARCHAR(100),
            book_price DECIMAL(10,2),
            book_original_price DECIMAL(10,2),
            book_image TEXT,
            book_rating DECIMAL(2,1),
            book_source VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, book_id)
        )
    `);
    console.log('  ✅ wishlist table');

    // Categories
    await pool.query(`
        CREATE TABLE IF NOT EXISTS categories (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            slug VARCHAR(100) UNIQUE NOT NULL,
            icon VARCHAR(50) DEFAULT 'fa-book',
            type VARCHAR(20) DEFAULT 'strip',
            parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
            is_language BOOLEAN DEFAULT FALSE,
            display_order INTEGER DEFAULT 0,
            visible BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('  ✅ categories table');

    // Indexes
    try { await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)`); } catch(e) {}
    try { await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`); } catch(e) {}
    try { await pool.query(`CREATE INDEX IF NOT EXISTS idx_cart_user ON cart(user_id)`); } catch(e) {}
    try { await pool.query(`CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id)`); } catch(e) {}
    console.log('  ✅ indexes created');
}

async function setupDatabase() {
    console.log('🔄 ABC Books Multi-Database Setup');
    console.log('='.repeat(50));

    // Setup Admin DB
    if (DB_CONFIGS.admin.url) {
        const pool = new Pool({ connectionString: DB_CONFIGS.admin.url, ssl: { rejectUnauthorized: false } });
        try {
            await createAdminTables(pool);
        } catch (error) {
            console.error(`❌ Error setting up Admin DB:`, error.message);
        }
        await pool.end();
    } else {
        console.warn('⚠️ DATABASE_URL_ADMIN not configured, skipping admin setup');
    }

    // Setup Book DBs (English, Urdu, Arabic)
    for (const key of ['english', 'urdu', 'arabic']) {
        const config = DB_CONFIGS[key];
        if (config.url) {
            const pool = new Pool({ connectionString: config.url, ssl: { rejectUnauthorized: false } });
            try {
                await createBookTables(pool, config.name);
            } catch (error) {
                console.error(`❌ Error setting up ${config.name} DB:`, error.message);
            }
            await pool.end();
        } else {
            console.warn(`⚠️ DATABASE_URL_${key.toUpperCase()} not configured, skipping`);
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Database setup complete!');
}

setupDatabase();
