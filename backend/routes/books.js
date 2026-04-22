// ===== Books Routes (Multi-Database) =====
// Books are split across 3 Neon databases: English, Urdu, Arabic
const express = require('express');
const { authenticateAdmin } = require('../middleware/security');
const router = express.Router();

// ===== Helper: Determine which DB to use based on language/category =====
function resolveBookDb(req, language) {
    const db = req.db.getBookDb(language);
    if (db) return { db, language: language.toLowerCase() };
    // Default to English if not specified
    return { db: req.db.english, language: 'english' };
}

// ===== Helper: Query all book databases and merge results =====
async function queryAllBookDbs(req, queryBuilder) {
    const allDbs = req.db.getAllBookDbs();
    const results = await Promise.allSettled(
        allDbs.map(async ({ name, query }) => {
            try {
                const rows = await queryBuilder(query, name.toLowerCase());
                return rows.map(row => ({ ...row, db_source: name.toLowerCase() }));
            } catch (err) {
                console.error(`❌ Error querying ${name} DB:`, err.message);
                return [];
            }
        })
    );
    
    // Flatten all fulfilled results
    return results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value);
}

// Get all books with sections (merges from all DBs)
router.get('/', async (req, res) => {
    try {
        const { category, language, search, subcategory, limit = 100 } = req.query;
        const parsedLimit = parseInt(limit) || 100;

        let books;

        // If a specific language/category is specified, query only that DB
        const targetLang = language || category;
        if (targetLang && req.db.pools && req.db.pools[targetLang.toLowerCase()]) {
            const pool = req.db.pools[targetLang.toLowerCase()];
            
            let sql = `
                SELECT b.*, 
                       STRING_AGG(bs.section_name, ',') as sections_str
                FROM books b
                LEFT JOIN book_sections bs ON b.id = bs.book_id
                WHERE 1=1
            `;
            const params = [];
            
            if (search) {
                params.push('%' + search + '%');
                sql += ` AND (b.title ILIKE $${params.length} OR b.author ILIKE $${params.length} OR b.description ILIKE $${params.length})`;
            }
            if (subcategory) {
                params.push(subcategory);
                sql += ` AND b.subcategory = $${params.length}`;
            }
            
            sql += `
                GROUP BY b.id
                ORDER BY b.created_at DESC
                LIMIT $${params.length + 1}
            `;
            params.push(parsedLimit);

            const result = await pool.query(sql, params);
            books = result.rows || [];
            books = books.map(b => ({ ...b, db_source: targetLang.toLowerCase() }));
        } else {
            // No specific book-db mapping found (e.g., Kashmiri, or multiple) - query ALL databases and merge
            books = await queryAllBookDbs(req, async (dbQuery, dbName) => {
                let sql = `
                    SELECT b.*, 
                           STRING_AGG(bs.section_name, ',') as sections_str
                    FROM books b
                    LEFT JOIN book_sections bs ON b.id = bs.book_id
                    WHERE 1=1
                `;
                const params = [];
                
                if (search) {
                    params.push('%' + search + '%');
                    sql += ` AND (b.title ILIKE $${params.length} OR b.author ILIKE $${params.length} OR b.description ILIKE $${params.length})`;
                }
                
                if (language) {
                    params.push(language);
                    sql += ` AND b.language = $${params.length}`;
                }
                
                if (subcategory) {
                    params.push(subcategory);
                    sql += ` AND b.subcategory = $${params.length}`;
                }
                
                sql += `
                    GROUP BY b.id
                    ORDER BY b.created_at DESC
                    LIMIT $${params.length + 1}
                `;
                params.push(parsedLimit);
                
                // Use the pool's query method since our query helper doesn't support raw SQL strings easily for dynamic building
                const result = await req.db.pools[dbName].query(sql, params);
                return result.rows;
            });
        }

        // Convert STRING_AGG string to array
        const formattedBooks = books.map(b => ({
            ...b,
            sections: b.sections_str ? b.sections_str.split(',') : []
        }));

        // Sort merged results by created_at DESC
        formattedBooks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json({ books: formattedBooks });
    } catch (error) {
        console.error('Get books error:', error);
        res.status(500).json({ error: 'Failed to get books' });
    }
});

// Get books by section (hero, featured, trending, etc.) - queries ALL DBs
router.get('/section/:section', async (req, res) => {
    try {
        const { section } = req.params;
        console.log(`📚 Fetching books for section: ${section}`);

        const books = await queryAllBookDbs(req, async (dbQuery) => {
            return await dbQuery`
                SELECT b.* FROM books b
                INNER JOIN book_sections bs ON b.id = bs.book_id
                WHERE bs.section_name = ${section}
                ORDER BY bs.display_order ASC
            `;
        });

        console.log(`✅ Found ${books.length} books in ${section} section`);
        res.json({ books });
    } catch (error) {
        console.error('Get section books error:', error);
        res.status(500).json({ error: 'Failed to get section books' });
    }
});

