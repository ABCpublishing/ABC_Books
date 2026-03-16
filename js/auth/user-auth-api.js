// ===== ABC Books - API-Integrated Authentication & Shop Functionality =====
// This version uses the backend API instead of localStorage

// Check if API is available
if (typeof API === 'undefined') {
    console.error('❌ API service not loaded! Make sure api.js is included before this file.');
}

// Current user state (cached from API)
let currentUserCache = null;

// ===== GLOBAL UI HELPERS =====
// Show notification if not already defined in another script
if (typeof showNotification === 'undefined') {
    window.showNotification = function (message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : (type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle')}"></i>
            <span>${message}</span>
        `;

        // Base styles for notification
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'success' ? 'linear-gradient(135deg, #27ae60, #2ecc71)' :
                (type === 'error' ? 'linear-gradient(135deg, #e74c3c, #ff4757)' : 'linear-gradient(135deg, #3498db, #5dade2)')};
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 10px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    };

    // Add required keyframes if not present
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100px); opacity: 0; } }
        `;
        document.head.appendChild(style);
    }
}

// ===== HELPER FUNCTIONS =====
async function getCurrentUser() {
    // 1. Definitively check physical token presence FIRST
    const directToken = (typeof API !== 'undefined' && API.Token) ? API.Token.get() : (localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('jwt_token'));

    if (!directToken || (typeof API !== 'undefined' && API.Token && !API.Token.isValid())) {
        currentUserCache = null;
        return null;
    }

    // 2. Return cached user if available
    if (currentUserCache) {
        return currentUserCache;
    }

    // 3. We have a token. Let's try to get fresh data from the API
    try {
        if (typeof API !== 'undefined' && API.Auth) {
            const response = await API.Auth.getCurrentUser();
            const user = response.user || response;
            if (user && user.id) {
                currentUserCache = user;
                localStorage.setItem('abc_books_current_user', JSON.stringify(user));
                return user;
            }
        }
    } catch (error) {
        console.warn('⚠️ API user fetch failed, trying localStorage...', error);
    }

    // 4. Fallback to localStorage
    const savedUser = localStorage.getItem('abc_books_current_user');
    if (savedUser) {
        try {
            const user = JSON.parse(savedUser);
            if (user && user.id) {
                currentUserCache = user;
                return user;
            }
        } catch (e) {
            console.error('Error parsing saved user:', e);
        }
    }

    return null;
}

function clearUserCache() {
    currentUserCache = null;
}

// ===== MODAL FUNCTIONS =====
function showLoginModal() {
    if (typeof resetFormErrors === 'function') resetFormErrors('loginForm');
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Force Google render whenever modal opens
        if (typeof renderGoogleButtons === 'function') {
            setTimeout(() => {
                console.log('🔄 Rendering Google buttons for login modal...');
                renderGoogleButtons();
            }, 100);

            // Second pass for safety
            setTimeout(renderGoogleButtons, 500);
        }
    }
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('active');
    document.body.style.overflow = '';
}

function showSignupModal() {
    if (typeof resetFormErrors === 'function') resetFormErrors('signupForm');
    const modal = document.getElementById('signupModal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Force Google render for signup
        if (typeof renderGoogleButtons === 'function') {
            setTimeout(renderGoogleButtons, 100);
            setTimeout(renderGoogleButtons, 500);
        }
    }
}

function closeSignupModal() {
    document.getElementById('signupModal').classList.remove('active');
    document.body.style.overflow = '';
}

function switchToSignup() {
    closeLoginModal();
    closeForgotModal();
    showSignupModal();
}

function switchToLogin() {
    closeSignupModal();
    closeForgotModal();
    showLoginModal();
}

// ----- Forgot Password Modal Functions -----
function showForgotModal(event) {
    if (event) event.preventDefault();
    closeLoginModal();
    if (typeof resetFormErrors === 'function') resetFormErrors('forgotForm');

    // Reset borders and success messages
    const successBanner = document.getElementById('forgotFormSuccess');
    if (successBanner) successBanner.style.display = 'none';

    document.getElementById('forgotModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeForgotModal() {
    document.getElementById('forgotModal').classList.remove('active');
    document.body.style.overflow = '';
}

function switchToLoginReset() {
    closeForgotModal();
    showLoginModal();
}

// ===== AUTHENTICATION FUNCTIONS =====
// ===== VALIDATION HELPERS =====
function showInputError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorSpan = document.getElementById(inputId + 'Error');
    if (input && errorSpan) {
        input.parentElement.classList.add('error');
        errorSpan.textContent = message;
        errorSpan.style.display = 'block';
    }
}

