require('dotenv').config({ path: './backend/.env' });
const { neon } = require('@neondatabase/serverless');

const sqlAdmin = neon(process.env.DATABASE_URL_ADMIN);

const categories = {
    'Urdu': ['Quran & Tafsir', 'Hadith', 'Biography', 'Creed & Fiqh', 'Literature & Fiction'],
    'English': ['Quran & Tafsir', 'Hadith', 'Academic', 'Literature & Fiction', 'Biographies'],
    'Arabic': ['Quran & Tafsir', 'Hadith', 'Arabic Grammar', 'Arabic Literature', 'Dictionaries'],
    'Kashmiri': ['General']
};

async function seedCategories() {
    console.log('Seeding categories...');
    try {
        for (const [langName, subcats] of Object.entries(categories)) {
            const langSlug = langName.toLowerCase();
            
            // Upsert the main language category
            let langRs = await sqlAdmin`
                INSERT INTO categories (name, slug, is_language, parent_id)
                VALUES (${langName}, ${langSlug}, true, -1)
                ON CONFLICT (slug) DO UPDATE SET name = ${langName}, is_language = true, parent_id = -1
                RETURNING id;
            `;
            const langId = langRs[0].id;
            console.log(`Language created: ${langName} (ID: ${langId})`);
            
            for (const subcat of subcats) {
                // To prevent slug collisions across languages, we append the langId as prefix
                // e.g. "1-quran-tafsir"
                const cleanSlug = subcat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                const subcatSlug = `${langId}-${cleanSlug}`;
                
                await sqlAdmin`
                    INSERT INTO categories (name, slug, is_language, parent_id)
                    VALUES (${subcat}, ${subcatSlug}, false, ${langId})
                    ON CONFLICT (slug) DO UPDATE SET name = ${subcat}, parent_id = ${langId}
                `;
                console.log(`  - Subcategory created: ${subcat} (Slug: ${subcatSlug})`);
            }
        }
        console.log('Categories seeded successfully!');
    } catch (e) {
        console.error('Error seeding categories:', e);
    }
}

seedCategories();
