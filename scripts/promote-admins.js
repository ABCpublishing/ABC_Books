
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function promoteUsers() {
    const sql = neon(process.env.DATABASE_URL);
    try {
        const emails = [
            'maktabailmuadab@gmail.com',
            'rayees22@gmail.com',
            'absar@gmail.com'
        ];

        for (const email of emails) {
            console.log(`Promoting ${email} to admin...`);
            const res = await sql`UPDATE users SET is_admin = TRUE WHERE email = ${email} RETURNING id, name`;
            console.log('Result:', res);
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

promoteUsers();