function showFormBannerError(formId, message) {
    const banner = document.getElementById(formId + 'Error');
    if (banner) {
        banner.querySelector('span').textContent = message;
        banner.style.display = 'flex';
    }
}

function resetFormErrors(formId) {
    const banner = document.getElementById(formId + 'Error');
    if (banner) banner.style.display = 'none';

    const form = document.getElementById(formId);
    if (form) {
        form.querySelectorAll('.form-group').forEach(group => group.classList.remove('error'));
        form.querySelectorAll('.error-message').forEach(span => {
            span.textContent = '';
            span.style.display = 'none';
        });
        // Restore all form elements (in case they were hidden on success)
        form.querySelectorAll('.form-group, .btn-auth, .google-auth-separator').forEach(el => {
            if (!el.id || !el.id.includes('Success')) {
                el.style.display = '';
            }
        });
    }
}

function setLoadingState(btn, isLoading) {
    if (!btn) return;
    if (isLoading) {
        btn.classList.add('loading');
        btn.dataset.originalText = btn.innerHTML;
        btn.style.width = btn.offsetWidth + 'px'; // Maintain width
    } else {
        btn.classList.remove('loading');
        if (btn.dataset.originalText) btn.innerHTML = btn.dataset.originalText;
        btn.style.width = '';
    }
}

// ===== GOOGLE SIGN IN =====
const GOOGLE_CLIENT_ID = '610549250942-paac6unq730b8osmhqbreve39fuduti9.apps.googleusercontent.com';
let googleInitialized = false;

function initGoogleSignIn() {
    if (typeof google === 'undefined' || !google.accounts) {
        setTimeout(initGoogleSignIn, 500);
        return;
    }

    if (!googleInitialized) {
        try {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleSignIn,
                auto_select: false,
                cancel_on_tap_outside: true,
                itp_support: true
            });
            googleInitialized = true;

            // Display Google One Tap prompt automatically on landing
            google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed()) {
                    console.log('One Tap not displayed:', notification.getNotDisplayedReason());
                }
            });
        } catch (error) {
            console.error('Error initializing Google Sign-In:', error);
            setTimeout(initGoogleSignIn, 1000);
            return;
        }
    }

    renderGoogleButtons();
}

function renderGoogleButtons() {
    if (typeof google === 'undefined' || !google.accounts || !googleInitialized) return;

    const render = () => {
        try {
            const loginBtn = document.getElementById("googleSignInBtnLogin");
            if (loginBtn) {
                google.accounts.id.renderButton(loginBtn, {
                    theme: "outline",
                    size: "large",
                    width: 320,
                    text: "continue_with",
                    shape: "pill"
                });
            }

            const signupBtn = document.getElementById("googleSignInBtnSignup");
            if (signupBtn) {
                google.accounts.id.renderButton(signupBtn, {
                    theme: "outline",
                    size: "large",
                    width: 320,
                    text: "signup_with",
                    shape: "pill"
                });
            }
        } catch (err) {
            console.warn('Google button rendering failed, retrying...', err);
        }
    };

    // Immediate attempt
    render();

    // Fallback retries if modal animation is slow
    let retries = 0;
    const interval = setInterval(() => {
        render();
        if (++retries >= 5) clearInterval(interval);
    }, 400);
}

// Multi-method initialization to ensure it runs
if (document.readyState === 'complete') {
    initGoogleSignIn();
} else {
    window.addEventListener('load', initGoogleSignIn);
    document.addEventListener('DOMContentLoaded', initGoogleSignIn);
}


