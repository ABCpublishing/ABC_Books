// ===== Wishlist Page JavaScript =====

let wishlistItems = [];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadWishlist();
});

// Load wishlist
function loadWishlist() {
    wishlistItems = JSON.parse(localStorage.getItem('abc_books_wishlist') || '[]');
    renderWishlist();
}

// Render wishlist
function renderWishlist() {
    const container = document.getElementById('wishlistGrid');
    const emptyState = document.getElementById('emptyState');
    const actions = document.getElementById('wishlistActions');
    const countEl = document.getElementById('wishlistCount');

    // Update count
    countEl.textContent = `${wishlistItems.length} item${wishlistItems.length !== 1 ? 's' : ''}`;

    if (wishlistItems.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        actions.style.display = 'none';
        return;
    }

    container.style.display = 'grid';
    emptyState.style.display = 'none';
    actions.style.display = 'flex';

    container.innerHTML = wishlistItems.map(item => createWishlistItemHTML(item)).join('');
}

// Create wishlist item HTML
function createWishlistItemHTML(item) {
    const price = parseFloat(item.price) || 0;
    const originalPrice = parseFloat(item.originalPrice || item.original_price) || price;
    const discount = originalPrice > price
        ? Math.floor(((originalPrice - price) / originalPrice) * 100)
        : 0;

    return `
        <div class="wishlist-item" data-id="${item.id}">
            <button class="remove-btn" onclick="removeFromWishlist('${item.id}')" title="Remove">
                <i class="fas fa-times"></i>
            </button>
            <div class="book-image" onclick="viewBook('${item.id}')">
                <img src="${item.image}" alt="${item.title}"
                    onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22200%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 font-family=%22Arial%22 font-size=%2214%22 fill=%22%23999%22 text-anchor=%22middle%22%3ENo Image%3C/text%3E%3C/svg%3E'">
            </div>
            <div class="book-info">
                <h3 class="book-title" onclick="viewBook('${item.id}')">${item.title}</h3>
                <p class="book-author">${item.author || 'Unknown Author'}</p>
                <div class="book-price">
                    <span class="current-price">₹${item.price}</span>
                    ${item.originalPrice ? `<span class="original-price">₹${item.originalPrice}</span>` : ''}
                    ${discount > 0 ? `<span class="discount-badge">${discount}% OFF</span>` : ''}
                </div>
                <button class="btn-add-cart" onclick="moveToCart('${item.id}')">
                    <i class="fas fa-shopping-cart"></i> Add to Cart
                </button>
            </div>
        </div>
    `;
}

// View book details
function viewBook(bookId) {
    window.location.href = `book-detail.html?id=${bookId}`;
}

// Remove from wishlist
function removeFromWishlist(itemId) {
    wishlistItems = wishlistItems.filter(item => item.id !== itemId);
    localStorage.setItem('abc_books_wishlist', JSON.stringify(wishlistItems));

    // Animate removal
    const itemElement = document.querySelector(`[data-id="${itemId}"]`);
    if (itemElement) {
        itemElement.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            renderWishlist();
        }, 300);
    } else {
        renderWishlist();
    }

    showNotification('Item removed from wishlist');
}

// Move item to cart
function moveToCart(itemId) {
    const item = wishlistItems.find(i => i.id === itemId);
    if (!item) return;

    // Add to cart
    let cart = JSON.parse(localStorage.getItem('abc_books_cart') || '[]');
    const existingIndex = cart.findIndex(c => c.id === itemId);

    if (existingIndex >= 0) {
        cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
    } else {
        cart.push({ ...item, quantity: 1 });
    }

    localStorage.setItem('abc_books_cart', JSON.stringify(cart));

    // Remove from wishlist
    removeFromWishlist(itemId);

    showNotification('Item moved to cart!', 'success');
}

// Add all to cart
function addAllToCart() {
    if (wishlistItems.length === 0) return;

    let cart = JSON.parse(localStorage.getItem('abc_books_cart') || '[]');

    wishlistItems.forEach(item => {
        const existingIndex = cart.findIndex(c => c.id === item.id);

        if (existingIndex >= 0) {
            cart[existingIndex].quantity = (cart[existingIndex].quantity || 1) + 1;
        } else {
            cart.push({ ...item, quantity: 1 });
        }
    });

    localStorage.setItem('abc_books_cart', JSON.stringify(cart));

    // Clear wishlist
    wishlistItems = [];
    localStorage.setItem('abc_books_wishlist', JSON.stringify(wishlistItems));

    renderWishlist();
    showNotification('All items added to cart!', 'success');
}

// Clear wishlist
function clearWishlist() {
    if (!confirm('Are you sure you want to clear your wishlist?')) return;

    wishlistItems = [];
    localStorage.setItem('abc_books_wishlist', JSON.stringify(wishlistItems));
    renderWishlist();
    showNotification('Wishlist cleared');
}

// Show notification
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
    }, 3000);
}

// Add animation styles
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
    @keyframes fadeOut {
        from { opacity: 1; transform: scale(1); }
        to { opacity: 0; transform: scale(0.9); }
    }
`;
document.head.appendChild(style);
