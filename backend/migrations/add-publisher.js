// Add publisher column to books table
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function addPublisherColumn() {
    try {
        const sql = neon(process.env.DATABASE_URL);

        console.log('🔄 Adding publisher column to books table...');

        await sql`
            ALTER TABLE books 
            ADD COLUMN IF NOT EXISTS publisher VARCHAR(255) DEFAULT 'ABC Publishing'
        `;

        console.log('✅ Publisher column added successfully!');

        // Verify by checking table structure
        const columns = await sql`
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'books' AND column_name = 'publisher'
        `;

        if (columns.length > 0) {
            console.log('📋 Publisher column details:', columns[0]);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

addPublisherColumn();