async function handleGoogleSignIn(response) {
    if (!response.credential) return;

    try {
        const result = await API.Auth.googleLogin(response.credential);

        if (result.user) {
            currentUserCache = result.user;

            if (result.token || result.accessToken) {
                const finalToken = result.accessToken || result.token;
                localStorage.setItem('accessToken', finalToken);
                localStorage.setItem('token', finalToken);
                localStorage.setItem('jwt_token', finalToken);
            }

            localStorage.setItem('abc_books_current_user', JSON.stringify(result.user));

            closeLoginModal();
            closeSignupModal();
            if (typeof updateUserUI === 'function') await updateUserUI();
            if (typeof loadUserData === 'function') await loadUserData();

            if (typeof showNotification === 'function') {
                showNotification(`Welcome, ${result.user.name}!`, 'success');
            }

            await processPendingAction();
        }
    } catch (error) {
        console.error('Google login error:', error);
        if (typeof showNotification === 'function') {
            showNotification('Google Sign-In failed: ' + error.message, 'error');
        } else {
            alert('Google Sign-In failed: ' + error.message);
        }
    }
}

// ===== AUTHENTICATION FUNCTIONS =====
async function handleLogin(event) {
    event.preventDefault();

    const formId = 'loginForm';
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const submitBtn = event.target.querySelector('button[type="submit"]');

    resetFormErrors(formId);

    // Validation
    let isValid = true;
    if (!emailInput.value.trim()) {
        showInputError('loginEmail', 'Email address is required');
        isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
        showInputError('loginEmail', 'Please enter a valid email address');
        isValid = false;
    }

    if (!passwordInput.value) {
        showInputError('loginPassword', 'Password is required');
        isValid = false;
    }

    if (!isValid) return;

    // API Call
    setLoadingState(submitBtn, true);

    try {
        const response = await API.Auth.login({
            email: emailInput.value,
            password: passwordInput.value
        });

        if (response.user) {
            currentUserCache = response.user;

            // ✅ CRITICAL RUNTIME FIX: Directly force token write to localStorage 
            // Ensures persistence even if TokenManager fails to sync
            if (response.token || response.accessToken) {
                const finalToken = response.accessToken || response.token;
                localStorage.setItem('accessToken', finalToken);
                localStorage.setItem('token', finalToken);
                localStorage.setItem('jwt_token', finalToken);
                console.log('✅ Tokens securely written to localStorage:', finalToken.substring(0, 15) + '...');
            }

            localStorage.setItem('abc_books_current_user', JSON.stringify(response.user));
            console.log('✅ User saved to localStorage:', response.user);

            closeLoginModal();
            await updateUserUI();
            await loadUserData();

            if (typeof showNotification === 'function') {
                showNotification(`Welcome back, ${response.user.name}!`, 'success');
            }

            await processPendingAction();
        }
    } catch (error) {
        console.error('Login error:', error);

        // Wipe local ghosts on failed login attempts to prevent UI desync
        clearUserCache();
        localStorage.removeItem('abc_books_current_user');
        if (typeof updateUserUI === 'function') updateUserUI();

        if (error.message.toLowerCase().includes('password') && !error.message.toLowerCase().includes('email')) {
            showInputError('loginPassword', 'Incorrect password');
        } else if (error.message.toLowerCase().includes('email') || error.message.toLowerCase().includes('found') || error.message.toLowerCase().includes('phone')) {
            showInputError('loginEmail', 'Invalid email or account not found');
        } else {
            showFormBannerError(formId, error.message || 'Login failed. Please try again.');
        }
    } finally {
        setLoadingState(submitBtn, false);
    }
}

