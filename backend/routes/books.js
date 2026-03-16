// ===== Books Routes =====
const express = require('express');
const { authenticateAdmin } = require('../middleware/security');
const router = express.Router();

// Get all books with sections
// Get all books with sections
router.get('/', async (req, res) => {
    try {
        const sql = req.sql;
        const { category, search, limit = 100 } = req.query;
        const parsedLimit = parseInt(limit) || 100;

        let books;

        if (search) {
            const pattern = '%' + search + '%';
            books = await sql`
                SELECT b.*, 
                       GROUP_CONCAT(bs.section_name) as sections_str
                FROM books b
                LEFT JOIN book_sections bs ON b.id = bs.book_id
                WHERE b.title LIKE ${pattern} 
                   OR b.author LIKE ${pattern}
                   OR b.description LIKE ${pattern}
                GROUP BY b.id
                ORDER BY b.created_at DESC
                LIMIT ${parsedLimit}
            `;
        } else if (category) {
            books = await sql`
                SELECT b.*, 
                       GROUP_CONCAT(bs.section_name) as sections_str
                FROM books b
                LEFT JOIN book_sections bs ON b.id = bs.book_id
                WHERE LOWER(b.category) = LOWER(${category})
                GROUP BY b.id
                ORDER BY b.created_at DESC
                LIMIT ${parsedLimit}
            `;
        } else {
            books = await sql`
                SELECT b.*, 
                       GROUP_CONCAT(bs.section_name) as sections_str
                FROM books b
                LEFT JOIN book_sections bs ON b.id = bs.book_id
                GROUP BY b.id
                ORDER BY b.created_at DESC
                LIMIT ${parsedLimit}
            `;
        }

        // Convert GROUP_CONCAT string to array
        const formattedBooks = books.map(b => ({
            ...b,
            sections: b.sections_str ? b.sections_str.split(',') : []
        }));

        res.json({ books: formattedBooks });
    } catch (error) {
        console.error('Get books error:', error);
        res.status(500).json({ error: 'Failed to get books' });
    }
});

// Get books by section (hero, featured, trending, etc.)
// IMPORTANT: This route MUST come BEFORE /:id to avoid being shadowed
router.get('/section/:section', async (req, res) => {
    try {
        const sql = req.sql;
        const { section } = req.params;

        console.log(`📚 Fetching books for section: ${section}`);

        const books = await sql`
            SELECT b.* FROM books b
            INNER JOIN book_sections bs ON b.id = bs.book_id
            WHERE bs.section_name = ${section}
            ORDER BY bs.display_order ASC
        `;

        console.log(`✅ Found ${books.length} books in ${section} section`);
        res.json({ books });
    } catch (error) {
        console.error('Get section books error:', error);
        res.status(500).json({ error: 'Failed to get section books' });
    }
});

// Get book by ID
router.get('/:id', async (req, res) => {
    try {
        const sql = req.sql;
        const { id } = req.params;

        const books = await sql`
            SELECT b.*, 
                   GROUP_CONCAT(bs.section_name) as sections_str
            FROM books b
            LEFT JOIN book_sections bs ON b.id = bs.book_id
            WHERE b.id = ${id}
            GROUP BY b.id
        `;

        if (books.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        const book = {
            ...books[0],
            sections: books[0].sections_str ? books[0].sections_str.split(',') : []
        };

        res.json({ book });
    } catch (error) {
        console.error('Get book error:', error);
        res.status(500).json({ error: 'Failed to get book' });
    }
});

// Add new book (admin only - requires admin authentication)
router.post('/', authenticateAdmin, async (req, res) => {
    try {
        const sql = req.sql;
        const { title, author, publisher, price, original_price, image, description, category, language, subcategory, rating, sections } = req.body;

        const insertResult = await sql`
            INSERT INTO books (title, author, publisher, price, original_price, image, description, category, language, subcategory, rating)
            VALUES (${title}, ${author}, ${publisher || 'ABC Publishing'}, ${price}, ${original_price || null}, ${image || null}, ${description || ''}, ${category || language || 'General'}, ${language || 'Urdu'}, ${subcategory || ''}, ${rating || 4.5})
        `;

        const newBookId = insertResult.insertId;
        const bookResult = await sql`SELECT * FROM books WHERE id = ${newBookId}`;
        const book = bookResult[0];

        // Add sections if provided
        if (sections && Array.isArray(sections) && sections.length > 0) {
            for (const section of sections) {
                await sql`
                    INSERT INTO book_sections (book_id, section_name) 
                    VALUES (${book.id}, ${section})
                `;
            }
        }

        res.status(201).json({ book, message: 'Book added successfully' });
    } catch (error) {
        console.error('Add book error:', error);
        res.status(500).json({ error: 'Failed to add book', details: error.message });
    }
});

// Update book (admin only - requires admin authentication)
router.put('/:id', authenticateAdmin, async (req, res) => {
    try {
        const sql = req.sql;
        const { id } = req.params;
        const { title, author, publisher, price, original_price, image, description, category, language, subcategory, rating, sections } = req.body;

        const updateResult = await sql`
            UPDATE books SET
                title = ${title},
                author = ${author},
                publisher = ${publisher || 'ABC Publishing'},
                price = ${price},
                original_price = ${original_price || null},
                image = ${image || null},
                description = ${description || ''},
                category = ${category || language || 'General'},
                language = ${language || 'Urdu'},
                subcategory = ${subcategory || ''},
                rating = ${rating || 4.5},
                updated_at = NOW()
            WHERE id = ${id}
        `;

        if (updateResult.affectedRows === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        const bookResult = await sql`SELECT * FROM books WHERE id = ${id}`;
        const book = bookResult[0];

        // Update sections if provided
        if (sections && Array.isArray(sections)) {
            // Remove old sections
            await sql`DELETE FROM book_sections WHERE book_id = ${id}`;

            // Add new sections
            for (const section of sections) {
                await sql`
                    INSERT INTO book_sections (book_id, section_name) 
                    VALUES (${book.id}, ${section})
                `;
            }
        }

        res.json({ book, message: 'Book updated successfully' });
    } catch (error) {
        console.error('Update book error:', error);
        res.status(500).json({ error: 'Failed to update book' });
    }
});

// Delete book (admin only - requires admin authentication)
router.delete('/:id', authenticateAdmin, async (req, res) => {
    try {
        const sql = req.sql;
        const { id } = req.params;

        await sql`DELETE FROM book_sections WHERE book_id = ${id}`;
        const deleteResult = await sql`DELETE FROM books WHERE id = ${id}`;

        if (deleteResult.affectedRows === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        res.json({ message: 'Book deleted successfully' });
    } catch (error) {
        console.error('Delete book error:', error);
        res.status(500).json({ error: 'Failed to delete book' });
    }
});

module.exports = router;
