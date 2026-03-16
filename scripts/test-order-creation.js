// Test script to verify order creation
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function testOrderCreation() {
    console.log('🧪 Testing Order Creation...\n');

    const sql = neon(process.env.DATABASE_URL);

    try {
        // 1. Check if order_items table has required columns
        console.log('1️⃣ Checking order_items table structure...');
        const columns = await sql`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'order_items'
            ORDER BY ordinal_position
        `;

        console.log('   Columns in order_items:');
        columns.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
        });

        const hasBookTitle = columns.some(col => col.column_name === 'book_title');
        const hasBookAuthor = columns.some(col => col.column_name === 'book_author');
        const hasBookImage = columns.some(col => col.column_name === 'book_image');

        if (!hasBookTitle || !hasBookAuthor || !hasBookImage) {
            console.log('\n❌ MISSING COLUMNS! Run update-order-items.js first!');
            console.log('   Missing:',
                !hasBookTitle ? 'book_title ' : '',
                !hasBookAuthor ? 'book_author ' : '',
                !hasBookImage ? 'book_image' : ''
            );
            return;
        }

        console.log('   ✅ All required columns exist\n');

        // 2. Check current orders count
        console.log('2️⃣ Checking existing orders...');
        const orderCount = await sql`SELECT COUNT(*) as count FROM orders`;
        const itemCount = await sql`SELECT COUNT(*) as count FROM order_items`;
        console.log(`   Orders: ${orderCount[0].count}`);
        console.log(`   Order items: ${itemCount[0].count}\n`);

        // 3. Test creating a sample order
        console.log('3️⃣ Creating test order...');
        const orderId = 'TEST-' + Date.now().toString(36).toUpperCase();

        const orderResult = await sql`
            INSERT INTO orders (
                order_id, user_id, subtotal, discount, total,
                shipping_first_name, shipping_last_name, shipping_email, shipping_phone,
                shipping_address1, shipping_city, shipping_state, shipping_pincode,
                payment_method, status
            ) VALUES (
                ${orderId}, NULL, 500, 0, 500,
                'Test', 'User', 'test@example.com', '1234567890',
                '123 Test St', 'Mumbai', 'MH', '400001',
                'COD', 'confirmed'
            )
            RETURNING *
        `;

        const order = orderResult[0];
        console.log(`   ✅ Order created: ${order.order_id} (ID: ${order.id})\n`);

        // 4. Add order items
        console.log('4️⃣ Adding order items...');
        await sql`
            INSERT INTO order_items (order_id, book_id, quantity, price, book_title, book_author, book_image)
            VALUES (${order.id}, NULL, 1, 500, 'Test Book', 'Test Author', 'https://example.com/image.jpg')
        `;
        console.log('   ✅ Order item added\n');

        // 5. Verify the order
        console.log('5️⃣ Verifying order...');
        const verifyOrder = await sql`
            SELECT o.*, 
                   (SELECT json_agg(oi.*) FROM order_items oi WHERE oi.order_id = o.id) as items
            FROM orders o
            WHERE o.order_id = ${orderId}
        `;

        console.log('   Order details:', JSON.stringify(verifyOrder[0], null, 2));

        // 6. Clean up test order
        console.log('\n6️⃣ Cleaning up test order...');
        await sql`DELETE FROM order_items WHERE order_id = ${order.id}`;
        await sql`DELETE FROM orders WHERE id = ${order.id}`;
        console.log('   ✅ Test order deleted\n');

        console.log('🎉 All tests passed! Order creation is working correctly.\n');

        // 7. Show recent real orders
        console.log('7️⃣ Recent orders in database:');
        const recentOrders = await sql`
            SELECT order_id, shipping_first_name, shipping_last_name, total, status, created_at
            FROM orders
            ORDER BY created_at DESC
            LIMIT 5
        `;

        if (recentOrders.length === 0) {
            console.log('   No orders found in database\n');
        } else {
            recentOrders.forEach(o => {
                console.log(`   - ${o.order_id}: ${o.shipping_first_name} ${o.shipping_last_name} - ₹${o.total} (${o.status})`);
            });
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('   Details:', error);
    }
}

testOrderCreation();
