// ===== Database Setup Script (MySQL Version) =====
// Run this once to create all tables in MySQL

require('dotenv').config();
const mysql = require('mysql2/promise');

async function setupDatabase() {
    console.log('🔄 Connecting to MySQL database...');

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'abc_books',
        multipleStatements: true // Allow multiple queries in one call
    });

    try {
        console.log('📦 Creating tables...\n');

        // Users table
        console.log('Creating users table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                phone VARCHAR(20),
                password_hash VARCHAR(255) NOT NULL,
                is_admin BOOLEAN DEFAULT FALSE,
                verification_token VARCHAR(255),
                is_verified BOOLEAN DEFAULT FALSE,
                reset_password_token VARCHAR(255),
                reset_password_expires DATETIME,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ users table created');

        // Books table
        console.log('Creating books table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS books (
                id INT AUTO_INCREMENT PRIMARY KEY,
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
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ books table created');

        // Book sections
        console.log('Creating book_sections table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS book_sections (
                id INT AUTO_INCREMENT PRIMARY KEY,
                book_id INTEGER NOT NULL,
                section_name VARCHAR(50) NOT NULL,
                display_order INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ book_sections table created');

        // Cart table
        console.log('Creating cart table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS cart (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                book_id INTEGER NOT NULL,
                quantity INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, book_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ cart table created');

        // Wishlist table
        console.log('Creating wishlist table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS wishlist (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                book_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, book_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ wishlist table created');

        // Orders table
        console.log('Creating orders table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id VARCHAR(50) UNIQUE NOT NULL,
                user_id INTEGER,
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ orders table created');

        // Order status history table
        console.log('Creating order_status_history table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS order_status_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INTEGER NOT NULL,
                status VARCHAR(20) NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ order_status_history table created');

        // Order items table
        console.log('Creating order_items table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id_raw INTEGER,
                order_id VARCHAR(50),
                book_id INTEGER,
                quantity INTEGER DEFAULT 1,
                price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ order_items table created');

        // Categories table
        console.log('Creating categories table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                slug VARCHAR(100) UNIQUE NOT NULL,
                icon VARCHAR(50) DEFAULT 'fa-book',
                type VARCHAR(20) DEFAULT 'strip',
                parent_id INTEGER,
                is_language BOOLEAN DEFAULT FALSE,
                display_order INTEGER DEFAULT 0,
                visible BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
            )
        `);
        console.log('✅ categories table created');

        // Create indexes
        console.log('\nCreating indexes...');
        // MySQL doesn't have 'CREATE INDEX IF NOT EXISTS' in all versions easily, 
        // so we use a tried and true method or ignore errors for these as they are likely not there if tables were just created.
        try { await connection.query(`CREATE INDEX idx_books_category ON books(category)`); } catch(e) {}
        try { await connection.query(`CREATE INDEX idx_books_title ON books(title)`); } catch(e) {}
        try { await connection.query(`CREATE INDEX idx_orders_user ON orders(user_id)`); } catch(e) {}
        try { await connection.query(`CREATE INDEX idx_orders_status ON orders(status)`); } catch(e) {}
        try { await connection.query(`CREATE INDEX idx_cart_user ON cart(user_id)`); } catch(e) {}
        try { await connection.query(`CREATE INDEX idx_wishlist_user ON wishlist(user_id)`); } catch(e) {}
        console.log('✅ indexes created');

        console.log('\n🎉 Database setup complete!');
        
        await connection.end();

    } catch (error) {
        console.error('❌ Error setting up database:', error);
        await connection.end();
        process.exit(1);
    }
}

setupDatabase();
