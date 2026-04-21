// ===== Categories Routes (PostgreSQL / Admin DB) =====
const express = require('express');
const { authenticateAdmin } = require('../middleware/security');
const router = express.Router();

// Setup standard categories
router.get('/seed', async (req, res) => {
    try {
        const sql = req.db.admin;
        const defaultCategories = {
            'Urdu': ['Quran & Tafsir', 'Hadith', 'Biography', 'Creed & Fiqh', 'Literature & Fiction'],
            'English': ['Quran & Tafsir', 'Hadith', 'Academic', 'Literature & Fiction', 'Biographies'],
            'Arabic': ['Quran & Tafsir', 'Hadith', 'Arabic Grammar', 'Arabic Literature', 'Dictionaries'],
            'Kashmiri': ['General']
        };

        const results = [];

        for (const [langName, subcats] of Object.entries(defaultCategories)) {
            const langSlug = langName.toLowerCase();
            
            // Insert language
            const langRs = await sql`
                INSERT INTO categories (name, slug, is_language, parent_id)
                VALUES (${langName}, ${langSlug}, true, -1)
                ON CONFLICT (slug) DO UPDATE SET name = ${langName}, is_language = true, parent_id = -1
                RETURNING id;
            `;
            const langId = langRs[0].id;
            results.push({ type: 'language', name: langName, id: langId });
            
            for (const subcat of subcats) {
                const subcatSlug = `${langId}-out-${subcat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
                const subRs = await sql`
                    INSERT INTO categories (name, slug, is_language, parent_id)
                    VALUES (${subcat}, ${subcatSlug}, false, ${langId})
                    ON CONFLICT (slug) DO UPDATE SET name = ${subcat}, parent_id = ${langId}
                    RETURNING id, name;
                `;
                results.push({ type: 'subcategory', parent: langName, name: subcat, slug: subcatSlug });
            }
        }
        res.json({ success: true, message: 'Categories seeded', results });
    } catch (error) {
        console.error('Seed categories error:', error);
        res.status(500).json({ error: 'Failed to seed categories', details: error.message });
    }
});

// Get all categories
router.get('/', async (req, res) => {
    try {
        const sql = req.db.admin;

        const categories = await sql`
            SELECT * FROM categories 
            WHERE visible = true
            ORDER BY is_language DESC, display_order ASC
        `;

        const languages = categories.filter(c => c.is_language);
        const subcategories = categories.filter(c => !c.is_language);

        const organized = languages.map(lang => ({
            ...lang,
            subcategories: subcategories.filter(sub => sub.parent_id === lang.id)
        }));

        res.json({
            categories: organized,
            all: categories
        });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Failed to get categories' });
    }
});

// Get languages only
router.get('/languages', async (req, res) => {
    try {
        const sql = req.db.admin;

        const languages = await sql`
            SELECT * FROM categories 
            WHERE is_language = true AND visible = true
            ORDER BY display_order ASC
        `;

        res.json({ languages });
    } catch (error) {
        console.error('Get languages error:', error);
        res.status(500).json({ error: 'Failed to get languages' });
    }
});

// Get subcategories for a specific language
router.get('/language/:languageSlug', async (req, res) => {
    try {
        const sql = req.db.admin;
        const { languageSlug } = req.params;

        const languages = await sql`
            SELECT * FROM categories 
            WHERE LOWER(slug) = LOWER(${languageSlug}) AND is_language = true
        `;

        if (languages.length === 0) {
            return res.status(404).json({ error: 'Language not found' });
        }

        const language = languages[0];

        const subcategories = await sql`
            SELECT * FROM categories 
            WHERE parent_id = ${language.id} AND visible = true
            ORDER BY display_order ASC
        `;

        res.json({ language, subcategories });
    } catch (error) {
        console.error('Get language subcategories error:', error);
        res.status(500).json({ error: 'Failed to get subcategories' });
    }
});

// Get category by ID
router.get('/:id', async (req, res) => {
    try {
        const sql = req.db.admin;
        const { id } = req.params;

        const categories = await sql`
            SELECT c.*, 
                   p.name as parent_name, 
                   p.slug as parent_slug
            FROM categories c
            LEFT JOIN categories p ON c.parent_id = p.id
            WHERE c.id = ${id}
        `;

        if (categories.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({ category: categories[0] });
    } catch (error) {
        console.error('Get category error:', error);
        res.status(500).json({ error: 'Failed to get category' });
    }
});

// Add new category
router.post('/', authenticateAdmin, async (req, res) => {
    try {
        const sql = req.db.admin;
        const { name, slug, icon, parent_id, is_language, display_order, visible } = req.body;

        const categorySlug = slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

        const result = await sql`
            INSERT INTO categories (name, slug, icon, parent_id, is_language, display_order, visible)
            VALUES (
                ${name}, 
                ${categorySlug}, 
                ${icon || 'fa-book'}, 
                ${parent_id || null}, 
                ${is_language || false},
                ${display_order || 0},
                ${visible !== false}
            )
            RETURNING *
        `;

        res.status(201).json({
            category: result[0],
            message: 'Category added successfully'
        });
    } catch (error) {
        console.error('Add category error:', error);
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Category slug already exists. Please choose a unique name.' });
        }
        res.status(500).json({ error: 'Failed to add category (' + error.message + ')' });
    }
});

// Update category
router.put('/:id', authenticateAdmin, async (req, res) => {
    try {
        const sql = req.db.admin;
        const { id } = req.params;
        const { name, slug, icon, parent_id, is_language, display_order, visible } = req.body;

        const result = await sql`
            UPDATE categories SET
                name = ${name},
                slug = ${slug},
                icon = ${icon || 'fa-book'},
                parent_id = ${parent_id || null},
                is_language = ${is_language || false},
                display_order = ${display_order || 0},
                visible = ${visible !== false},
                updated_at = NOW()
            WHERE id = ${id}
            RETURNING *
        `;

        if (result.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        res.json({
            category: result[0],
            message: 'Category updated successfully'
        });
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: 'Failed to update category' });
    }
});

// Delete category
router.delete('/:id', authenticateAdmin, async (req, res) => {
    try {
        const sql = req.db.admin;
        const { id } = req.params;

        const category = await sql`SELECT * FROM categories WHERE id = ${id}`;
        if (category.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }

        if (category[0].is_language) {
            const subcategories = await sql`SELECT COUNT(*)::int as count FROM categories WHERE parent_id = ${id}`;
            if (parseInt(subcategories[0].count) > 0) {
                return res.status(400).json({
                    error: 'Cannot delete language category with subcategories. Delete subcategories first.'
                });
            }
        }

        await sql`DELETE FROM categories WHERE id = ${id}`;

        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

// Get books by language - queries the appropriate book DB
router.get('/books/language/:language', async (req, res) => {
    try {
        const { language } = req.params;
        const { limit = 50 } = req.query;
        const parsedLimit = parseInt(limit) || 50;

        const bookDb = req.db.getBookDb(language);
        if (!bookDb) {
            return res.json({ books: [], count: 0 });
        }

        const books = await bookDb`
            SELECT * FROM books 
            ORDER BY created_at DESC
            LIMIT ${parsedLimit}
        `;

        res.json({ books, count: books.length });
    } catch (error) {
        console.error('Get books by language error:', error);
        res.status(500).json({ error: 'Failed to get books' });
    }
});

// Get books by language and subcategory
router.get('/books/:language/:subcategory', async (req, res) => {
    try {
        const { language, subcategory } = req.params;
        const { limit = 50 } = req.query;
        const parsedLimit = parseInt(limit) || 50;

        const bookDb = req.db.getBookDb(language);
        if (!bookDb) {
            return res.json({ books: [], count: 0 });
        }

        const books = await bookDb`
            SELECT * FROM books 
            WHERE LOWER(subcategory) = LOWER(${subcategory})
            ORDER BY created_at DESC
            LIMIT ${parsedLimit}
        `;

        res.json({ books, count: books.length });
    } catch (error) {
        console.error('Get books by language and subcategory error:', error);
        res.status(500).json({ error: 'Failed to get books' });
    }
});

module.exports = router;
