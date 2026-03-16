require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    console.log('🔄 Connecting to MySQL database...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'abc_books'
    });

    try {
        // First, let's make sure the is_admin column exists
        console.log('🛡️ Ensuring is_admin column exists...');
        try {
            await connection.query('ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE AFTER password_hash');
            console.log('✅ Added is_admin column');
        } catch (e) {
            if (e.code === 'ER_DUP_COLUMN_NAME') {
                console.log('ℹ️ is_admin column already exists');
            } else {
                throw e;
            }
        }

        const email = 'admin@abcbooks.com';
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);

        if (existing.length > 0) {
            console.log('Admin user exists. Updating details...');
            await connection.query(
                'UPDATE users SET password_hash = ?, is_admin = TRUE, is_verified = TRUE WHERE email = ?',
                [hashedPassword, email]
            );
        } else {
            console.log('Creating admin user...');
            await connection.query(
                'INSERT INTO users (name, email, password_hash, is_admin, is_verified) VALUES (?, ?, ?, TRUE, TRUE)',
                ['Admin', email, hashedPassword]
            );
        }
        console.log('🎉 Admin account ready!');
        console.log('📧 Email: ' + email);
        console.log('🔑 Password: ' + password);
        
        await connection.end();
    } catch (e) {
        console.error('❌ Error:', e);
        await connection.end();
    }
}

createAdmin();
