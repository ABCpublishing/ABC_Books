// ===== Books Data - API Only (No Demo Data) =====

// Dynamic API URL (same as api.js)
const BOOKS_DATA_API_BASE = (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    ? '/api'
    : 'http://localhost:3001/api';

// ===== Book Cache =====
let _cachedBooks = null;
let _cacheTimestamp = 0;
let _fetchPromise = null; // Prevent redundant simultaneous fetches
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (RAM)
const PERSISTENT_CACHE_KEY = 'abc_books_data_cache';
const PERSISTENT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes (Storage)

// ===== Fetch All Books from Database API =====
async function fetchAllBooks() {
    const now = Date.now();

    // 1. Check RAM Cache
    if (_cachedBooks && (now - _cacheTimestamp) < CACHE_DURATION) {
        return _cachedBooks;
    }

    // 2. Check Redundant Fetching (Thundering Herd Protection)
    if (_fetchPromise) {
        return _fetchPromise;
    }

    // 3. Check Persistent Storage Cache (Initial Load Speedup)
    const stored = localStorage.getItem(PERSISTENT_CACHE_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (now - parsed.timestamp < PERSISTENT_CACHE_TTL) {
                _cachedBooks = parsed.books;
                _cacheTimestamp = parsed.timestamp;
                console.log(`⚡ Loaded ${parsed.books.length} books from persistent cache`);
                return _cachedBooks;
            }
        } catch (e) {
            localStorage.removeItem(PERSISTENT_CACHE_KEY);
        }
    }

    // 4. Perform Network Fetch
    _fetchPromise = (async () => {
        try {
            console.log('🌐 Fetching fresh book data from API...');
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('API timeout')), 5000)
            );
            const response = await Promise.race([
                fetch(`${BOOKS_DATA_API_BASE}/books?limit=1000`),
                timeoutPromise
            ]);

            if (!response.ok) throw new Error('API request failed');

            const data = await response.json();
            if (data && data.books) {
                const mappedBooks = data.books.map(book => ({
                    id: book.id,
                    title: book.title,
                    author: book.author,
                    price: parseFloat(book.price) || 0,
                    originalPrice: parseFloat(book.original_price) || parseFloat(book.price) || 0,
                    image: book.image,
                    description: book.description,
                    category: book.category,
                    subcategory: book.subcategory,
                    language: book.language,
                    rating: parseFloat(book.rating) || 4.5,
                    isbn: book.isbn,
                    year: book.publish_year,
                    publisher: book.publisher,
                    sections: book.sections || []
                }));

                _cachedBooks = mappedBooks;
                _cacheTimestamp = Date.now();

                // Save to Storage
                localStorage.setItem(PERSISTENT_CACHE_KEY, JSON.stringify({
                    timestamp: _cacheTimestamp,
                    books: _cachedBooks
                }));

                console.log(`✅ Loaded ${_cachedBooks.length} books from database`);
                return _cachedBooks;
            }
            return [];
        } catch (error) {
            console.warn('⚠️ Failed to fetch fresh books:', error.message);
            return _cachedBooks || [];
        } finally {
            _fetchPromise = null; // Reset promise for next time
        }
    })();

    return _fetchPromise;
}

