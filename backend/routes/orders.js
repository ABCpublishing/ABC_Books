// ===== Orders Routes (PostgreSQL / Admin DB) =====
const express = require('express');
const router = express.Router();
const { authenticate, authenticateAdmin } = require('../middleware/security');
const emailService = require('../services/email');

// Apply authentication to all order routes
router.use(authenticate);

// Get all orders (admin)
router.get('/', authenticateAdmin, async (req, res) => {
    try {
        const sql = req.db.admin;

        const orders = await sql`
            SELECT o.*, u.name as customer_name, u.email as customer_email
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.created_at DESC
        `;

        // Get order items (self-contained in admin DB, no cross-DB JOIN)
        for (let order of orders) {
            order.items = await sql`
                SELECT * FROM order_items
                WHERE order_id = ${order.id}
            `;
        }

        res.json({ orders });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Failed to get orders' });
    }
});

// Get user's orders
router.get('/my-orders', async (req, res) => {
    try {
        const sql = req.db.admin;
        const userId = req.userId;

        const orders = await sql`
            SELECT * FROM orders 
            WHERE user_id = ${userId}
            ORDER BY created_at DESC
        `;

        for (let order of orders) {
            order.items = await sql`
                SELECT * FROM order_items
                WHERE order_id = ${order.id}
            `;
        }

        res.json({ orders });
    } catch (error) {
        console.error('Get my orders error:', error);
        res.status(500).json({ error: 'Failed to get orders' });
    }
});

// Get order by ID
router.get('/:id', async (req, res) => {
    try {
        const sql = req.db.admin;
        const { id } = req.params;
        const userId = req.userId;
        let isAdmin = req.isAdmin;

        // If standard 'authenticate' middleware didn't set isAdmin, we must check the DB
        if (!isAdmin) {
            const usersCheck = await sql`SELECT is_admin FROM users WHERE id = ${userId}`;
            if (usersCheck.length > 0 && usersCheck[0].is_admin) {
                isAdmin = true;
            }
        }

        let orders;
        if (isNaN(parseInt(id)) || id.startsWith('ABC-')) {
            orders = await sql`
                SELECT o.*, u.name as customer_name, u.email as customer_email
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                WHERE o.order_id = ${id}
            `;
        } else {
            orders = await sql`
                SELECT o.*, u.name as customer_name, u.email as customer_email
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                WHERE o.id = ${id}
            `;
        }

        if (orders.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const order = orders[0];

        if (!isAdmin && order.user_id !== userId) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'You do not have permission to view this order'
            });
        }

        // Fetch order items (self-contained)
        order.items = await sql`
            SELECT * FROM order_items
            WHERE order_id = ${order.id}
        `;

        // Fetch order status history
        order.history = await sql`
            SELECT * FROM order_status_history
            WHERE order_id = ${order.id}
            ORDER BY created_at ASC
        `;

        res.json({ order });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Failed to get order' });
    }
});

