// Add Kashmiri Category to Database
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function addKashmiriCategory() {
    try {
        console.log('🔄 Adding Kashmiri category to database...');

        // Check if Kashmiri already exists
        const existing = await sql`SELECT * FROM categories WHERE slug = 'kashmiri'`;

        if (existing.length > 0) {
            console.log('✅ Kashmiri category already exists!');
            return;
        }

        // Add Kashmiri as a language category
        const result = await sql`
            INSERT INTO categories (name, slug, icon, is_language, display_order, visible)
            VALUES ('Kashmiri', 'kashmiri', 'fa-mountain', true, 4, true)
            RETURNING *
        `;

        console.log('✅ Kashmiri category added successfully!');
        console.log(result[0]);

        // List all categories
        const allCategories = await sql`SELECT * FROM categories WHERE is_language = true ORDER BY display_order`;
        console.log('\n📚 All Language Categories:');
        allCategories.forEach(cat => {
            console.log(`   - ${cat.name} (${cat.slug})`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

addKashmiriCategory();
