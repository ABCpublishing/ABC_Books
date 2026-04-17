// ===== Wishlist Routes (PostgreSQL / Admin DB + Cross-DB Book Lookup) =====
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

// Get user's wishlist
router.get('/:userId', async (req, res) => {
    try {
        const sql = req.db.admin;
        const { userId } = req.params;

        const wishlistItems = await sql`
            SELECT id, user_id, book_id, 
                   book_title, book_author, book_price, book_original_price, book_image, book_rating, book_source,
                   created_at
            FROM wishlist
            WHERE user_id = ${userId}
            ORDER BY created_at DESC
        `;

        const enrichedItems = [];
        for (const item of wishlistItems) {
            if (item.book_title) {
                enrichedItems.push({
                    id: item.id,
                    created_at: item.created_at,
                    book_id: item.book_id,
                    title: item.book_title,
                    author: item.book_author,
                    price: parseFloat(item.book_price) || 0,
                    original_price: item.book_original_price ? parseFloat(item.book_original_price) : null,
                    image: item.book_image,
                    rating: item.book_rating ? parseFloat(item.book_rating) : null,
                    db_source: item.book_source
                });
            } else {
                const book = await findBookAcrossDbs(req, item.book_id);
                if (book) {
                    enrichedItems.push({
                        id: item.id,
                        created_at: item.created_at,
                        book_id: book.id,
                        title: book.title,
                        author: book.author,
                        price: parseFloat(book.price) || 0,
                        original_price: book.original_price ? parseFloat(book.original_price) : null,
                        image: book.image,
                        rating: book.rating ? parseFloat(book.rating) : null,
                        db_source: book.db_source
                    });
                    // Update cache
                    try {
                        await sql`
                            UPDATE wishlist SET 
                                book_title = ${book.title}, book_author = ${book.author},
                                book_price = ${book.price}, book_original_price = ${book.original_price},
                                book_image = ${book.image}, book_rating = ${book.rating},
                                book_source = ${book.db_source}
                            WHERE id = ${item.id}
                        `;
                    } catch(e) { /* ignore */ }
                }
            }
        }

        res.json({
            wishlist: enrichedItems,
            count: enrichedItems.length
        });
    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({ error: 'Failed to get wishlist' });
    }
});

// Add to wishlist
router.post('/', async (req, res) => {
    try {
        const sql = req.db.admin;
        const { user_id, book_id, book_source } = req.body;

        // Check if already in wishlist
        const existing = await sql`
            SELECT id FROM wishlist 
            WHERE user_id = ${user_id} AND book_id = ${book_id}
        `;

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Already in wishlist' });
        }

        // Look up book to cache metadata
        let bookData = null;
        if (book_source && req.db.getBookDb(book_source)) {
            const bookDb = req.db.getBookDb(book_source);
            const books = await bookDb`SELECT id, title, author, price, original_price, image, rating FROM books WHERE id = ${book_id}`;
            if (books.length > 0) bookData = { ...books[0], db_source: book_source.toLowerCase() };
        }
        if (!bookData) {
            bookData = await findBookAcrossDbs(req, book_id);
        }

        await sql`
            INSERT INTO wishlist (user_id, book_id, book_title, book_author, book_price, book_original_price, book_image, book_rating, book_source)
            VALUES (${user_id}, ${book_id}, 
                    ${bookData?.title || null}, ${bookData?.author || null},
                    ${bookData?.price || null}, ${bookData?.original_price || null},
                    ${bookData?.image || null}, ${bookData?.rating || null},
                    ${bookData?.db_source || null})
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
        const sql = req.db.admin;
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
        const sql = req.db.admin;
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
        const sql = req.db.admin;
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
