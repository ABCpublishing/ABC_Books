// ===== Book Detail Page JavaScript =====

// Dynamic API URL (same as api.js)
const BOOK_DETAIL_API_BASE = (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    ? '/api'
    : 'http://localhost:3001/api';

let currentBook = null;
let quantity = 1;

// Get book ID from URL
function getBookIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Load book details
async function loadBookDetails() {
    const bookId = getBookIdFromUrl();

    if (!bookId) {
        showError('Book not found. Redirecting to home...');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 3000);
        return;
    }

    // FIRST: Try to fetch from API/database (for admin-added books with numeric IDs)
    try {
        console.log(`📖 Fetching book with ID: ${bookId} from API...`);
        const response = await fetch(`${BOOK_DETAIL_API_BASE}/books/${bookId}`);

        if (response.ok) {
            const data = await response.json();
            if (data.book) {
                console.log('✅ Book found in database:', data.book.title);
                // Map database fields to expected format
                currentBook = {
                    id: data.book.id,
                    title: data.book.title,
                    author: data.book.author,
                    price: data.book.price,
                    originalPrice: data.book.original_price,
                    image: data.book.image,
                    description: data.book.description,
                    category: data.book.category,
                    image: data.book.image,
                    description: data.book.description,
                    category: data.book.category,
                    rating: data.book.rating || 4.5
                };
                populateBookDetails();
                loadRelatedBooks();
                return;
            }
        }
    } catch (error) {
        console.log('⚠️ API fetch failed, trying local data...', error);
    }

    // FALLBACK: Try localStorage data
    const data = localStorage.getItem('abc_books_data_cache');
    if (data) {
        const parsed = JSON.parse(data);
        currentBook = parsed.books.find(b => b.id === bookId || String(b.id) === bookId);
    }

    // FALLBACK: Try demo data
    if (!currentBook && typeof DEMO_ISLAMIC_BOOKS !== 'undefined') {
        currentBook = DEMO_ISLAMIC_BOOKS.find(b => b.id === bookId || String(b.id) === bookId);
    }

    if (!currentBook) {
        showError('Book not found');
        return;
    }

    // Populate page with book data
    populateBookDetails();
    loadRelatedBooks();
}


// Populate book details on page
function populateBookDetails() {
    // Update page title
    document.title = `${currentBook.title} | ABC Books`;

    // Breadcrumb
    // Breadcrumb
    const breadcrumbTitle = document.getElementById('breadcrumbTitle');
    if (breadcrumbTitle) breadcrumbTitle.textContent = currentBook.title;

    // Book image
    const bookImage = document.getElementById('bookImage');
    if (bookImage) {
        bookImage.src = currentBook.image;
        bookImage.alt = currentBook.title;
        bookImage.onerror = function () {
            this.src = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 300%22%3E%3Crect fill=%22%23e8e8e8%22 width=%22200%22 height=%22300%22/%3E%3Cpath d=%22M80 110h40v80H80z%22 fill=%22%23ccc%22/%3E%3Cpath d=%22M85 115h30v70H85z%22 fill=%22%23fff%22/%3E%3Cpath d=%22M90 125h20v2H90zm0 8h20v2H90zm0 8h15v2H90z%22 fill=%22%23ddd%22/%3E%3C/svg%3E';
        };
    }

    // Calculate discount
    const price = parseFloat(currentBook.price) || 0;
    const ogPrice = currentBook.originalPrice || currentBook.original_price;
    const originalPrice = parseFloat(ogPrice) || price;
    const discount = originalPrice > price
        ? Math.floor(((originalPrice - price) / originalPrice) * 100)
        : 0;

    // Discount badge
    const discountBadge = document.getElementById('discountBadge') || document.getElementById('discountPercent');
    if (discountBadge) {
        if (discount > 0) {
            discountBadge.textContent = discountBadge.id === 'discountPercent' ? `${discount}% OFF` : `-${discount}%`;
            discountBadge.style.display = 'inline-block';
        } else {
            discountBadge.style.display = 'none';
        }
    }

    // Book title
    const bookTitleElem = document.getElementById('bookTitle');
    if (bookTitleElem) bookTitleElem.textContent = currentBook.title;

    // Author
    const bookAuthorElem = document.getElementById('bookAuthor');
    if (bookAuthorElem) bookAuthorElem.innerHTML = `by <span>${currentBook.author}</span>`;

    // Rating
    const rating = currentBook.rating || 4.5;
    const starsElem = document.getElementById('bookStars');
    if (starsElem) starsElem.innerHTML = generateStars(rating);

    const ratingTextElem = document.getElementById('ratingText');
    if (ratingTextElem) ratingTextElem.textContent = `${rating} (${Math.floor(Math.random() * 200 + 50)} reviews)`;

    // Price
    const currentPriceElem = document.getElementById('currentPrice');
    if (currentPriceElem) currentPriceElem.textContent = `₹${currentBook.price}`;

    const originalPriceElem = document.getElementById('originalPrice');
    const discountPercentElem = document.getElementById('discountPercent');

    if (originalPrice > price) {
        if (originalPriceElem) {
            originalPriceElem.textContent = `₹${originalPrice}`;
            originalPriceElem.style.display = 'inline';
        }
        if (discountPercentElem) {
            discountPercentElem.textContent = `${discount}% OFF`;
            discountPercentElem.style.display = 'inline';
        }
    } else {
        if (originalPriceElem) originalPriceElem.style.display = 'none';
        if (discountPercentElem) discountPercentElem.style.display = 'none';
    }

    // Details tab
    const detailTitle = document.getElementById('detailTitle');
    if (detailTitle) detailTitle.textContent = currentBook.title;

    const detailAuthor = document.getElementById('detailAuthor');
    if (detailAuthor) detailAuthor.textContent = currentBook.author;

    // Overall rating in reviews
    const overallRatingElem = document.getElementById('overallRating');
    if (overallRatingElem) overallRatingElem.textContent = rating;

    const overallStarsElem = document.getElementById('overallStars');
    if (overallStarsElem) overallStarsElem.innerHTML = generateStars(rating);
}

