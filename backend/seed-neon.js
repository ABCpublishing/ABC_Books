require('dotenv').config();
const { Pool } = require('pg');

const DEMO_BOOKS = [
    { title: 'The Holy Quran (Arabic-English)', author: 'Divine Revelation', category: 'Islamic', language: 'Arabic', price: 299, original_price: 499, image: 'https://m.media-amazon.com/images/I/71xKk7+9jPL._AC_UF1000,1000_QL80_.jpg', description: 'The complete Holy Quran with Arabic text and English translation.', rating: 5.0 },
    { title: 'Tafsir Ibn Kathir (Complete)', author: 'Ibn Kathir', category: 'Islamic', language: 'Arabic', price: 1299, original_price: 1799, image: 'https://m.media-amazon.com/images/I/71N8rVXxMIL._AC_UF1000,1000_QL80_.jpg', description: 'The most popular Tafsir in the world. Comprehensive commentary on the Holy Quran.', rating: 4.9 },
    { title: 'Sahih Bukhari (Complete)', author: 'Imam Bukhari', category: 'Islamic', language: 'Arabic', price: 899, original_price: 1299, image: 'https://m.media-amazon.com/images/I/71VvXzKfRiL._AC_UF1000,1000_QL80_.jpg', description: 'The most authentic collection of Hadith.', rating: 5.0 },
    { title: 'Riyadh-us-Saliheen', author: 'Imam Nawawi', category: 'Islamic', language: 'Arabic', price: 399, original_price: 599, image: 'https://m.media-amazon.com/images/I/71TqI5cGqfL._AC_UF1000,1000_QL80_.jpg', description: 'Gardens of the Righteous - A collection of authentic hadiths.', rating: 4.9 },
    { title: 'The Sealed Nectar', author: 'Safiur Rahman Mubarakpuri', category: 'Islamic', language: 'Urdu', price: 449, original_price: 699, image: 'https://m.media-amazon.com/images/I/81V6hF8TPIL._AC_UF1000,1000_QL80_.jpg', description: 'Award-winning biography of Prophet Muhammad (PBUH).', rating: 4.8 },
    { title: 'In the Footsteps of the Prophet', author: 'Tariq Ramadan', category: 'Islamic', language: 'English', price: 599, original_price: 899, image: 'https://m.media-amazon.com/images/I/71U0H4DTDEL._AC_UF1000,1000_QL80_.jpg', description: 'A contemporary look at the life and teachings of Prophet Muhammad (PBUH).', rating: 4.7 },
    { title: 'Fortress of the Muslim', author: 'Said bin Ali bin Wahf', category: 'Islamic', language: 'Arabic', price: 199, original_price: 299, image: 'https://m.media-amazon.com/images/I/71rPqBOLHkL._AC_UF1000,1000_QL80_.jpg', description: 'Essential daily duas and supplications from Quran and Sunnah.', rating: 4.9 },
    { title: 'Purification of the Heart', author: 'Hamza Yusuf', category: 'Islamic', language: 'English', price: 549, original_price: 799, image: 'https://m.media-amazon.com/images/I/71wXQn+EIVL._AC_UF1000,1000_QL80_.jpg', description: 'A spiritual guide to purifying the heart from diseases.', rating: 4.9 },
    { title: 'The Book of Assistance', author: 'Imam Al-Haddad', category: 'Islamic', language: 'Urdu', price: 399, original_price: 599, image: 'https://m.media-amazon.com/images/I/71PYa0qXxjL._AC_UF1000,1000_QL80_.jpg', description: 'A guide to Islamic spirituality and self-improvement.', rating: 4.8 },
    { title: 'The Lives of the Prophets', author: 'Ibn Kathir', category: 'Islamic', language: 'English', price: 699, original_price: 999, image: 'https://m.media-amazon.com/images/I/71eQ7rxI9ML._AC_UF1000,1000_QL80_.jpg', description: 'Complete stories of all prophets mentioned in the Quran.', rating: 4.8 }
];

async function seed() {
    const pools = {
        english: new Pool({ connectionString: process.env.DATABASE_URL_ENGLISH, ssl: { rejectUnauthorized: false } }),
        urdu: new Pool({ connectionString: process.env.DATABASE_URL_URDU, ssl: { rejectUnauthorized: false } }),
        arabic: new Pool({ connectionString: process.env.DATABASE_URL_ARABIC, ssl: { rejectUnauthorized: false } })
    };

    let imported = 0;
    for (const book of DEMO_BOOKS) {
        try {
            const lang = book.language.toLowerCase();
            const pool = pools[lang] || pools.english;
            
            // Check if exists
            const existing = await pool.query('SELECT id FROM books WHERE title = $1', [book.title]);
            if (existing.rows.length === 0) {
                await pool.query(
                    `INSERT INTO books (title, author, category, language, price, original_price, image, description, rating) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                    [book.title, book.author, book.category, book.language, book.price, book.original_price, book.image, book.description, book.rating]
                );
                
                // Add to featured sections for UI visibility
                const justInserted = await pool.query('SELECT id FROM books WHERE title = $1', [book.title]);
                if (justInserted.rows.length > 0) {
                    await pool.query('INSERT INTO book_sections (book_id, section_name) VALUES ($1, $2)', [justInserted.rows[0].id, 'featured']);
                    await pool.query('INSERT INTO book_sections (book_id, section_name) VALUES ($1, $2)', [justInserted.rows[0].id, 'trending']);
                }
                
                console.log(`✅ Imported: ${book.title} (into ${lang} DB)`);
                imported++;
            } else {
                console.log(`ℹ️  Skipped: ${book.title}`);
            }
        } catch (error) {
            console.error(`❌ Error importing ${book.title}:`, error.message);
        }
    }
    console.log(`\n🎉 Seed complete! Imported: ${imported} books`);
    process.exit(0);
}
seed();