// Create new order
router.post('/', async (req, res) => {
    try {
        const sql = req.db.admin;
        const {
            user_id,
            items,
            subtotal,
            discount,
            total,
            shipping_first_name,
            shipping_last_name,
            shipping_email,
            shipping_phone,
            shipping_address1,
            shipping_address2,
            shipping_city,
            shipping_state,
            shipping_pincode,
            payment_method
        } = req.body;

        console.log('\n========================================');
        console.log('📦 NEW ORDER REQUEST RECEIVED');
        console.log('========================================');
        console.log('User ID:', user_id);
        console.log('Items count:', Array.isArray(items) ? items.length : (typeof items === 'string' ? 'JSON string' : 'unknown'));
        console.log('Total:', total);
        console.log('Customer:', shipping_first_name, shipping_last_name);
        console.log('========================================\n');

        // Generate order ID
        const orderId = 'ABC-' + Date.now().toString(36).toUpperCase();
        const actualUserId = user_id || req.userId;
        const initialStatus = payment_method === 'razorpay' ? 'paid' : 'confirmed';

        const insertResult = await sql`
            INSERT INTO orders (
                order_id, user_id, subtotal, discount, total,
                shipping_first_name, shipping_last_name, shipping_email, shipping_phone,
                shipping_address1, shipping_address2, shipping_city, shipping_state, shipping_pincode,
                payment_method, status
            ) VALUES (
                ${orderId}, ${actualUserId || null}, ${subtotal || 0}, ${discount || 0}, ${total || 0},
                ${shipping_first_name || ''}, ${shipping_last_name || ''}, ${shipping_email || ''}, ${shipping_phone || ''},
                ${shipping_address1 || ''}, ${shipping_address2 || ''}, ${shipping_city || ''}, ${shipping_state || ''}, ${shipping_pincode || ''},
                ${payment_method || 'COD'}, ${initialStatus}
            )
            RETURNING *
        `;

        const order = insertResult[0];
        console.log('✅ Order created:', order.order_id);

        // Record initial status in history
        await sql`
            INSERT INTO order_status_history (order_id, status, notes)
            VALUES (${order.id}, ${initialStatus}, 'Order placed successfully')
        `;

        // Add order items - store book metadata directly (no cross-DB dependency)
        const parsedItems = typeof items === 'string' ? JSON.parse(items) : items;

        for (const item of parsedItems) {
            let bookId = null;
            if (typeof item.book_id === 'number') {
                bookId = item.book_id;
            } else if (typeof item.book_id === 'string' && !isNaN(parseInt(item.book_id))) {
                bookId = parseInt(item.book_id);
            }

            const itemPrice = item.price || 0;
            const itemQty = item.quantity || 1;
            const itemTitle = item.title || item.book_title || 'Book';
            const itemAuthor = item.author || item.book_author || '';
            const itemImage = item.image || item.book_image || '';

            try {
                await sql`
                    INSERT INTO order_items (order_id, book_id, quantity, price, book_title, book_author, book_image)
                    VALUES (${order.id}, ${bookId}, ${itemQty}, ${itemPrice}, ${itemTitle}, ${itemAuthor}, ${itemImage})
                `;
            } catch (itemError) {
                console.log('⚠️ Error adding item:', itemError.message);
                try {
                    await sql`
                        INSERT INTO order_items (order_id, book_id, quantity, price, book_title, book_author, book_image)
                        VALUES (${order.id}, ${null}, ${itemQty}, ${itemPrice}, ${itemTitle}, ${itemAuthor}, ${itemImage})
                    `;
                } catch (err2) {
                    console.log('⚠️ Fallback insert error:', err2.message);
                }
            }
        }

        // Clear user's cart
        if (user_id) {
            await sql`DELETE FROM cart WHERE user_id = ${user_id}`;
        }

        // Send confirmation email
        try {
            const recipientEmail = order.shipping_email || order.email;
            if (recipientEmail && recipientEmail.includes('@')) {
                await emailService.sendOrderConfirmation(recipientEmail, {
                    order_id: order.order_id,
                    total: order.total,
                    items: parsedItems,
                    shipping: {
                        first_name: order.shipping_first_name,
                        last_name: order.shipping_last_name,
                        address1: order.shipping_address1,
                        city: order.shipping_city
                    }
                });
            }
        } catch (emailError) {
            console.error('⚠️ Could not send order confirmation email:', emailError.message);
        }

        res.status(201).json({
            order: { ...order, items: parsedItems },
            message: 'Order placed successfully!'
        });
    } catch (error) {
        console.error('❌ ORDER CREATION ERROR:', error.message);
        res.status(500).json({ error: 'Failed to create order: ' + error.message });
    }
});

// Update order status & tracking info (admin only)
router.patch('/:id/status', authenticateAdmin, async (req, res) => {
    try {
        const sql = req.db.admin;
        const { id } = req.params;
        const { status, notes, tracking_id, courier_name, estimated_delivery_date } = req.body;

        let orders;
        if (isNaN(parseInt(id)) || id.startsWith('ABC-')) {
            orders = await sql`SELECT id, status FROM orders WHERE order_id = ${id}`;
        } else {
            orders = await sql`SELECT id, status FROM orders WHERE id = ${id}`;
        }
        if (orders.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const order = orders[0];

        const freshResult = await sql`
            UPDATE orders SET 
                status = ${status || order.status}, 
                tracking_id = ${tracking_id || null},
                courier_name = ${courier_name || null},
                estimated_delivery_date = ${estimated_delivery_date || null},
                updated_at = NOW()
            WHERE id = ${order.id}
            RETURNING *
        `;

        if (status && status !== order.status) {
            await sql`
                INSERT INTO order_status_history (order_id, status, notes)
                VALUES (${order.id}, ${status}, ${notes || 'Status updated by administrator'})
            `;
        } else if (notes || tracking_id || courier_name) {
            await sql`
                INSERT INTO order_status_history (order_id, status, notes)
                VALUES (${order.id}, ${status || order.status}, ${notes || 'Tracking information updated'})
            `;
        }

        res.json({
            success: true,
            order: freshResult[0],
            message: 'Order status and tracking information updated'
        });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ error: 'Failed to update order status', details: error.message });
    }
});

// Delete order (admin only)
router.delete('/:id', authenticateAdmin, async (req, res) => {
    try {
        const sql = req.db.admin;
        const { id } = req.params;

        let orders;
        if (isNaN(parseInt(id)) || id.startsWith('ABC-')) {
            orders = await sql`SELECT id FROM orders WHERE order_id = ${id}`;
        } else {
            orders = await sql`SELECT id FROM orders WHERE id = ${id}`;
        }
        if (orders.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }
        const internalId = orders[0].id;

        await sql`DELETE FROM order_items WHERE order_id = ${internalId}`;
        await sql`DELETE FROM order_status_history WHERE order_id = ${internalId}`;
        await sql`DELETE FROM orders WHERE id = ${internalId}`;

        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

module.exports = router;
