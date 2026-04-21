require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL_ADMIN,
    ssl: { rejectUnauthorized: false }
});

const defaultCategories = {
    'Urdu': ['Quran & Tafsir', 'Hadith', 'Biography', 'Creed & Fiqh', 'Literature & Fiction'],
    'English': ['Quran & Tafsir', 'Hadith', 'Academic', 'Literature & Fiction', 'Biographies'],
    'Arabic': ['Quran & Tafsir', 'Hadith', 'Arabic Grammar', 'Arabic Literature', 'Dictionaries'],
    'Kashmiri': ['General']
};

async function seedCategories() {
    console.log('Seeding categories via pg pool...');
    try {
        for (const [langName, subcats] of Object.entries(defaultCategories)) {
            const langSlug = langName.toLowerCase();
            
            // Upsert the main language category
            const langRs = await pool.query(
                `INSERT INTO categories (name, slug, is_language, parent_id)
                 VALUES ($1, $2, true, -1)
                 ON CONFLICT (slug) DO UPDATE SET name = $1, is_language = true, parent_id = -1
                 RETURNING id`, 
                 [langName, langSlug]
            );
            const langId = langRs.rows[0].id;
            console.log(`Language created: ${langName} (ID: ${langId})`);
            
            for (const subcat of subcats) {
                const subcatSlug = `${langId}-out-${subcat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
                await pool.query(
                    `INSERT INTO categories (name, slug, is_language, parent_id)
                     VALUES ($1, $2, false, $3)
                     ON CONFLICT (slug) DO UPDATE SET name = $1, parent_id = $3`,
                     [subcat, subcatSlug, langId]
                );
                console.log(`  - Subcategory created: ${subcat} (Slug: ${subcatSlug})`);
            }
        }
        console.log('Categories seeded successfully!');
    } catch (e) {
        console.error('Error seeding categories:', e);
    } finally {
        await pool.end();
    }
}

seedCategories();