async function handleSignup(event) {
    event.preventDefault();

    const formId = 'signupForm';
    const nameInput = document.getElementById('signupName');
    const emailInput = document.getElementById('signupEmail');
    const passwordInput = document.getElementById('signupPassword');
    const confirmInput = document.getElementById('signupConfirmPassword');
    const submitBtn = event.target.querySelector('button[type="submit"]');

    resetFormErrors(formId);

    // Validation
    let isValid = true;
    if (!nameInput.value.trim()) {
        showInputError('signupName', 'Full Name is required');
        isValid = false;
    }

    if (!emailInput.value.trim()) {
        showInputError('signupEmail', 'Email is required');
        isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(emailInput.value)) {
        showInputError('signupEmail', 'Please enter a valid email address');
        isValid = false;
    }

    if (passwordInput.value.length < 6) {
        showInputError('signupPassword', 'Password must be at least 6 characters');
        isValid = false;
    }

    if (passwordInput.value !== confirmInput.value) {
        showInputError('signupConfirmPassword', 'Passwords do not match');
        isValid = false;
    }

    if (!isValid) return;

    setLoadingState(submitBtn, true);

    try {
        const response = await API.Auth.register({
            name: nameInput.value,
            email: emailInput.value,
            password: passwordInput.value
        });

        if (response.user) {
            currentUserCache = response.user;
            // ✅ CRITICAL: Save user to localStorage for checkout to recognize the session
            localStorage.setItem('abc_books_current_user', JSON.stringify(response.user));
            console.log('✅ User saved to localStorage:', response.user);
            closeSignupModal();
            await updateUserUI();

            if (typeof showNotification === 'function') {
                showNotification(`Welcome to ABC Books, ${response.user.name}!`, 'success');
            }

            await processPendingAction();
        }
    } catch (error) {
        console.error('Signup error:', error);
        if (error.message.toLowerCase().includes('email')) {
            showInputError('signupEmail', 'This email is already registered');
        } else {
            showFormBannerError(formId, error.message || 'Registration failed. Please try again.');
        }
    } finally {
        setLoadingState(submitBtn, false);
    }
}

