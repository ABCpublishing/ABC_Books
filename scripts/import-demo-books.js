// ===== Import Demo Books to Neon Database =====
require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

// Demo Islamic Books
const DEMO_BOOKS = [
    {
        id: 'book_quran_1',
        title: 'The Holy Quran (Arabic-English)',
        author: 'Divine Revelation',
        category: 'Islamic',
        price: 299,
        original_price: 499,
        image: 'https://m.media-amazon.com/images/I/71xKk7+9jPL._AC_UF1000,1000_QL80_.jpg',
        description: 'The complete Holy Quran with Arabic text and English translation.',
        rating: 5.0
    },
    {
        id: 'book_tafsir_1',
        title: 'Tafsir Ibn Kathir (Complete)',
        author: 'Ibn Kathir',
        category: 'Islamic',
        price: 1299,
        original_price: 1799,
        image: 'https://m.media-amazon.com/images/I/71N8rVXxMIL._AC_UF1000,1000_QL80_.jpg',
        description: 'The most popular Tafsir in the world. Comprehensive commentary on the Holy Quran.',
        rating: 4.9
    },
    {
        id: 'book_hadith_1',
        title: 'Sahih Bukhari (Complete)',
        author: 'Imam Bukhari',
        category: 'Islamic',
        price: 899,
        original_price: 1299,
        image: 'https://m.media-amazon.com/images/I/71VvXzKfRiL._AC_UF1000,1000_QL80_.jpg',
        description: 'The most authentic collection of Hadith.',
        rating: 5.0
    },
    {
        id: 'book_hadith_2',
        title: 'Riyadh-us-Saliheen',
        author: 'Imam Nawawi',
        category: 'Islamic',
        price: 399,
        original_price: 599,
        image: 'https://m.media-amazon.com/images/I/71TqI5cGqfL._AC_UF1000,1000_QL80_.jpg',
        description: 'Gardens of the Righteous - A collection of authentic hadiths.',
        rating: 4.9
    },
    {
        id: 'book_seerah_1',
        title: 'The Sealed Nectar (Ar-Raheeq Al-Makhtum)',
        author: 'Safiur Rahman Mubarakpuri',
        category: 'Islamic',
        price: 449,
        original_price: 699,
        image: 'https://m.media-amazon.com/images/I/81V6hF8TPIL._AC_UF1000,1000_QL80_.jpg',
        description: 'Award-winning biography of Prophet Muhammad (PBUH).',
        rating: 4.8
    },
    {
        id: 'book_seerah_2',
        title: 'In the Footsteps of the Prophet',
        author: 'Tariq Ramadan',
        category: 'Islamic',
        price: 599,
        original_price: 899,
        image: 'https://m.media-amazon.com/images/I/71U0H4DTDEL._AC_UF1000,1000_QL80_.jpg',
        description: 'A contemporary look at the life and teachings of Prophet Muhammad (PBUH).',
        rating: 4.7
    },
    {
        id: 'book_dua_1',
        title: 'Fortress of the Muslim (Hisnul Muslim)',
        author: 'Said bin Ali bin Wahf Al-Qahtani',
        category: 'Islamic',
        price: 199,
        original_price: 299,
        image: 'https://m.media-amazon.com/images/I/71rPqBOLHkL._AC_UF1000,1000_QL80_.jpg',
        description: 'Essential daily duas and supplications from Quran and Sunnah.',
        rating: 4.9
    },
    {
        id: 'book_english_1',
        title: 'Purification of the Heart',
        author: 'Hamza Yusuf',
        category: 'English',
        price: 549,
        original_price: 799,
        image: 'https://m.media-amazon.com/images/I/71wXQn+EIVL._AC_UF1000,1000_QL80_.jpg',
        description: 'A spiritual guide to purifying the heart from diseases.',
        rating: 4.9
    },
    {
        id: 'book_english_2',
        title: 'The Book of Assistance',
        author: 'Imam Al-Haddad',
        category: 'English',
        price: 399,
        original_price: 599,
        image: 'https://m.media-amazon.com/images/I/71PYa0qXxjL._AC_UF1000,1000_QL80_.jpg',
        description: 'A guide to Islamic spirituality and self-improvement.',
        rating: 4.8
    },
    {
        id: 'book_english_3',
        title: 'The Lives of the Prophets',
        author: 'Ibn Kathir',
        category: 'English',
        price: 699,
        original_price: 999,
        image: 'https://m.media-amazon.com/images/I/71eQ7rxI9ML._AC_UF1000,1000_QL80_.jpg',
        description: 'Complete stories of all prophets mentioned in the Quran.',
        rating: 4.8
    }
];

async function importDemoBooks() {
    console.log('🔄 Connecting to Neon database...\n');

    const sql = neon(process.env.DATABASE_URL);

    try {
        console.log('📚 Importing demo books to database...\n');

        let imported = 0;
        let skipped = 0;

        for (const book of DEMO_BOOKS) {
            try {
                // Check if book already exists
                const existing = await sql`
                    SELECT id FROM books WHERE isbn = ${book.id}
                `;

                if (existing.length > 0) {
                    console.log(`⏭️  Skipped: ${book.title} (already exists)`);
                    skipped++;
                    continue;
                }

                // Insert book
                await sql`
                    INSERT INTO books (
                        title, author, price, original_price, image, 
                        description, category, isbn, rating
                    ) VALUES (
                        ${book.title}, ${book.author}, ${book.price}, 
                        ${book.original_price}, ${book.image}, ${book.description}, 
                        ${book.category}, ${book.id}, ${book.rating}
                    )
                `;

                console.log(`✅ Imported: ${book.title}`);
                imported++;

            } catch (error) {
                console.error(`❌ Error importing ${book.title}:`, error.message);
            }
        }

        console.log('\n🎉 Import complete!');
        console.log(`📊 Summary:`);
        console.log(`   ✅ Imported: ${imported} books`);
        console.log(`   ⏭️  Skipped: ${skipped} books`);
        console.log(`   📚 Total: ${DEMO_BOOKS.length} books`);

        // Verify
        const count = await sql`SELECT COUNT(*) as total FROM books`;
        console.log(`\n📚 Total books in database: ${count[0].total}`);

    } catch (error) {
        console.error('❌ Error importing books:', error);
        process.exit(1);
    }
}

importDemoBooks();
