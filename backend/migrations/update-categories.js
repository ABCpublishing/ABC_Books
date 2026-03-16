// ===== Update Categories Schema =====
// This migration creates a proper category/subcategory system with Languages as main categories

require('dotenv').config({ path: __dirname + '/../.env' });
const { neon } = require('@neondatabase/serverless');

async function updateCategoriesSchema() {
    console.log('🔄 Updating categories schema...');

    const sql = neon(process.env.DATABASE_URL);

    try {
        // Drop old categories table and recreate with proper structure
        console.log('📦 Recreating categories table...');

        // First, check if there's a foreign key on books.category
        // We'll add a new column for language instead

        // Add language column to books table
        console.log('Adding language column to books table...');
        await sql`
            ALTER TABLE books 
            ADD COLUMN IF NOT EXISTS language VARCHAR(20) DEFAULT 'Urdu'
        `;
        console.log('✅ Language column added');

        // Add subcategory column to books table
        console.log('Adding subcategory column to books table...');
        await sql`
            ALTER TABLE books 
            ADD COLUMN IF NOT EXISTS subcategory VARCHAR(100)
        `;
        console.log('✅ Subcategory column added');

        // Create new categories table structure
        console.log('Updating categories table...');
        await sql`
            DROP TABLE IF EXISTS categories CASCADE
        `;

        await sql`
            CREATE TABLE categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                slug VARCHAR(100) NOT NULL UNIQUE,
                icon VARCHAR(50) DEFAULT 'fa-book',
                parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
                is_language BOOLEAN DEFAULT false,
                display_order INTEGER DEFAULT 0,
                visible BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `;
        console.log('✅ Categories table recreated');

        // Create indexes for performance
        console.log('Creating indexes...');
        await sql`CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_books_language ON books(language)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_books_subcategory ON books(subcategory)`;
        console.log('✅ Indexes created');

        // Insert main language categories
        console.log('\n📚 Adding main language categories...');

        // Urdu
        await sql`
            INSERT INTO categories (name, slug, icon, is_language, display_order)
            VALUES ('Urdu', 'urdu', 'fa-book-open', true, 1)
            ON CONFLICT (slug) DO NOTHING
        `;
        console.log('✅ Urdu category added');

        // English  
        await sql`
            INSERT INTO categories (name, slug, icon, is_language, display_order)
            VALUES ('English', 'english', 'fa-language', true, 2)
            ON CONFLICT (slug) DO NOTHING
        `;
        console.log('✅ English category added');

        // Arabic
        await sql`
            INSERT INTO categories (name, slug, icon, is_language, display_order)
            VALUES ('Arabic', 'arabic', 'fa-quran', true, 3)
            ON CONFLICT (slug) DO NOTHING
        `;
        console.log('✅ Arabic category added');

        // Get the language category IDs
        const languages = await sql`SELECT id, slug FROM categories WHERE is_language = true`;
        const urduId = languages.find(l => l.slug === 'urdu')?.id;
        const englishId = languages.find(l => l.slug === 'english')?.id;
        const arabicId = languages.find(l => l.slug === 'arabic')?.id;

        // Add subcategories for each language
        console.log('\n📂 Adding subcategories...');

        // Urdu subcategories
        const urduSubcategories = [
            { name: 'Quran & Tafsir', slug: 'quran-tafsir', icon: 'fa-book-quran' },
            { name: 'Hadith', slug: 'hadith', icon: 'fa-scroll' },
            { name: 'Biography', slug: 'biography', icon: 'fa-user' },
            { name: 'Creed & Fiqh', slug: 'creed-fiqh', icon: 'fa-balance-scale' },
            { name: 'Hajj & Umrah', slug: 'hajj-umrah', icon: 'fa-kaaba' },
            { name: 'Salah & Supplication', slug: 'salah-supplication', icon: 'fa-pray' },
            { name: 'Ramadan', slug: 'ramadan', icon: 'fa-moon' },
            { name: 'Women & Children', slug: 'women-children', icon: 'fa-users' },
            { name: 'History', slug: 'history', icon: 'fa-landmark' },
            { name: 'School Books', slug: 'school-books', icon: 'fa-school' },
            { name: 'Competitive & Entrance', slug: 'competitive-entrance', icon: 'fa-trophy' },
            { name: 'Higher Education', slug: 'higher-education', icon: 'fa-graduation-cap' },
            { name: 'Literature & Fiction', slug: 'literature-fiction', icon: 'fa-feather' },
            { name: 'Stationery', slug: 'stationery', icon: 'fa-pencil' }
        ];

        // English subcategories (with Academic, no Self-Help)
        const englishSubcategories = [
            { name: 'Quran & Tafsir', slug: 'quran-tafsir', icon: 'fa-book-quran' },
            { name: 'Hadith', slug: 'hadith', icon: 'fa-scroll' },
            { name: 'Biography', slug: 'biography', icon: 'fa-user' },
            { name: 'Creed & Fiqh', slug: 'creed-fiqh', icon: 'fa-balance-scale' },
            { name: 'Hajj & Umrah', slug: 'hajj-umrah', icon: 'fa-kaaba' },
            { name: 'Salah & Supplication', slug: 'salah-supplication', icon: 'fa-pray' },
            { name: 'Ramadan', slug: 'ramadan', icon: 'fa-moon' },
            { name: 'Women & Children', slug: 'women-children', icon: 'fa-users' },
            { name: 'History', slug: 'history', icon: 'fa-landmark' },
            { name: 'Academic', slug: 'academic', icon: 'fa-university' },
            { name: 'School Books', slug: 'school-books', icon: 'fa-school' },
            { name: 'Competitive & Entrance', slug: 'competitive-entrance', icon: 'fa-trophy' },
            { name: 'Higher Education', slug: 'higher-education', icon: 'fa-graduation-cap' },
            { name: 'Literature & Fiction', slug: 'literature-fiction', icon: 'fa-feather' },
            { name: 'Stationery', slug: 'stationery', icon: 'fa-pencil' }
        ];

        // Arabic subcategories (focused on Arabic Islamic content)
        const arabicSubcategories = [
            { name: 'Quran & Tafsir', slug: 'quran-tafsir', icon: 'fa-book-quran' },
            { name: 'Hadith', slug: 'hadith', icon: 'fa-scroll' },
            { name: 'Biography', slug: 'biography', icon: 'fa-user' },
            { name: 'Creed & Fiqh', slug: 'creed-fiqh', icon: 'fa-balance-scale' },
            { name: 'Hajj & Umrah', slug: 'hajj-umrah', icon: 'fa-kaaba' },
            { name: 'Salah & Supplication', slug: 'salah-supplication', icon: 'fa-pray' },
            { name: 'Ramadan', slug: 'ramadan', icon: 'fa-moon' },
            { name: 'Women & Children', slug: 'women-children', icon: 'fa-users' },
            { name: 'History', slug: 'history', icon: 'fa-landmark' },
            { name: 'Arabic Grammar', slug: 'arabic-grammar', icon: 'fa-spell-check' },
            { name: 'Arabic Literature', slug: 'arabic-literature', icon: 'fa-feather' },
            { name: 'Dictionaries', slug: 'dictionaries', icon: 'fa-book' }
        ];

        // Add subcategories for Urdu
        for (let i = 0; i < urduSubcategories.length; i++) {
            const sub = urduSubcategories[i];
            await sql`
                INSERT INTO categories (name, slug, icon, parent_id, display_order)
                VALUES (${sub.name}, ${'urdu-' + sub.slug}, ${sub.icon}, ${urduId}, ${i + 1})
                ON CONFLICT (slug) DO NOTHING
            `;
        }
        console.log('✅ Urdu subcategories added');

        // Add subcategories for English
        for (let i = 0; i < englishSubcategories.length; i++) {
            const sub = englishSubcategories[i];
            await sql`
                INSERT INTO categories (name, slug, icon, parent_id, display_order)
                VALUES (${sub.name}, ${'english-' + sub.slug}, ${sub.icon}, ${englishId}, ${i + 1})
                ON CONFLICT (slug) DO NOTHING
            `;
        }
        console.log('✅ English subcategories added');

        // Add subcategories for Arabic
        for (let i = 0; i < arabicSubcategories.length; i++) {
            const sub = arabicSubcategories[i];
            await sql`
                INSERT INTO categories (name, slug, icon, parent_id, display_order)
                VALUES (${sub.name}, ${'arabic-' + sub.slug}, ${sub.icon}, ${arabicId}, ${i + 1})
                ON CONFLICT (slug) DO NOTHING
            `;
        }
        console.log('✅ Arabic subcategories added');

        // Show summary
        const totalCategories = await sql`SELECT COUNT(*) as count FROM categories`;
        const mainCategories = await sql`SELECT COUNT(*) as count FROM categories WHERE is_language = true`;
        const subCategories = await sql`SELECT COUNT(*) as count FROM categories WHERE parent_id IS NOT NULL`;

        console.log('\n🎉 Categories schema updated successfully!');
        console.log('\n📊 Summary:');
        console.log(`   - Main Categories (Languages): ${mainCategories[0].count}`);
        console.log(`   - Subcategories: ${subCategories[0].count}`);
        console.log(`   - Total Categories: ${totalCategories[0].count}`);

    } catch (error) {
        console.error('❌ Error updating categories schema:', error);
        process.exit(1);
    }
}

// Run the migration
updateCategoriesSchema();