// Generate star rating HTML
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;

    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '<i class="fas fa-star"></i>';
    if (halfStar) stars += '<i class="fas fa-star-half-alt"></i>';
    for (let i = 0; i < emptyStars; i++) stars += '<i class="far fa-star"></i>';

    return stars;
}

// Load related books
async function loadRelatedBooks() {
    const container = document.getElementById('relatedBooks');
    if (!container) return;

    // Get all books - try API first
    let allBooks = [];

    try {
        const response = await fetch(`${BOOK_DETAIL_API_BASE}/books?limit=20`);
        if (response.ok) {
            const data = await response.json();
            if (data.books && data.books.length > 0) {
                // Map to expected format
                allBooks = data.books.map(b => ({
                    id: b.id,
                    title: b.title,
                    author: b.author,
                    price: b.price,
                    image: b.image
                }));
            }
        }
    } catch (error) {
        console.log('Could not fetch books from API for related books');
    }

    // Fallback to localStorage
    if (allBooks.length === 0) {
        const data = localStorage.getItem('abc_books_data_cache');
        if (data) {
            const parsed = JSON.parse(data);
            allBooks = parsed.books || [];
        }
    }

    // Fallback to demo data
    if (allBooks.length === 0 && typeof DEMO_ISLAMIC_BOOKS !== 'undefined') {
        allBooks = DEMO_ISLAMIC_BOOKS;
    }

    // Filter out current book and get random 4-6 books
    const otherBooks = allBooks.filter(b => b.id !== currentBook?.id && String(b.id) !== String(currentBook?.id));
    const relatedBooks = otherBooks.sort(() => 0.5 - Math.random()).slice(0, 6);

    if (relatedBooks.length === 0) {
        container.innerHTML = '<p style="color: #999;">No related books found</p>';
        return;
    }

    container.innerHTML = relatedBooks.map(book => `
        <div class="related-book-card" onclick="viewBook('${book.id}')">
            <div class="book-cover">
                <img src="${book.image}" alt="${book.title}" 
                    onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 300%22%3E%3Crect fill=%22%23e8e8e8%22 width=%22200%22 height=%22300%22/%3E%3Cpath d=%22M80 110h40v80H80z%22 fill=%22%23ccc%22/%3E%3Cpath d=%22M85 115h30v70H85z%22 fill=%22%23fff%22/%3E%3Cpath d=%22M90 125h20v2H90zm0 8h20v2H90zm0 8h15v2H90z%22 fill=%22%23ddd%22/%3E%3C/svg%3E'">
            </div>
            <div class="book-info">
                <h4 class="book-title">${book.title}</h4>
                <p class="book-author">${book.author}</p>
                <p class="book-price">₹${book.price}</p>
            </div>
        </div>
    `).join('');
}

// View another book
function viewBook(bookId) {
    window.location.href = `/pages/book-detail.html?id=${bookId}`;
}

