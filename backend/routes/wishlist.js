// ===== Wishlist Routes =====
const express = require('express');
const router = express.Router();

// Get user's wishlist
router.get('/:userId', async (req, res) => {
    try {
        const sql = req.sql;
        const { userId } = req.params;

        const wishlistItems = await sql`
            SELECT w.id, w.created_at,
                   b.id as book_id, b.title, b.author, b.price, b.original_price, b.image, b.rating
            FROM wishlist w
            INNER JOIN books b ON w.book_id = b.id
            WHERE w.user_id = ${userId}
            ORDER BY w.created_at DESC
        `;

        res.json({
            wishlist: wishlistItems,
            count: wishlistItems.length
        });
    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({ error: 'Failed to get wishlist' });
    }
});

// Add to wishlist
router.post('/', async (req, res) => {
    try {
        const sql = req.sql;
        const { user_id, book_id } = req.body;

        // Check if already in wishlist
        const existing = await sql`
            SELECT id FROM wishlist 
            WHERE user_id = ${user_id} AND book_id = ${book_id}
        `;

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Already in wishlist' });
        }

        await sql`
            INSERT INTO wishlist (user_id, book_id)
            VALUES (${user_id}, ${book_id})
        `;

        res.status(201).json({ message: 'Added to wishlist' });
    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({ error: 'Failed to add to wishlist' });
    }
});

// Remove from wishlist
router.delete('/:id', async (req, res) => {
    try {
        const sql = req.sql;
        const { id } = req.params;

        await sql`DELETE FROM wishlist WHERE id = ${id}`;
        res.json({ message: 'Removed from wishlist' });
    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({ error: 'Failed to remove from wishlist' });
    }
});

// Remove by user and book ID
router.delete('/remove/:userId/:bookId', async (req, res) => {
    try {
        const sql = req.sql;
        const { userId, bookId } = req.params;

        await sql`DELETE FROM wishlist WHERE user_id = ${userId} AND book_id = ${bookId}`;
        res.json({ message: 'Removed from wishlist' });
    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({ error: 'Failed to remove from wishlist' });
    }
});

// Check if book is in wishlist
router.get('/check/:userId/:bookId', async (req, res) => {
    try {
        const sql = req.sql;
        const { userId, bookId } = req.params;

        const result = await sql`
            SELECT id FROM wishlist 
            WHERE user_id = ${userId} AND book_id = ${bookId}
        `;

        res.json({ inWishlist: result.length > 0 });
    } catch (error) {
        console.error('Check wishlist error:', error);
        res.status(500).json({ error: 'Failed to check wishlist' });
    }
});

module.exports = router;