async function handleForgotPassword(event) {
    event.preventDefault();

    const formId = 'forgotForm';
    const emailInput = document.getElementById('forgotEmail');
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const successBanner = document.getElementById('forgotFormSuccess');

    resetFormErrors(formId);
    if (successBanner) successBanner.style.display = 'none';

    // Validation
    if (!emailInput.value.trim()) {
        showInputError('forgotEmail', 'Email is required');
        return;
    } else if (!/\S+@\S+\.\S+/.test(emailInput.value)) {
        showInputError('forgotEmail', 'Please enter a valid email address');
        return;
    }

    setLoadingState(submitBtn, true);

    try {
        const response = await API.Auth.forgotPassword(emailInput.value);

        if (successBanner) {
            // Hide the form fields for a clean "message type" look
            const form = document.getElementById(formId);
            if (form) {
                form.querySelectorAll('.form-group, .btn-auth, .form-error-banner').forEach(el => el.style.display = 'none');
            }
            
            successBanner.querySelector('span').textContent = response.message || 'Reset link sent! Please check your email inbox.';
            successBanner.style.display = 'flex';
            
            // Also show a toast for extra visibility
            if (typeof showNotification === 'function') {
                showNotification('Reset link sent successfully!', 'success');
            }
            
            emailInput.value = ''; // Clear input
        } else {
            if (typeof showNotification === 'function') {
                showNotification('Password reset link sent to your email!', 'success');
            }
            closeForgotModal();
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        if (error.message.toLowerCase().includes('found')) {
            showInputError('forgotEmail', 'No account found with this email');
        } else {
            showFormBannerError(formId, error.message || 'Failed to send reset link. Please try again.');
        }
    } finally {
        setLoadingState(submitBtn, false);
    }
}

// ===== PENDING ACTION EXECUTION =====

/**
 * Get correct path to checkout based on current location
 */
function getCheckoutPath() {
    return '/pages/checkout.html';
}

/**
 * Process pending action after login/signup
 */
async function processPendingAction() {
    const pendingAction = localStorage.getItem('abc_books_pending_action');
    const pendingBookData = localStorage.getItem('abc_books_pending_book');

    if (!pendingAction || !pendingBookData) {
        return;
    }

    try {
        const pending = JSON.parse(pendingBookData);
        const user = await getCurrentUser();

        if (!user) {
            return;
        }

        // Clear pending data first
        localStorage.removeItem('abc_books_pending_action');
        localStorage.removeItem('abc_books_pending_book');

        const { bookId, bookData, quantity } = pending;

        // Wait a moment before executing
        await new Promise(resolve => setTimeout(resolve, 500));

        if (pendingAction === 'buy_now') {
            // Add to cart and redirect to checkout
            try {
                // Save to localStorage first (backup)
                let localCart = JSON.parse(localStorage.getItem('abc_books_cart') || '[]');
                const existingIndex = localCart.findIndex(item => item.id === bookId);

                if (existingIndex >= 0) {
                    localCart[existingIndex].quantity = (localCart[existingIndex].quantity || 1) + (quantity || 1);
                } else {
                    localCart.push({
                        id: bookId,
                        title: bookData?.title || 'Book',
                        author: bookData?.author || 'Unknown Author',
                        price: bookData?.price || 0,
                        image: bookData?.image || '',
                        quantity: quantity || 1
                    });
                }
                localStorage.setItem('abc_books_cart', JSON.stringify(localCart));
                console.log('✅ Buy Now: Saved to localStorage cart');

                // Try API as well
                try {
                    await API.Cart.add({
                        user_id: user.id,
                        book_id: bookId,
                        quantity: quantity || 1
                    });
                    console.log('✅ Buy Now: Saved to API cart');
                } catch (apiErr) {
                    console.log('⚠️ API cart add failed:', apiErr.message);
                }

                await updateCartCount();

                if (typeof showNotification === 'function') {
                    showNotification('Redirecting to checkout...', 'success');
                }

                setTimeout(() => {
                    window.location.href = getCheckoutPath();
                }, 800);
            } catch (error) {
                console.error('Error in pending buy now:', error);
                // Fallback: just redirect to checkout
                window.location.href = getCheckoutPath();
            }

        } else if (pendingAction === 'add_to_cart') {
            // Just add to cart - save to localStorage first
            try {
                // Save to localStorage first (backup)
                let localCart = JSON.parse(localStorage.getItem('abc_books_cart') || '[]');
                const existingIndex = localCart.findIndex(item => item.id === bookId);

                if (existingIndex >= 0) {
                    localCart[existingIndex].quantity = (localCart[existingIndex].quantity || 1) + (quantity || 1);
                } else {
                    localCart.push({
                        id: bookId,
                        title: bookData?.title || 'Book',
                        author: bookData?.author || 'Unknown Author',
                        price: bookData?.price || 0,
                        image: bookData?.image || '',
                        quantity: quantity || 1
                    });
                }
                localStorage.setItem('abc_books_cart', JSON.stringify(localCart));
                console.log('✅ Pending action: Saved to localStorage cart');

                // Try API as well
                try {
                    await API.Cart.add({
                        user_id: user.id,
                        book_id: bookId,
                        quantity: quantity || 1
                    });
                    console.log('✅ Pending action: Saved to API cart');
                } catch (apiErr) {
                    console.log('⚠️ API cart add failed:', apiErr.message);
                }

                await updateCartCount();

                if (typeof showNotification === 'function') {
                    showNotification(`${bookData?.title || 'Book'} added to cart!`, 'success');
                }
            } catch (error) {
                console.error('Error in pending add to cart:', error);
            }

        } else if (pendingAction === 'add_to_wishlist') {
            // Add to wishlist
            try {
                await API.Wishlist.add({
                    user_id: user.id,
                    book_id: bookId
                });
                await updateWishlistCount();

                if (typeof showNotification === 'function') {
                    showNotification(`${bookData?.title || 'Book'} added to wishlist!`, 'success');
                }
            } catch (error) {
                console.error('Error in pending add to wishlist:', error);
            }
        } else if (pendingAction === 'checkout') {
            // Re-sync and refresh checkout page
            if (window.location.pathname.includes('checkout')) {
                window.location.reload();
            } else {
                window.location.href = getCheckoutPath();
            }
        }

    } catch (error) {
        console.error('Error processing pending action:', error);
    }
}

async function userLogout() {
    if (confirm('Are you sure you want to logout?')) {
        API.Auth.logout();
        clearUserCache();
        await updateUserUI();
        alert('You have been logged out successfully.');
    }
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('active');
}

// ===== WISHLIST FUNCTIONS =====
async function toggleWishlist() {
    const user = await getCurrentUser();
    if (!user) {
        alert('Please login to view your wishlist');
        showLoginModal();
        return;
    }

    document.getElementById('wishlistOverlay').classList.add('active');
    document.getElementById('wishlistPanel').classList.add('active');
    document.body.style.overflow = 'hidden';
    await loadWishlistItems();
}

function closeWishlist() {
    document.getElementById('wishlistOverlay').classList.remove('active');
    document.getElementById('wishlistPanel').classList.remove('active');
    document.body.style.overflow = '';
}

async function loadWishlistItems() {
    const user = await getCurrentUser();
    if (!user) return;

    const content = document.getElementById('wishlistContent');

    try {
        const response = await API.Wishlist.get(user.id);
        const wishlist = response.wishlist || response || [];

        if (!Array.isArray(wishlist) || wishlist.length === 0) {
            content.innerHTML = '<p class="empty-message"><i class="fas fa-heart-broken"></i> Your wishlist is empty</p>';
            return;
        }

        content.innerHTML = wishlist.map(item => {
            const price = parseFloat(item.price) || 0;
            return `
                <div class="wishlist-item">
                    <img src="${item.image}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/50x70?text=Book'">
                    <div class="item-details">
                        <h4>${item.title}</h4>
                        <p>${item.author}</p>
                        <div class="item-price">₹${price.toFixed(2)}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn-icon" onclick="addToCartFromWishlist(${item.book_id})" title="Add to Cart">
                            <i class="fas fa-shopping-cart"></i>
                        </button>
                        <button class="btn-icon" onclick="removeFromWishlist(${item.id})" title="Remove">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading wishlist:', error);
        content.innerHTML = '<p class="empty-message">Error loading wishlist</p>';
    }

    await updateWishlistCount();
}

async function addToWishlist(bookId, bookData) {
    const user = await getCurrentUser();

    if (!user || user.id === -1) {
        // ✅ SAVE PENDING ACTION for auto-continue after login
        localStorage.setItem('abc_books_pending_action', 'add_to_wishlist');
        localStorage.setItem('abc_books_pending_book', JSON.stringify({
            bookId: bookId,
            bookData: bookData,
            quantity: 1,
            source: 'homepage'
        }));

        if (typeof showNotification === 'function') {
            showNotification('🔐 Login with Google to save to wishlist!', 'info');
        }
        showLoginModal();
        return;
    }

    const userObj = user || { id: -1 };

    try {
        await API.Wishlist.add({
            user_id: userObj.id,
            book_id: bookId
        });

        await updateWishlistCount();
        if (typeof showNotification === 'function') {
            showNotification(`${bookData?.title || 'Book'} added to wishlist!`, 'success');
        } else {
            alert('Book added to wishlist!');
        }
    } catch (error) {
        if (error.message.includes('already exists')) {
            if (typeof showNotification === 'function') {
                showNotification('This book is already in your wishlist', 'info');
            } else {
                alert('This book is already in your wishlist');
            }
        } else {
            alert('Error adding to wishlist. Please try again.');
        }
    }
}

async function removeFromWishlist(wishlistId) {
    try {
        await API.Wishlist.remove(wishlistId);
        await updateWishlistCount();
        await loadWishlistItems();
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        alert('Error removing from wishlist');
    }
}

async function addToCartFromWishlist(bookId) {
    try {
        const user = await getCurrentUser();
        await API.Cart.add({
            user_id: user.id,
            book_id: bookId,
            quantity: 1
        });

        // Remove from wishlist after adding to cart
        const wishlist = await API.Wishlist.get(user.id);
        const wishlistItem = wishlist.find(item => item.book_id === bookId);
        if (wishlistItem) {
            await removeFromWishlist(wishlistItem.id);
        }

        await updateCartCount();
        alert('Book added to cart!');
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Error adding to cart');
    }
}

// ===== CART FUNCTIONS =====
async function toggleCart() {
    const user = await getCurrentUser();
    if (!user) {
        alert('Please login to view your cart');
        showLoginModal();
        return;
    }

    document.getElementById('cartOverlay').classList.add('active');
    document.getElementById('cartPanel').classList.add('active');
    document.body.style.overflow = 'hidden';
    await loadCartItems();
}

function closeCart() {
    document.getElementById('cartOverlay').classList.remove('active');
    document.getElementById('cartPanel').classList.remove('active');
    document.body.style.overflow = '';
}

async function loadCartItems() {
    const user = await getCurrentUser();
    if (!user) return;

    const content = document.getElementById('cartContent');

    try {
        const response = await API.Cart.get(user.id);
        const cart = response.cart || response || [];

        if (!Array.isArray(cart) || cart.length === 0) {
            content.innerHTML = '<p class="empty-message"><i class="fas fa-shopping-cart"></i> Your cart is empty</p>';
            document.getElementById('cartTotal').textContent = '₹0';
            return;
        }

        content.innerHTML = cart.map(item => {
            const price = parseFloat(item.price) || 0;
            const qty = parseInt(item.quantity) || 1;
            return `
                <div class="cart-item">
                    <img src="${item.image}" alt="${item.title}" onerror="this.src='https://via.placeholder.com/50x70?text=Book'">
                    <div class="item-details">
                        <h4>${item.title}</h4>
                        <p>${item.author}</p>
                        <div class="item-price">₹${price.toFixed(2)}</div>
                        <div class="item-quantity">
                            <button onclick="updateQuantity(${item.id}, ${qty - 1})">-</button>
                            <span>${qty}</span>
                            <button onclick="updateQuantity(${item.id}, ${qty + 1})">+</button>
                        </div>
                    </div>
                    <button class="btn-remove" onclick="removeFromCart(${item.id})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        }).join('');

        updateCartTotal(cart);
    } catch (error) {
        console.error('Error loading cart:', error);
        content.innerHTML = '<p class="empty-message">Error loading cart</p>';
    }
}

async function addToCart(bookId, bookData) {
    const user = await getCurrentUser();

    // Strict validation: Must have a valid session and user object
    if (!user || user.id === -1) {
        // ✅ SAVE PENDING ACTION
        localStorage.setItem('abc_books_pending_action', 'add_to_cart');
        localStorage.setItem('abc_books_pending_book', JSON.stringify({
            bookId: bookId,
            bookData: bookData,
            quantity: 1,
            source: 'homepage'
        }));

        if (typeof showNotification === 'function') {
            showNotification('🔐 Login with Google to start shopping!', 'info');
        }

        showLoginModal();
        return;
    }

    const userObj = user || { id: -1 };

    try {
        // ✅ ALWAYS save to localStorage first (as backup)
        let localCart = JSON.parse(localStorage.getItem('abc_books_cart') || '[]');
        const existingIndex = localCart.findIndex(item => item.id === bookId);

        if (existingIndex >= 0) {
            localCart[existingIndex].quantity = (localCart[existingIndex].quantity || 1) + 1;
        } else {
            localCart.push({
                id: bookId,
                title: bookData?.title || 'Book',
                author: bookData?.author || 'Unknown Author',
                price: bookData?.price || 0,
                image: bookData?.image || '',
                quantity: 1
            });
        }
        localStorage.setItem('abc_books_cart', JSON.stringify(localCart));
        console.log('✅ Saved to localStorage cart:', localCart);

        // Try to save to API as well
        try {
            const response = await API.Cart.add({
                user_id: userObj.id,
                book_id: bookId,
                quantity: 1
            });
            console.log('✅ API Cart add response:', response);
        } catch (apiError) {
            console.log('⚠️ API cart add failed (using localStorage only):', apiError.message);
        }

        await updateCartCount();
        if (typeof showNotification === 'function') {
            showNotification(`${bookData?.title || 'Book'} added to cart!`, 'success');
        } else {
            alert('Book added to cart!');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Error adding to cart. Please try again.');
    }
}

async function removeFromCart(cartId) {
    try {
        await API.Cart.remove(cartId);
        await updateCartCount();
        await loadCartItems();
    } catch (error) {
        console.error('Error removing from cart:', error);
        alert('Error removing from cart');
    }
}

async function updateQuantity(cartId, newQuantity) {
    if (newQuantity < 1) {
        await removeFromCart(cartId);
        return;
    }

    try {
        await API.Cart.update(cartId, newQuantity);
        await loadCartItems();
    } catch (error) {
        console.error('Error updating quantity:', error);
        alert('Error updating quantity');
    }
}

function updateCartTotal(cart) {
    if (!Array.isArray(cart)) return;
    const total = cart.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const qty = parseInt(item.quantity) || 1;
        return sum + (price * qty);
    }, 0);
    const cartTotalEl = document.getElementById('cartTotal');
    if (cartTotalEl) {
        cartTotalEl.textContent = `₹${(total || 0).toFixed(2)}`;
    }
}

async function proceedToCheckout() {
    const user = await getCurrentUser();
    if (!user) {
        alert('Please login to proceed to checkout');
        showLoginModal();
        return;
    }

    try {
        const cart = await API.Cart.get(user.id);

        if (cart.length === 0) {
            alert('Your cart is empty. Please add items before checkout.');
            return;
        }

        // Redirect to checkout - always use root-relative path to prevent double "pages/"
        window.location.href = '/pages/checkout.html';
    } catch (error) {
        console.error('Error checking cart:', error);
        alert('Error loading cart. Please try again.');
    }
}

// ===== UI UPDATE FUNCTIONS =====
async function updateUserUI() {
    const user = await getCurrentUser();
    const authButtons = document.getElementById('authButtons');
    const userAccount = document.getElementById('userAccount');
    const userName = document.getElementById('userName');

    // Only update UI if elements exist (they might not exist on all pages)
    if (authButtons && userAccount) {
        if (user) {
            authButtons.style.display = 'none';
            userAccount.style.display = 'block';
            if (userName) {
                userName.textContent = user.name.split(' ')[0];
            }
        } else {
            authButtons.style.display = 'flex';
            userAccount.style.display = 'none';
        }
    }

    await updateWishlistCount();
    await updateCartCount();
}

async function updateWishlistCount() {
    const countElement = document.getElementById('wishlistCount');
    if (!countElement) return;

    try {
        const user = await getCurrentUser();
        if (!user) {
            countElement.textContent = '0';
            return;
        }

        const response = await API.Wishlist.get(user.id);
        const wishlist = response.wishlist || response || [];
        const finalCount = Array.isArray(wishlist) ? wishlist.length : 0;

        countElement.textContent = isNaN(finalCount) ? '0' : String(finalCount);
    } catch (error) {
        console.warn('Wishlist badge update failed:', error);
        countElement.textContent = '0';
    }
}

async function updateCartCount() {
    const countElement = document.getElementById('cartCount');
    if (!countElement) return;

    try {
        const user = await getCurrentUser();
        if (!user) {
            countElement.textContent = '0';
            return;
        }

        const response = await API.Cart.get(user.id);
        const cart = response.cart || response || [];

        let totalItems = 0;
        if (Array.isArray(cart)) {
            totalItems = cart.reduce((total, item) => {
                const q = parseInt(item.quantity);
                return total + (isNaN(q) ? 1 : q);
            }, 0);
        }

        countElement.textContent = isNaN(totalItems) ? '0' : String(totalItems);
    } catch (error) {
        console.warn('Cart badge update failed:', error);
        countElement.textContent = '0';
    }
}

// ===== LOAD USER DATA =====
async function loadUserData() {
    await updateWishlistCount();
    await updateCartCount();
}

// ===== USER MENU FUNCTIONS =====
function getPagePath(pageName) {
    if (pageName.includes('index.html')) return '/index.html';
    return `/pages/${pageName}`;
}

function viewOrders() {
    window.location.href = getPagePath('my-orders.html');
}

function viewWishlist() {
    window.location.href = getPagePath('wishlist.html');
}

function viewProfile() {
    window.location.href = getPagePath('my-account.html');
}

// ===== INITIALIZE ON PAGE LOAD =====
document.addEventListener('DOMContentLoaded', async function () {
    console.log('🔄 Initializing ABC Books with API integration...');

    // Check if user is logged in
    if (API.Token.isValid()) {
        try {
            await getCurrentUser();
            await updateUserUI();
            console.log('✅ User session restored');
        } catch (error) {
            console.error('❌ Error restoring session:', error);
            API.Token.remove();
            await updateUserUI();
        }
    } else {
        await updateUserUI();
    }

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
            closeForgotModal();
            closeWishlist();
            closeCart();
        }
    });

    console.log('✅ ABC Books initialized with API integration');
});
