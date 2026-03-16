require('dotenv').config();
const mysql = require('mysql2/promise');

async function seedCategories() {
    console.log('🔄 Connecting to MySQL database...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'abc_books'
    });

    try {
        console.log('🌱 Seeding default categories...');

        const languages = [
            { name: 'Urdu', slug: 'urdu', icon: 'fa-book-open', is_language: true, display_order: 1 },
            { name: 'English', slug: 'english', icon: 'fa-language', is_language: true, display_order: 2 },
            { name: 'Arabic', slug: 'arabic', icon: 'fa-quran', is_language: true, display_order: 3 },
            { name: 'Kashmiri', slug: 'kashmiri', icon: 'fa-mountain', is_language: true, display_order: 4 }
        ];

        for (const lang of languages) {
            // Check if exists
            const [existing] = await connection.query('SELECT id FROM categories WHERE slug = ?', [lang.slug]);
            
            let langId;
            if (existing.length === 0) {
                console.log(`Adding language: ${lang.name}...`);
                const [result] = await connection.query(
                    'INSERT INTO categories (name, slug, icon, is_language, display_order) VALUES (?, ?, ?, ?, ?)',
                    [lang.name, lang.slug, lang.icon, lang.is_language, lang.display_order]
                );
                langId = result.insertId;
            } else {
                langId = existing[0].id;
                console.log(`Language ${lang.name} already exists.`);
            }

            // Add subcategories
            const subcategories = getSubcategoriesFor(lang.name);
            for (const sub of subcategories) {
                const subSlug = `${lang.slug}-${sub.toLowerCase().replace(/\s+/g, '-')}`;
                const [existingSub] = await connection.query('SELECT id FROM categories WHERE slug = ?', [subSlug]);
                
                if (existingSub.length === 0) {
                    console.log(`  Adding subcategory: ${sub} to ${lang.name}...`);
                    await connection.query(
                        'INSERT INTO categories (name, slug, parent_id, is_language, display_order) VALUES (?, ?, ?, ?, ?)',
                        [sub, subSlug, langId, false, 0]
                    );
                }
            }
        }

        console.log('🎉 Seeding complete!');
        await connection.end();
    } catch (e) {
        console.error('❌ Error seeding:', e);
        await connection.end();
    }
}

function getSubcategoriesFor(lang) {
    switch (lang) {
        case 'Urdu':
            return ['Quran & Tafsir', 'Hadith', 'Biography', 'Creed & Fiqh', 'Literature & Fiction', 'History', 'Children'];
        case 'English':
            return ['Quran & Tafsir', 'Hadith', 'Biography', 'Literature & Fiction', 'Academic', 'History', 'General'];
        case 'Arabic':
            return ['Quran & Tafsir', 'Hadith', 'Arabic Grammar', 'Arabic Literature', 'Dictionaries'];
        case 'Kashmiri':
            return ['Literature', 'General'];
        default:
            return [];
    }
}

seedCategories();