// ===== Get Books for a Specific Section =====
async function getBooksForSection(section) {
    const allBooks = await fetchAllBooks();
    if (!allBooks || allBooks.length === 0) return [];

    // 1. Explicit Manual Assignment (from Admin Panel)
    // Map 'featured' to include 'editors' choice from Admin
    let dbSections = [section];
    if (section === 'featured') dbSections = ['featured', 'editors'];

    // Filter books that have this section assigned
    const explicitBooks = allBooks.filter(b => b.sections && dbSections.some(s => b.sections.includes(s)));

    // 2. Automatic Rule-based Fallback
    const sortedByNewest = [...allBooks].sort((a, b) => b.id - a.id);
    const sortedByRating = [...allBooks].sort((a, b) => (b.rating || 0) - (a.rating || 0));

    let autoBooks = [];
    let sliceStart = 0;
    let limit = 6;

    switch (section) {
        case 'featured':
            autoBooks = sortedByNewest;
            limit = 50;
            break;

        case 'trending':
            autoBooks = sortedByRating;
            limit = 50;
            break;

        case 'newReleases':
            autoBooks = sortedByNewest;
            limit = 50;
            break;

        case 'indianAuthors': {
            // Priority: Urdu/Hindi
            const urduBooks = allBooks.filter(b => (b.language || '').toLowerCase() === 'urdu' || (b.language || '').toLowerCase() === 'hindi');
            if (urduBooks.length > 0) {
                autoBooks = urduBooks;
            } else {
                autoBooks = sortedByNewest;
                sliceStart = 6; // Offset if falling back
            }
            limit = 50;
            break;
        }

        case 'boxSets':
            autoBooks = sortedByNewest;
            sliceStart = 12;
            limit = 4;
            break;

        case 'children': {
            const childBooks = allBooks.filter(b =>
                (b.category && b.category.toLowerCase().includes('children')) ||
                (b.subcategory && b.subcategory.toLowerCase().includes('children'))
            );
            if (childBooks.length > 0) {
                autoBooks = childBooks;
            } else {
                autoBooks = sortedByNewest;
                sliceStart = 18;
            }
            limit = 50;
            break;
        }

        case 'fiction': {
            const fiction = allBooks.filter(b =>
                (b.subcategory && b.subcategory.toLowerCase().includes('fiction')) ||
                (b.title && b.title.toLowerCase().includes('novel'))
            );
            if (fiction.length > 0) {
                autoBooks = fiction;
            } else {
                const engBooks = allBooks.filter(b => (b.language || '').toLowerCase() === 'english');
                if (engBooks.length > 0) {
                    autoBooks = engBooks;
                } else {
                    autoBooks = sortedByNewest;
                    sliceStart = 24;
                }
            }
            limit = 50;
            break;
        }

        case 'academic': {
            const academic = allBooks.filter(b =>
                (b.category && b.category.toLowerCase().includes('academic')) ||
                (b.subcategory && b.subcategory.toLowerCase().includes('academic')) ||
                (b.title && (b.title.toLowerCase().includes('school') || b.title.toLowerCase().includes('guide') || b.title.toLowerCase().includes('study')))
            );
            if (academic.length > 0) {
                autoBooks = academic;
            } else {
                autoBooks = sortedByNewest;
                sliceStart = 30;
            }
            break;
        }

        case 'exam': {
            const exams = allBooks.filter(b =>
                (b.title && (b.title.toLowerCase().includes('ctet') || b.title.toLowerCase().includes('csat') || b.title.toLowerCase().includes('exam') || b.title.toLowerCase().includes('paper'))) ||
                (b.subcategory && b.subcategory.toLowerCase().includes('exam'))
            );
            if (exams.length > 0) {
                autoBooks = exams;
            } else {
                // If no specific exams, at least show modern non-islamic books for this section to avoid confusion
                autoBooks = allBooks.filter(b => b.category !== 'Islamic');
                if (autoBooks.length === 0) autoBooks = sortedByNewest;
            }
            break;
        }

        case 'sidebar':
            return allBooks;

        case 'top100':
            return sortedByRating.slice(0, Math.min(allBooks.length, 50));

        case 'hero':
            // Hero section is strictly manual. No automatic fallback.
            // If explicitBooks is empty, we return empty [], so script.js keeps the static image.
            return explicitBooks;

        default:
            autoBooks = sortedByNewest;
    }

    // Merge: Top priority = Explicit, then Auto
    // Ensure checking for duplicates by ID
    let combined = [...explicitBooks];

    // Get appropriate candidates based on slice logic
    const autoCandidates = autoBooks.slice(sliceStart);

    for (let book of autoCandidates) {
        if (!combined.find(cb => cb.id === book.id)) {
            combined.push(book);
        }
        if (combined.length >= limit) break;
    }

    return combined.slice(0, limit);
}

// ===== UI Rendering Functions =====

// Generate star rating HTML
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    let stars = '';

    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    if (halfStar) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = fullStars + (halfStar ? 1 : 0); i < 5; i++) {
        stars += '<i class="far fa-star"></i>';
    }

    return stars;
}

