// ===== Cart Routes (PostgreSQL / Admin DB + Cross-DB Book Lookup) =====
const express = require('express');
const router = express.Router();

// Helper: Look up book details from all book databases
async function findBookAcrossDbs(req, bookId) {
    const allDbs = req.db.getAllBookDbs();
    for (const { name, query: dbQuery } of allDbs) {
        try {
            const books = await dbQuery`
                SELECT id, title, author, price, original_price, image, rating
                FROM books WHERE id = ${bookId}
            `;
            if (books.length > 0) {
                return { ...books[0], db_source: name.toLowerCase() };
            }
        } catch (err) {
            // Skip DB errors silently
        }
    }
    return null;
}

// Get user's cart
router.get('/:userId', async (req, res) => {
    try {
        const sql = req.db.admin;
        const { userId } = req.params;

        // Get cart items from admin DB
        const cartItems = await sql`
            SELECT id, user_id, book_id, quantity, 
                   book_title, book_author, book_price, book_original_price, book_image, book_source,
                   created_at
            FROM cart
            WHERE user_id = ${userId}
            ORDER BY created_at DESC
        `;

        // For items that have cached book data, use it directly
        // For items without cached data, look up from book DBs
        const enrichedItems = [];
        for (const item of cartItems) {
            if (item.book_title) {
                // Use cached data
                enrichedItems.push({
                    id: item.id,
                    quantity: item.quantity,
                    created_at: item.created_at,
                    book_id: item.book_id,
                    title: item.book_title,
                    author: item.book_author,
                    price: parseFloat(item.book_price) || 0,
                    original_price: item.book_original_price ? parseFloat(item.book_original_price) : null,
                    image: item.book_image,
                    db_source: item.book_source
                });
            } else {
                // Fallback: look up book from book DBs
                const book = await findBookAcrossDbs(req, item.book_id);
                if (book) {
                    enrichedItems.push({
                        id: item.id,
                        quantity: item.quantity,
                        created_at: item.created_at,
                        book_id: book.id,
                        title: book.title,
                        author: book.author,
                        price: parseFloat(book.price) || 0,
                        original_price: book.original_price ? parseFloat(book.original_price) : null,
                        image: book.image,
                        db_source: book.db_source
                    });
                    // Update cache
                    try {
                        await sql`
                            UPDATE cart SET 
                                book_title = ${book.title}, book_author = ${book.author},
                                book_price = ${book.price}, book_original_price = ${book.original_price},
                                book_image = ${book.image}, book_source = ${book.db_source}
                            WHERE id = ${item.id}
                        `;
                    } catch(e) { /* ignore cache update errors */ }
                }
            }
        }

        const total = enrichedItems.reduce((sum, item) =>
            sum + (item.price * item.quantity), 0);

        res.json({
            cart: enrichedItems,
            itemCount: enrichedItems.reduce((sum, item) => sum + item.quantity, 0),
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
        const sql = req.db.admin;
        const { user_id, book_id, quantity = 1, book_source } = req.body;

        // Look up book details to cache them
        let bookData = null;
        if (book_source && req.db.getBookDb(book_source)) {
            const bookDb = req.db.getBookDb(book_source);
            const books = await bookDb`SELECT id, title, author, price, original_price, image FROM books WHERE id = ${book_id}`;
            if (books.length > 0) bookData = { ...books[0], db_source: book_source.toLowerCase() };
        }
        if (!bookData) {
            bookData = await findBookAcrossDbs(req, book_id);
        }

        // Check if item already in cart
        const existing = await sql`
            SELECT id, quantity FROM cart 
            WHERE user_id = ${user_id} AND book_id = ${book_id}
        `;

        if (existing.length > 0) {
            const newQuantity = existing[0].quantity + quantity;
            await sql`
                UPDATE cart SET quantity = ${newQuantity}
                WHERE id = ${existing[0].id}
            `;
            res.json({ message: 'Cart updated', quantity: newQuantity });
        } else {
            await sql`
                INSERT INTO cart (user_id, book_id, quantity, book_title, book_author, book_price, book_original_price, book_image, book_source)
                VALUES (${user_id}, ${book_id}, ${quantity}, 
                        ${bookData?.title || null}, ${bookData?.author || null}, 
                        ${bookData?.price || null}, ${bookData?.original_price || null}, 
                        ${bookData?.image || null}, ${bookData?.db_source || null})
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
        const sql = req.db.admin;
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
        const sql = req.db.admin;
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
        const sql = req.db.admin;
        const { userId } = req.params;

        await sql`DELETE FROM cart WHERE user_id = ${userId}`;
        res.json({ message: 'Cart cleared' });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ error: 'Failed to clear cart' });
    }
});

module.exports = router;
