// ===== Order Tracking System Migration =====
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function migrate() {
    console.log('🔄 Connecting to Neon database...');
    const sql = neon(process.env.DATABASE_URL);

    try {
        console.log('📦 Starting migration: Order Tracking System');

        // 1. Update orders table with tracking fields
        console.log('Adding tracking fields to orders table...');
        await sql`
            ALTER TABLE orders 
            ADD COLUMN IF NOT EXISTS tracking_id VARCHAR(100),
            ADD COLUMN IF NOT EXISTS courier_name VARCHAR(100),
            ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE;
        `;
        console.log('✅ tracking fields added');

        // 2. Create order_status_history table
        console.log('Creating order_status_history table...');
        await sql`
            CREATE TABLE IF NOT EXISTS order_status_history (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
                status VARCHAR(50) NOT NULL,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `;
        console.log('✅ order_status_history table created');

        // 3. Create indexes for performance
        console.log('Creating indexes...');
        await sql`CREATE INDEX IF NOT EXISTS idx_status_history_order_id ON order_status_history(order_id)`;
        // Note: idx_orders_user and idx_orders_status already exist from setup-database.js
        console.log('✅ indexes created');

        // 4. Initial status sync for existing orders (Optional but recommended)
        console.log('Syncing initial status history for existing orders...');
        const existingOrdersWithoutHistory = await sql`
            SELECT o.id, o.status, o.created_at 
            FROM orders o
            LEFT JOIN order_status_history h ON o.id = h.order_id
            WHERE h.id IS NULL
        `;

        if (existingOrdersWithoutHistory.length > 0) {
            console.log(`Found ${existingOrdersWithoutHistory.length} orders to sync.`);
            for (const order of existingOrdersWithoutHistory) {
                await sql`
                    INSERT INTO order_status_history (order_id, status, notes, created_at)
                    VALUES (${order.id}, ${order.status}, 'Initial status recorded during system migration', ${order.created_at})
                `;
            }
            console.log('✅ status history synced');
        }

        console.log('\n🎉 Migration complete! Order tracking system is ready.');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