// Render book card for carousel
function createBookCard(book) {
    const price = parseFloat(book.price) || 0;
    const originalPrice = parseFloat(book.originalPrice || book.original_price) || price;
    const discount = originalPrice > price
        ? Math.floor(((originalPrice - price) / originalPrice) * 100)
        : 0;

    // Truncate description for overlay
    const shortDescription = book.description
        ? (book.description.length > 100 ? book.description.substring(0, 100) + '...' : book.description)
        : 'Discover this amazing book from our collection.';

    // Escape quotes properly for JSON in onclick
    const bookJSON = JSON.stringify(book).replace(/'/g, "\\'").replace(/"/g, '&quot;');

    // Branded placeholder SVG with book title initial
    const titleInitial = (book.title || 'B').charAt(0).toUpperCase();
    const placeholderSVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 300'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%25' stop-color='%23f5f0eb'/%3E%3Cstop offset='100%25' stop-color='%23e8ddd4'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect fill='url(%23bg)' width='200' height='300' rx='4'/%3E%3Crect x='55' y='80' width='90' height='120' rx='4' fill='%238B0000' opacity='0.12'/%3E%3Ctext x='100' y='155' text-anchor='middle' font-family='Georgia,serif' font-size='48' font-weight='bold' fill='%238B0000' opacity='0.5'%3E${titleInitial}%3C/text%3E%3Ctext x='100' y='235' text-anchor='middle' font-family='Arial,sans-serif' font-size='11' fill='%23999'%3EABC Books%3C/text%3E%3C/svg%3E`;

    // Use placeholder if image is missing/null/empty
    const bookImage = (book.image && book.image.trim() && book.image !== 'null' && book.image !== 'undefined')
        ? book.image
        : placeholderSVG;

    return `
        <div class="book-card" data-book-id="${book.id}">
            <div class="book-cover" onclick="viewBookDetail('${book.id}')" style="cursor: pointer;">
                <img src="${bookImage}" alt="${book.title}" loading="lazy" onerror="this.onerror=null;this.src='${placeholderSVG}'">
                ${discount > 0 ? `<div class="discount-badge">-${discount}%</div>` : ''}
                
                <!-- Quick Action Buttons -->
                <div class="book-actions">
                    <button class="btn-wishlist wishlist-btn" title="Add to Wishlist" onclick="event.stopPropagation(); addToWishlistCard(this, '${book.id}', '${bookJSON}')">
                        <i class="far fa-heart"></i>
                    </button>
                    <button class="btn-cart add-to-cart-btn" title="Add to Cart" onclick="event.stopPropagation(); addToCartCard('${book.id}', '${bookJSON}')">
                        <i class="fas fa-shopping-cart"></i>
                    </button>
                </div>

                <!-- Hover Overlay with Description -->
                <div class="book-overlay">
                    <div class="overlay-title">${book.title}</div>
                    <div class="overlay-description">${shortDescription}</div>
                    <div class="overlay-price">
                        <span class="current">₹${book.price}</span>
                        ${book.originalPrice && book.originalPrice > book.price ? `<span class="original">₹${book.originalPrice}</span>` : ''}
                        ${discount > 0 ? `<span style="color: #4ade80; font-size: 11px; font-weight: 600;">${discount}% OFF</span>` : ''}
                    </div>
                </div>
            </div>
            <div class="book-info" onclick="viewBookDetail('${book.id}')" style="cursor: pointer;">
                <h3 class="book-title">${book.title}</h3>
                <p class="book-author">${book.author}</p>
                <div class="book-rating">
                    ${generateStars(book.rating || 4.5)}
                    <span class="rating-text">(${book.rating || '4.5'})</span>
                </div>
                <div class="book-price">
                    <span class="price-current">₹${book.price}</span>
                    ${book.originalPrice && book.originalPrice > book.price ? `<span class="price-original">₹${book.originalPrice}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}


// Navigate to book detail page
function viewBookDetail(bookId) {
    if (!bookId) {
        console.error('Cannot view book detail: ID is missing');
        return;
    }

    // Determine the path based on where we are
    const pathParts = window.location.pathname.split('/');
    const isInsidePages = pathParts.some(part => part.toLowerCase() === 'pages');

    // ALWAYS use absolute path from root for detail viewing
    const targetUrl = `/pages/book-detail.html?id=${bookId}`;

    console.log(`🚀 Navigating to ${targetUrl} (isInsidePages: ${isInsidePages})`);
    window.location.href = targetUrl;
}

// ===== Card-Specific Action Functions =====

// Check if user is logged in using accurate token presence
async function isUserLoggedIn() {
    // 1. Check API token fully if API is configured
    if (typeof API !== 'undefined' && API.Token) {
        if (!API.Token.isValid() || !API.Token.get()) return false;
    }

    // 2. More thorough check with getCurrentUser
    if (typeof getCurrentUser === 'function') {
        const user = await getCurrentUser();
        return !!(user && user.id);
    }

    // 3. Last fallback to token presence safely
    return !!((typeof API !== 'undefined' && API.Token) ? API.Token.get() : (localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('jwt_token')));
}

// Show login required notification and modal
function requireLogin(action) {
    showNotification(`Please login to ${action}`, 'info');

    // Show login modal if available
    if (typeof showLoginModal === 'function') {
        setTimeout(() => {
            showLoginModal();
        }, 500);
    }
}

// Add to wishlist with button animation
async function addToWishlistCard(btn, bookId, bookData) {
    // Check if user is logged in
    if (!isUserLoggedIn()) {
        requireLogin('add to wishlist');
        return;
    }

    // Parse book data if it's a string
    const book = typeof bookData === 'string' ? JSON.parse(bookData.replace(/&quot;/g, '"')) : bookData;

    try {
        // Call the API-integrated addToWishlist function
        if (typeof addToWishlist === 'function') {
            // Use bookId directly (no need to fetch from DB again as bookId IS the DB id)
            await addToWishlist(bookId, book);

            // Update button visual state
            const icon = btn.querySelector('i');
            if (icon) {
                icon.classList.remove('far');
                icon.classList.add('fas');
            }
            btn.classList.add('active');
        }
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        showNotification('Error adding to wishlist. Please try again.', 'error');
    }
}

// Add to cart from card with animation
async function addToCartCard(bookId, bookData) {
    // Check if user is logged in
    const isLoggedIn = await isUserLoggedIn();
    if (!isLoggedIn) {
        // ✅ SAVE PENDING ACTION for auto-continue after login
        localStorage.setItem('abc_books_pending_action', 'add_to_cart');
        localStorage.setItem('abc_books_pending_book', JSON.stringify({
            bookId: bookId,
            bookData: bookData,
            quantity: 1,
            source: 'homepage_card'
        }));

        requireLogin('add to cart');
        return;
    }

    // Parse book data if it's a string
    const book = typeof bookData === 'string' ? JSON.parse(bookData.replace(/&quot;/g, '"')) : bookData;

    try {
        // Call the API-integrated addToCart function directly
        if (typeof addToCart === 'function') {
            await addToCart(bookId, book);
        } else {
            throw new Error('addToCart function not available');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Error adding to cart. Please try again.', 'error');
    }
}

// Buy Now - Add to cart and go to checkout
async function buyNow(bookId, bookData) {
    // Check if user is logged in
    const isLoggedIn = await isUserLoggedIn();
    if (!isLoggedIn) {
        // ✅ SAVE PENDING ACTION for auto-continue after login
        localStorage.setItem('abc_books_pending_action', 'buy_now');
        localStorage.setItem('abc_books_pending_book', JSON.stringify({
            bookId: bookId,
            bookData: bookData,
            quantity: 1,
            source: 'homepage_card'
        }));

        requireLogin('buy this book');
        return;
    }

    // Parse book data if it's a string
    const book = typeof bookData === 'string' ? JSON.parse(bookData.replace(/&quot;/g, '"')) : bookData;

    try {
        // Add to cart directly
        if (typeof addToCart === 'function') {
            await addToCart(bookId, book);

            // Show success message before redirect
            showNotification('Redirecting to checkout...', 'success');

            // Redirect to checkout after adding to cart - always use root-relative path
            setTimeout(() => {
                window.location.href = '/pages/checkout.html';
            }, 1000);
        } else {
            throw new Error('addToCart function not available');
        }
    } catch (error) {
        console.error('Error in buy now:', error);
        showNotification('Error processing request. Please try again.', 'error');
    }
}

function updateCartBadge() {
    try {
        const cart = JSON.parse(localStorage.getItem('abc_books_cart') || '[]');
        const badge = document.getElementById('cartCount');
        if (!badge) return;

        if (!Array.isArray(cart)) {
            badge.textContent = '0';
            return;
        }

        const count = cart.reduce((sum, item) => {
            const q = parseInt(item.quantity);
            return sum + (isNaN(q) ? 1 : q);
        }, 0);

        badge.textContent = isNaN(count) ? '0' : String(count);
    } catch (e) {
        const badge = document.getElementById('cartCount');
        if (badge) badge.textContent = '0';
    }
}

function updateWishlistBadge() {
    try {
        const wishlist = JSON.parse(localStorage.getItem('abc_books_wishlist') || '[]');
        const badge = document.getElementById('wishlistCount');
        if (!badge) return;

        const count = Array.isArray(wishlist) ? wishlist.length : 0;
        badge.textContent = isNaN(count) ? '0' : String(count);
    } catch (e) {
        const badge = document.getElementById('wishlistCount');
        if (badge) badge.textContent = '0';
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #27ae60, #2ecc71)' : 'linear-gradient(135deg, #667eea, #764ba2)'};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2500);
}

// Initialize badges on page load
document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
    updateWishlistBadge();
});
