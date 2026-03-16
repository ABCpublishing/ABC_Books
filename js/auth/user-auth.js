// User Authentication & Shop Functionality for ABC Books
// LocalStorage Keys
const USER_STORAGE_KEY = 'abc_books_users';
const CURRENT_USER_KEY = 'abc_books_current_user';
const WISHLIST_KEY = 'abc_books_wishlist';
const CART_KEY = 'abc_books_cart';

// Load data from localStorage
function getUsers() {
    const users = localStorage.getItem(USER_STORAGE_KEY);
    return users ? JSON.parse(users) : [];
}

function saveUsers(users) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
}

function getCurrentUser() {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
}

function setCurrentUser(user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function getWishlist() {
    const wishlist = localStorage.getItem(WISHLIST_KEY);
    return wishlist ? JSON.parse(wishlist) : [];
}

function saveWishlist(wishlist) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
}

function getCart() {
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

// ===== AUTHENTICATION FUNCTIONS =====
function showLoginModal() {
    document.getElementById('loginModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    if (typeof renderGoogleButtons === 'function') setTimeout(renderGoogleButtons, 50);
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('active');
    document.body.style.overflow = '';
}

function showSignupModal() {
    document.getElementById('signupModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    if (typeof renderGoogleButtons === 'function') setTimeout(renderGoogleButtons, 50);
}

function closeSignupModal() {
    document.getElementById('signupModal').classList.remove('active');
    document.body.style.overflow = '';
}

function switchToSignup() {
    closeLoginModal();
    showSignupModal();
}

function switchToLogin() {
    closeSignupModal();
    showLoginModal();
}

// ===== USER SESSION MANAGEMENT =====

// Save current user's cart and wishlist before switching users
function saveUserSessionData(userId) {
    if (!userId) return;

    const cart = localStorage.getItem(CART_KEY) || '[]';
    const wishlist = localStorage.getItem(WISHLIST_KEY) || '[]';

    // Save user-specific data with user ID prefix
    localStorage.setItem(`abc_user_${userId}_cart`, cart);
    localStorage.setItem(`abc_user_${userId}_wishlist`, wishlist);
}

// Load user-specific cart and wishlist
function loadUserSessionData(userId) {
    if (!userId) {
        // Clear cart and wishlist for guest
        localStorage.setItem(CART_KEY, '[]');
        localStorage.setItem(WISHLIST_KEY, '[]');
        return;
    }

    // Load user-specific data
    const userCart = localStorage.getItem(`abc_user_${userId}_cart`) || '[]';
    const userWishlist = localStorage.getItem(`abc_user_${userId}_wishlist`) || '[]';

    // Set as current cart and wishlist
    localStorage.setItem(CART_KEY, userCart);
    localStorage.setItem(WISHLIST_KEY, userWishlist);
}

// Clear session data (for new user or logout)
function clearSessionData() {
    localStorage.setItem(CART_KEY, '[]');
    localStorage.setItem(WISHLIST_KEY, '[]');
    // Also remove old address key from previous implementation
    localStorage.removeItem('abc_address');
}


function handleLogin(event) {
    event.preventDefault();

    const phone = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const users = getUsers();
    const user = users.find(u => u.phone === phone && u.password === password);

    if (user) {
        // Get previous user (if any) and save their data
        const previousUser = getCurrentUser();
        if (previousUser && previousUser.id !== user.id) {
            // Save previous user's cart/wishlist
            saveUserSessionData(previousUser.id);
            // Clear current session data before loading new user's data
            clearSessionData();
        }

        // Set new current user
        setCurrentUser(user);

        // Load this user's cart and wishlist
        loadUserSessionData(user.id);

        closeLoginModal();
        updateUserUI();

        // Show welcome message
        if (typeof showNotification === 'function') {
            showNotification(`Welcome back, ${user.name}!`, 'success');
        } else {
            alert(`Welcome back, ${user.name}!`);
        }

        // ✅ Check for pending actions (Buy Now or Add to Cart)
        const pendingAction = localStorage.getItem('abc_pending_action');
        const pendingBookData = localStorage.getItem('abc_pending_book');

        if (pendingAction && pendingBookData) {
            try {
                const pending = JSON.parse(pendingBookData);

                // Clear pending data
                localStorage.removeItem('abc_pending_action');
                localStorage.removeItem('abc_pending_book');

                // Execute the pending action after a short delay
                setTimeout(async () => {
                    if (pendingAction === 'buy_now') {
                        await executePendingBuyNow(pending);
                    } else if (pendingAction === 'add_to_cart') {
                        await executePendingAddToCart(pending);
                    }
                }, 1000);
            } catch (error) {
                console.error('Error processing pending action:', error);
            }
        }
    } else {
        alert('Invalid email or password. Please try again.');
    }
}

function handleSignup(event) {
    event.preventDefault();

    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

    // Validation
    if (password !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }

    const users = getUsers();

    // Check if email already exists
    if (users.find(u => u.email === email)) {
        alert('Email already registered. Please login instead.');
        return;
    }

    // Save previous user's data if there was one
    const previousUser = getCurrentUser();
    if (previousUser) {
        saveUserSessionData(previousUser.id);
    }

    // Create new user
    const newUser = {
        id: Date.now().toString(),
        name,
        email,
        password,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);
    setCurrentUser(newUser);

    // Clear cart and wishlist for new user (fresh start)
    clearSessionData();

    closeSignupModal();
    updateUserUI();

    // Show welcome message
    if (typeof showNotification === 'function') {
        showNotification(`Welcome to ABC Books, ${name}!`, 'success');
    } else {
        alert(`Welcome to ABC Books, ${name}!`);
    }

    // ✅ Check for pending actions (Buy Now or Add to Cart)
    const pendingAction = localStorage.getItem('abc_pending_action');
    const pendingBookData = localStorage.getItem('abc_pending_book');

    if (pendingAction && pendingBookData) {
        try {
            const pending = JSON.parse(pendingBookData);

            // Clear pending data
            localStorage.removeItem('abc_pending_action');
            localStorage.removeItem('abc_pending_book');

            // Execute the pending action after a short delay
            setTimeout(async () => {
                if (pendingAction === 'buy_now') {
                    await executePendingBuyNow(pending);
                } else if (pendingAction === 'add_to_cart') {
                    await executePendingAddToCart(pending);
                }
            }, 1000);
        } catch (error) {
            console.error('Error processing pending action:', error);
        }
    }
}

function userLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // Save current user's cart/wishlist before logout
        const currentUser = getCurrentUser();
        if (currentUser) {
            saveUserSessionData(currentUser.id);
        }

        // Clear session data
        clearSessionData();

        // Remove current user
        localStorage.removeItem(CURRENT_USER_KEY);

        updateUserUI();
        alert('You have been logged out successfully.');
    }
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('active');
}

// ===== WISHLIST FUNCTIONS =====
function toggleWishlist() {
    const user = getCurrentUser();
    if (!user) {
        alert('Please login to view your wishlist');
        showLoginModal();
        return;
    }

    document.getElementById('wishlistOverlay').classList.add('active');
    document.getElementById('wishlistPanel').classList.add('active');
    document.body.style.overflow = 'hidden';
    loadWishlistItems();
}

function closeWishlist() {
    document.getElementById('wishlistOverlay').classList.remove('active');
    document.getElementById('wishlistPanel').classList.remove('active');
    document.body.style.overflow = '';
}

function loadWishlistItems() {
    const wishlist = getWishlist();
    const content = document.getElementById('wishlistContent');

    if (wishlist.length === 0) {
        content.innerHTML = '<p class="empty-message"><i class="fas fa-heart-broken"></i> Your wishlist is empty</p>';
        return;
    }

    content.innerHTML = wishlist.map(item => `
        <div class="wishlist-item">
            <img src="${item.image}" alt="${item.title}">
            <div class="item-details">
                <h4>${item.title}</h4>
                <p>${item.author}</p>
                <div class="item-price">₹${item.price}</div>
            </div>
            <div class="item-actions">
                <button class="btn-icon" onclick="addToCartFromWishlist('${item.id}')" title="Add to Cart">
                    <i class="fas fa-shopping-cart"></i>
                </button>
                <button class="btn-icon" onclick="removeFromWishlist('${item.id}')" title="Remove">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function addToWishlist(bookId, bookData) {
    const user = getCurrentUser();
    if (!user) {
        alert('Please login to add items to wishlist');
        showLoginModal();
        return;
    }

    const wishlist = getWishlist();

    // Check if already in wishlist
    if (wishlist.find(item => item.id === bookId)) {
        alert('This book is already in your wishlist');
        return;
    }

    wishlist.push({
        id: bookId,
        ...bookData
    });

    saveWishlist(wishlist);
    updateWishlistCount();
    alert('Book added to wishlist!');
}

function removeFromWishlist(bookId) {
    let wishlist = getWishlist();
    wishlist = wishlist.filter(item => item.id !== bookId);
    saveWishlist(wishlist);
    updateWishlistCount();
    loadWishlistItems();
}

function addToCartFromWishlist(bookId) {
    const wishlist = getWishlist();
    const book = wishlist.find(item => item.id === bookId);

    if (book) {
        addToCart(bookId, book);
        removeFromWishlist(bookId);
    }
}

// ===== CART FUNCTIONS =====
function toggleCart() {
    const user = getCurrentUser();
    if (!user) {
        alert('Please login to view your cart');
        showLoginModal();
        return;
    }

    document.getElementById('cartOverlay').classList.add('active');
    document.getElementById('cartPanel').classList.add('active');
    document.body.style.overflow = 'hidden';
    loadCartItems();
}

function closeCart() {
    document.getElementById('cartOverlay').classList.remove('active');
    document.getElementById('cartPanel').classList.remove('active');
    document.body.style.overflow = '';
}

function loadCartItems() {
    const cart = getCart();
    const content = document.getElementById('cartContent');

    if (cart.length === 0) {
        content.innerHTML = '<p class="empty-message"><i class="fas fa-shopping-cart"></i> Your cart is empty</p>';
        document.getElementById('cartTotal').textContent = '₹0';
        return;
    }

    content.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.title}">
            <div class="item-details">
                <h4>${item.title}</h4>
                <p>${item.author}</p>
                <div class="item-price">₹${item.price}</div>
                <div class="item-quantity">
                    <button onclick="updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                </div>
            </div>
            <button class="btn-remove" onclick="removeFromCart('${item.id}')">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');

    updateCartTotal();
}

function addToCart(bookId, bookData) {
    const user = getCurrentUser();
    if (!user) {
        alert('Please login to add items to cart');
        showLoginModal();
        return;
    }

    let cart = getCart();
    const existingItem = cart.find(item => item.id === bookId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: bookId,
            ...bookData,
            quantity: 1
        });
    }

    saveCart(cart);
    updateCartCount();
    alert('Book added to cart!');
}

function removeFromCart(bookId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== bookId);
    saveCart(cart);
    updateCartCount();
    loadCartItems();
}

function updateQuantity(bookId, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(bookId);
        return;
    }

    let cart = getCart();
    const item = cart.find(item => item.id === bookId);

    if (item) {
        item.quantity = newQuantity;
        saveCart(cart);
        loadCartItems();
    }
}

function updateCartTotal() {
    const cart = getCart();
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('cartTotal').textContent = `₹${total.toFixed(2)}`;
}

function proceedToCheckout() {
    const cart = getCart();

    if (cart.length === 0) {
        alert('Your cart is empty. Please add items before checkout.');
        return;
    }

    // Redirect to checkout page
    window.location.href = '/pages/checkout.html';
}


// ===== UI UPDATE FUNCTIONS =====
function updateUserUI() {
    const user = getCurrentUser();
    const authButtons = document.getElementById('authButtons');
    const userAccount = document.getElementById('userAccount');

    if (user) {
        authButtons.style.display = 'none';
        userAccount.style.display = 'block';
        document.getElementById('userName').textContent = user.name.split(' ')[0];
    } else {
        authButtons.style.display = 'flex';
        userAccount.style.display = 'none';
    }

    updateWishlistCount();
    updateCartCount();
}

function updateWishlistCount() {
    const wishlist = getWishlist();
    const countEl = document.getElementById('wishlistCount');
    if (countEl) countEl.textContent = wishlist.length || 0;
}

function updateCartCount() {
    const cart = getCart();
    // Ensure quantity is a number, default to 1 if missing
    const totalItems = cart.reduce((total, item) => total + (parseInt(item.quantity) || 1), 0);
    const countEl = document.getElementById('cartCount');
    if (countEl) countEl.textContent = totalItems || 0;
}

// ===== USER MENU FUNCTIONS =====
function viewOrders() {
    window.location.href = '/pages/my-orders.html';
}

function viewWishlist() {
    toggleUserMenu();
    toggleWishlist();
}

function viewProfile() {
    window.location.href = '/pages/my-account.html';
}

// ===== PENDING ACTION EXECUTION HELPERS =====

/**
 * Get correct path to checkout based on current location
 * @returns {string} Correct path to checkout.html
 */
function getCheckoutPath() {
    return '/pages/checkout.html';
}

/**
 * Execute pending "buy now" action after login/signup
 * @param {Object} pending - Pending book data
 */
async function executePendingBuyNow(pending) {
    try {
        const { bookId, bookData, quantity, source } = pending;
        const book = typeof bookData === 'string' ? JSON.parse(bookData.replace(/&quot;/g, '"')) : bookData;

        // Add book to cart
        let cart = getCart();
        const existingItem = cart.find(item => item.id === bookId);

        if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 1) + (quantity || 1);
        } else {
            cart.push({
                id: bookId,
                ...book,
                quantity: quantity || 1
            });
        }

        saveCart(cart);
        updateCartCount();

        // Show notification and redirect
        if (typeof showNotification === 'function') {
            showNotification('Redirecting to checkout...', 'success');
        }

        setTimeout(() => {
            window.location.href = getCheckoutPath();
        }, 800);

    } catch (error) {
        console.error('Error executing pending buy now:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error processing request', 'error');
        }
    }
}

/**
 * Execute pending "add to cart" action after login/signup
 * @param {Object} pending - Pending book data
 */
async function executePendingAddToCart(pending) {
    try {
        const { bookId, bookData, quantity } = pending;
        const book = typeof bookData === 'string' ? JSON.parse(bookData.replace(/&quot;/g, '"')) : bookData;

        // Add book to cart
        let cart = getCart();
        const existingItem = cart.find(item => item.id === bookId);

        if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 1) + (quantity || 1);
        } else {
            cart.push({
                id: bookId,
                ...book,
                quantity: quantity || 1
            });
        }

        saveCart(cart);
        updateCartCount();

        // Show success notification
        if (typeof showNotification === 'function') {
            showNotification(`${book.title || 'Book'} added to cart!`, 'success');
        } else {
            alert(`${book.title || 'Book'} added to cart!`);
        }

    } catch (error) {
        console.error('Error executing pending add to cart:', error);
        if (typeof showNotification === 'function') {
            showNotification('Error adding to cart', 'error');
        }
    }
}


// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    // Load current user's cart and wishlist data
    const currentUser = getCurrentUser();
    if (currentUser) {
        loadUserSessionData(currentUser.id);
    }

    updateUserUI();


    // Close dropdowns when clicking outside
    document.addEventListener('click', function (e) {
        const userDropdown = document.getElementById('userDropdown');
        if (userDropdown && !e.target.closest('.user-account')) {
            userDropdown.classList.remove('active');
        }
    });

    // Close modals on escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeLoginModal();
            closeSignupModal();
            closeWishlist();
            closeCart();
        }
    });
});