// Quantity controls
function increaseQty() {
    const input = document.getElementById('quantity');
    if (quantity < 10) {
        quantity++;
        input.value = quantity;
    }
}

function decreaseQty() {
    const input = document.getElementById('quantity');
    if (quantity > 1) {
        quantity--;
        input.value = quantity;
    }
}

// Add to cart from detail page
async function addToCartDetail() {
    if (!currentBook) return;

    const qty = parseInt(document.getElementById('quantity').value) || 1;

    // Check precise physical token presence immediately 
    const hasToken = localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('jwt_token');

    if (!hasToken) {
        // Save pending action
        localStorage.setItem('abc_books_pending_action', 'add_to_cart');
        localStorage.setItem('abc_books_pending_book', JSON.stringify({
            bookId: currentBook.id,
            bookData: currentBook,
            quantity: qty,
            source: 'book-detail'
        }));

        if (typeof showNotification === 'function') {
            showNotification('🔐 Please sign in with Google to add to cart', 'info');
        }

        if (typeof showLoginModal === 'function') {
            showLoginModal();
            // Force Google button refresh
            if (typeof renderGoogleButtons === 'function') {
                setTimeout(renderGoogleButtons, 300);
            }
        }
        return;
    }

    if (typeof addToCart === 'function') {
        for (let i = 0; i < qty; i++) {
            await addToCart(currentBook.id, currentBook);
        }
    } else {
        console.error('addToCart function not found');
        showNotification('Error: Shop services not ready', 'error');
    }
}

// Buy Now - use the shared logic in user-auth-api.js
async function buyNow() {
    if (!currentBook) return;

    const qty = parseInt(document.getElementById('quantity').value) || 1;

    // Check for a VALID user and session
    const user = await getCurrentUser();

    if (!user || user.id === -1) {
        // Save pending action
        localStorage.setItem('abc_books_pending_action', 'buy_now');
        localStorage.setItem('abc_books_pending_book', JSON.stringify({
            bookId: currentBook.id,
            bookData: currentBook,
            quantity: qty,
            source: 'book-detail'
        }));

        if (typeof showNotification === 'function') {
            showNotification('🔐 Sign in with Google to complete your purchase', 'info');
        }

        if (typeof showLoginModal === 'function') {
            showLoginModal();
        }
        return;
    }

    // Already logged in - add to cart and go to checkout
    if (typeof addToCart === 'function') {
        for (let i = 0; i < qty; i++) {
            await addToCart(currentBook.id, currentBook);
        }

        // Redirect to checkout - always use root-relative path to prevent double directory navigation
        window.location.href = '/pages/checkout.html';
    }
}

// Add to wishlist - use shared logic from user-auth-api.js
async function addToWishlistDetail() {
    if (!currentBook) return;
    if (typeof addToWishlist === 'function') {
        const bookData = {
            id: currentBook.id,
            title: currentBook.title,
            author: currentBook.author,
            price: currentBook.price,
            image: currentBook.image
        };
        await addToWishlist(currentBook.id, bookData);
    }
}


// Share book
function shareBook() {
    if (navigator.share) {
        navigator.share({
            title: currentBook.title,
            text: `Check out ${currentBook.title} by ${currentBook.author} at ABC Books!`,
            url: window.location.href
        }).catch(console.error);
    } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href);
        showNotification('Link copied to clipboard!', 'success');
    }
}

// Show error
function showError(message) {
    document.querySelector('.book-detail-main').innerHTML = `
        <div class="container" style="text-align: center; padding: 100px 20px;">
            <i class="fas fa-exclamation-circle" style="font-size: 4rem; color: #e74c3c; margin-bottom: 20px;"></i>
            <h2 style="color: #2c1810; margin-bottom: 15px;">Oops! Book Not Found</h2>
            <p style="color: #666; margin-bottom: 25px;">${message}</p>
            <a href="/index.html" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #8B4513, #A0522D); color: white; text-decoration: none; border-radius: 10px; font-weight: 600;">
                <i class="fas fa-home"></i> Back to Home
            </a>
        </div>
    `;
}

// Tab functionality
function initializeTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;

            // Update buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Update panels
            tabPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === `${targetTab}Panel`) {
                    panel.classList.add('active');
                }
            });
        });
    });
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #27ae60, #2ecc71)' : 'linear-gradient(135deg, #3498db, #5dade2)'};
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

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100px); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    // Initial UI update to reflect login state from the start
    if (typeof updateUserUI === 'function') {
        await updateUserUI();
    }

    loadBookDetails();
    initializeTabs();
});
