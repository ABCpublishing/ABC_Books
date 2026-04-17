// ===== Users Routes (PostgreSQL / Admin DB) =====
const express = require('express');
const { authenticate, authenticateAdmin } = require('../middleware/security');
const router = express.Router();

// Get current logged-in user's profile
router.get('/me', authenticate, async (req, res) => {
    try {
        const sql = req.db.admin;
        const userId = req.userId;

        const users = await sql`
            SELECT id, name, email, phone, is_admin, created_at
            FROM users WHERE id = ${userId}
        `;

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        const orderStats = await sql`
            SELECT COUNT(*)::int as count, COALESCE(SUM(total), 0) as total_spent
            FROM orders WHERE user_id = ${userId}
        `;
        user.stats = {
            total_orders: parseInt(orderStats[0].count),
            total_spent: parseFloat(orderStats[0].total_spent) || 0
        };

        res.json({ user });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Failed to get user profile' });
    }
});

// Get all users (admin)
router.get('/', authenticateAdmin, async (req, res) => {
    try {
        const sql = req.db.admin;

        const users = await sql`
            SELECT id, name, email, phone, is_admin, created_at, updated_at
            FROM users
            ORDER BY created_at DESC
        `;

        for (let user of users) {
            const orderCount = await sql`
                SELECT COUNT(*)::int as count, COALESCE(SUM(total), 0) as total_spent
                FROM orders WHERE user_id = ${user.id}
            `;
            user.order_count = parseInt(orderCount[0].count);
            user.total_spent = parseFloat(orderCount[0].total_spent) || 0;
        }

        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// Get user by ID with order history
router.get('/:id', authenticate, async (req, res) => {
    try {
        const sql = req.db.admin;
        const { id } = req.params;

        if (isNaN(parseInt(id))) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const users = await sql`
            SELECT id, name, email, phone, created_at
            FROM users WHERE id = ${id}
        `;

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];

        // Get user's orders
        user.orders = await sql`
            SELECT * FROM orders 
            WHERE user_id = ${id}
            ORDER BY created_at DESC
        `;

        // Get order items (self-contained, no cross-DB JOIN needed)
        for (let order of user.orders) {
            order.items = await sql`
                SELECT * FROM order_items
                WHERE order_id = ${order.id}
            `;
        }

        user.stats = {
            total_orders: user.orders.length,
            total_spent: user.orders.reduce((sum, o) => sum + parseFloat(o.total), 0),
            total_books: user.orders.reduce((sum, o) => sum + o.items.length, 0)
        };

        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});

// Delete user (admin only)
router.delete('/:id', authenticateAdmin, async (req, res) => {
    try {
        const sql = req.db.admin;
        const { id } = req.params;

        await sql`DELETE FROM cart WHERE user_id = ${id}`;
        await sql`DELETE FROM wishlist WHERE user_id = ${id}`;

        const users = await sql`SELECT id, name FROM users WHERE id = ${id}`;
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const userToDelete = users[0];

        await sql`DELETE FROM users WHERE id = ${id}`;

        res.json({ message: `User ${userToDelete.name} deleted successfully` });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Update user role (admin)
router.patch('/:id/role', authenticateAdmin, async (req, res) => {
    try {
        const sql = req.db.admin;
        const { id } = req.params;
        const { is_admin } = req.body;

        const updateResult = await sql`
            UPDATE users 
            SET is_admin = ${is_admin}, updated_at = NOW()
            WHERE id = ${id}
            RETURNING id, name, is_admin
        `;

        if (updateResult.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = updateResult[0];

        res.json({
            success: true,
            message: `User ${user.name} updated to ${user.is_admin ? 'Admin' : 'Customer'}`,
            user: user
        });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

module.exports = router;