// Get book by ID - searches all DBs if no language specified
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { lang, language, db_source } = req.query;
        const targetLang = lang || language || db_source;

        let books = [];

        if (targetLang && req.db.getBookDb(targetLang)) {
            // Query specific DB
            const bookDb = req.db.getBookDb(targetLang);
            books = await bookDb`
                SELECT b.*, 
                       STRING_AGG(bs.section_name, ',') as sections_str
                FROM books b
                LEFT JOIN book_sections bs ON b.id = bs.book_id
                WHERE b.id = ${id}
                GROUP BY b.id
            `;
            books = books.map(b => ({ ...b, db_source: targetLang.toLowerCase() }));
        } else {
            // Search all DBs
            books = await queryAllBookDbs(req, async (dbQuery) => {
                return await dbQuery`
                    SELECT b.*, 
                           STRING_AGG(bs.section_name, ',') as sections_str
                    FROM books b
                    LEFT JOIN book_sections bs ON b.id = bs.book_id
                    WHERE b.id = ${id}
                    GROUP BY b.id
                `;
            });
        }

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

// Add new book (admin only)
router.post('/', authenticateAdmin, async (req, res) => {
    try {
        const { title, author, publisher, price, original_price, image, description, category, language, subcategory, rating, sections } = req.body;

        // Determine target database based on language/category
        const targetLang = language || category || 'English';
        const bookDb = req.db.getBookDb(targetLang) || req.db.english;
        const dbSource = (targetLang || 'english').toLowerCase();

        const insertResult = await bookDb`
            INSERT INTO books (title, author, publisher, price, original_price, image, description, category, language, subcategory, rating)
            VALUES (${title}, ${author}, ${publisher || 'ABC Publishing'}, ${price}, ${original_price || null}, ${image || null}, ${description || ''}, ${category || language || 'General'}, ${language || 'Urdu'}, ${subcategory || ''}, ${rating || 4.5})
            RETURNING *
        `;

        const book = insertResult[0];

        // Add sections if provided
        if (sections && Array.isArray(sections) && sections.length > 0) {
            for (const section of sections) {
                await bookDb`
                    INSERT INTO book_sections (book_id, section_name) 
                    VALUES (${book.id}, ${section})
                `;
            }
        }

        book.db_source = dbSource;
        res.status(201).json({ book, message: 'Book added successfully' });
    } catch (error) {
        console.error('Add book error:', error);
        res.status(500).json({ error: 'Failed to add book', details: error.message });
    }
});

// Update book (admin only)
router.put('/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, author, publisher, price, original_price, image, description, category, language, subcategory, rating, sections, db_source } = req.body;

        // Determine target database
        const targetLang = db_source || language || category || req.query.language || 'English';
        const bookDb = req.db.getBookDb(targetLang) || req.db.english;

        const updateResult = await bookDb`
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
            RETURNING *
        `;

        if (updateResult.length === 0) {
            return res.status(404).json({ error: 'Book not found' });
        }

        const book = updateResult[0];

        // Update sections if provided
        if (sections && Array.isArray(sections)) {
            await bookDb`DELETE FROM book_sections WHERE book_id = ${id}`;
            for (const section of sections) {
                await bookDb`
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

// Delete book (admin only)
router.delete('/:id', authenticateAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { language } = req.query;

        // If language specified, delete from that DB. Otherwise try all.
        if (language && req.db.getBookDb(language)) {
            const bookDb = req.db.getBookDb(language);
            await bookDb`DELETE FROM book_sections WHERE book_id = ${id}`;
            const result = await bookDb`DELETE FROM books WHERE id = ${id}`;
            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Book not found' });
            }
        } else {
            // Try deleting from all DBs
            let deleted = false;
            const allDbs = req.db.getAllBookDbs();
            for (const { name, query: dbQuery } of allDbs) {
                try {
                    await dbQuery`DELETE FROM book_sections WHERE book_id = ${id}`;
                    const result = await dbQuery`DELETE FROM books WHERE id = ${id}`;
                    if (result.rowCount > 0) {
                        deleted = true;
                        console.log(`✅ Book ${id} deleted from ${name} DB`);
                        break;
                    }
                } catch (err) {
                    console.warn(`Could not delete from ${name}:`, err.message);
                }
            }
            if (!deleted) {
                return res.status(404).json({ error: 'Book not found in any database' });
            }
        }

        res.json({ message: 'Book deleted successfully' });
    } catch (error) {
        console.error('Delete book error:', error);
        res.status(500).json({ error: 'Failed to delete book' });
    }
});

module.exports = router;
