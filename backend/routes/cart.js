// ===== Cart Routes =====
const express = require('express');
const router = express.Router();

// Get user's cart
router.get('/:userId', async (req, res) => {
    try {
        const sql = req.sql;
        const { userId } = req.params;

        const cartItems = await sql`
            SELECT c.id, c.quantity, c.created_at,
                   b.id as book_id, b.title, b.author, b.price, b.original_price, b.image
            FROM cart c
            INNER JOIN books b ON c.book_id = b.id
            WHERE c.user_id = ${userId}
            ORDER BY c.created_at DESC
        `;

        const total = cartItems.reduce((sum, item) =>
            sum + (parseFloat(item.price) * item.quantity), 0);

        res.json({
            cart: cartItems,
            itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
            total
        });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ error: 'Failed to get cart' });
    }
});

// Add to cart
router.post('/', async (req, res) => {
    try {
        const sql = req.sql;
        const { user_id, book_id, quantity = 1 } = req.body;

        // Check if item already in cart
        const existing = await sql`
            SELECT id, quantity FROM cart 
            WHERE user_id = ${user_id} AND book_id = ${book_id}
        `;

        if (existing.length > 0) {
            // Update quantity
            const newQuantity = existing[0].quantity + quantity;
            await sql`
                UPDATE cart SET quantity = ${newQuantity}
                WHERE id = ${existing[0].id}
            `;
            res.json({ message: 'Cart updated', quantity: newQuantity });
        } else {
            // Add new item
            await sql`
                INSERT INTO cart (user_id, book_id, quantity)
                VALUES (${user_id}, ${book_id}, ${quantity})
            `;
            res.status(201).json({ message: 'Added to cart' });
        }
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ error: 'Failed to add to cart' });
    }
});

// Update cart item quantity
router.put('/:id', async (req, res) => {
    try {
        const sql = req.sql;
        const { id } = req.params;
        const { quantity } = req.body;

        if (quantity <= 0) {
            await sql`DELETE FROM cart WHERE id = ${id}`;
            res.json({ message: 'Item removed from cart' });
        } else {
            await sql`UPDATE cart SET quantity = ${quantity} WHERE id = ${id}`;
            res.json({ message: 'Cart updated' });
        }
    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({ error: 'Failed to update cart' });
    }
});

// Remove from cart
router.delete('/:id', async (req, res) => {
    try {
        const sql = req.sql;
        const { id } = req.params;

        await sql`DELETE FROM cart WHERE id = ${id}`;
        res.json({ message: 'Removed from cart' });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ error: 'Failed to remove from cart' });
    }
});

// Clear entire cart
router.delete('/clear/:userId', async (req, res) => {
    try {
        const sql = req.sql;
        const { userId } = req.params;

        await sql`DELETE FROM cart WHERE user_id = ${userId}`;
        res.json({ message: 'Cart cleared' });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ error: 'Failed to clear cart' });
    }
});

module.exports = router;
