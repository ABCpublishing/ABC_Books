require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
    const adminUrl = process.env.DATABASE_URL_ADMIN;
    if (!adminUrl) {
        console.error('DATABASE_URL_ADMIN not set in .env');
        return;
    }

    const pool = new Pool({ connectionString: adminUrl, ssl: { rejectUnauthorized: false } });

    try {
        const email = 'admin@abcbooks.com';
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);

        const checkQuery = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (checkQuery.rows.length === 0) {
            await pool.query(
                'INSERT INTO users (name, email, password_hash, is_admin, is_verified) VALUES ($1, $2, $3, $4, $5)',
                ['Admin', email, hashedPassword, true, true]
            );
            console.log('✅ Admin user created successfully.');
        } else {
            await pool.query(
                'UPDATE users SET password_hash = $1, is_admin = $2, is_verified = $3 WHERE email = $4',
                [hashedPassword, true, true, email]
            );
            console.log('✅ Admin user updated successfully.');
        }
    } catch (e) {
        console.error('Error seeding admin user:', e);
    } finally {
        await pool.end();
    }
}

seedAdmin();
