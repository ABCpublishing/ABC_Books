// ===== Checkout Page JavaScript =====

// Dynamic API URL (same as api.js)
const CHECKOUT_API_BASE = (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
    ? '/api'
    : 'http://localhost:3001/api';

let cartItems = [];
let subtotal = 0;
let discount = 0;
let grandTotal = 0;

// Initialize checkout page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🛒 Checkout page initializing...');

    // Check if user is logged in
    const currentUser = JSON.parse(localStorage.getItem('abc_books_current_user') || 'null');
    const hasValidToken = typeof API !== 'undefined' && API.Token && API.Token.isValid();

    if (!currentUser && !hasValidToken) {
        console.log('❌ User not logged in, prompting...');

        // Save current page state
        localStorage.setItem('abc_books_pending_action', 'checkout');

        if (typeof showNotification === 'function') {
            showNotification('🔐 Please sign in with Google to complete your order', 'info');
        }

        // Show login modal
        if (typeof showLoginModal === 'function') {
            showLoginModal();
        } else {
            console.error('showLoginModal not found, falling back to redirect');
            window.location.href = '/index.html';
        }
        return;
    }

    console.log('✅ User logged in:', currentUser?.name || 'Token User');

    // WARN if no valid token (Legacy session or token expired)
    // Only show if we're actually logged in locally but the server connection (token) is dead
    if (currentUser && !hasValidToken) {
        console.warn('⚠️ User has session but no valid API token');
        const target = document.querySelector('.checkout-grid') || document.querySelector('.container');

        const warning = document.createElement('div');
        warning.className = 'offline-warning-banner';
        warning.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
            padding: 12px 20px;
            background: #fff3cd;
            color: #856404;
            border: 1px solid #ffeeba;
            border-radius: 8px;
            margin-bottom: 25px;
            font-size: 14px;
        `;

        warning.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>
                <strong>Note:</strong> You are in offline mode. Orders will be saved locally but not synced to the server. 
                <a href="#" onclick="if(window.API) API.Auth.logout(); window.location.href='/index.html'; return false;" style="text-decoration: underline; color: inherit; font-weight: bold; margin-left: 5px;">Click here to re-login</a> to sync.
            </span>
        `;

        if (target) {
            target.parentElement.insertBefore(warning, target);
        }
    }

    // Load cart items (try API first, then localStorage)
    await loadCartItems();
    loadSummaryItems();
    calculateTotals();
    loadSavedAddress();
});

// Load cart items - TRY API FIRST, THEN LOCALSTORAGE
async function loadCartItems() {
    const container = document.getElementById('checkoutCartItems');
    const currentUser = JSON.parse(localStorage.getItem('abc_books_current_user') || 'null');

    // Try to load from API first
    if (typeof API !== 'undefined' && API.Cart && currentUser && currentUser.id) {
        try {
            console.log('📦 Loading cart from API for user:', currentUser.id);
            const apiResponse = await API.Cart.get(currentUser.id);
            console.log('📦 API Cart response:', apiResponse);

            // Handle response format: { cart: [...], itemCount, total }
            const apiCart = apiResponse?.cart || apiResponse;

            if (apiCart && Array.isArray(apiCart) && apiCart.length > 0) {
                // Transform API cart items to match expected format
                cartItems = apiCart.map(item => ({
                    id: item.book_id || item.id,
                    title: item.title || 'Book',
                    author: item.author || 'Unknown Author',
                    price: parseFloat(item.price) || 0,
                    image: item.image || '',
                    quantity: item.quantity || 1
                }));
                console.log('✅ Loaded', cartItems.length, 'items from API');
            }
        } catch (apiError) {
            console.log('⚠️ API cart load failed:', apiError.message);
        }
    }

    // If no items from API, try localStorage
    if (cartItems.length === 0) {
        console.log('📦 Trying localStorage...');
        const localCart = JSON.parse(localStorage.getItem('abc_books_cart') || '[]');
        if (localCart.length > 0) {
            cartItems = localCart;
            console.log('✅ Loaded', cartItems.length, 'items from localStorage');
        }
    }

    console.log('🛒 Final cart items:', cartItems);

    if (cartItems.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Your cart is empty</p>
                <a href="/index.html" style="display: inline-block; margin-top: 15px; color: #8B4513;">Continue Shopping</a>
            </div>
        `;
        return;
    }

    container.innerHTML = cartItems.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.title}"
                onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22150%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22100%22 height=%22150%22/%3E%3C/svg%3E'">
            <div class="cart-item-details">
                <h4>${item.title}</h4>
                <p class="author">${item.author || 'Unknown Author'}</p>
                <div class="price-qty">
                    <span class="price">₹${item.price}</span>
                    <span class="qty">Qty: ${item.quantity || 1}</span>
                </div>
            </div>
            <button class="remove-btn" onclick="removeItem('${item.id}')">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Load summary items
function loadSummaryItems() {
    const container = document.getElementById('summaryItems');

    if (cartItems.length === 0) {
        container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No items in cart</p>';
        return;
    }

    container.innerHTML = cartItems.map(item => `
        <div class="summary-item">
            <div class="summary-item-info">
                <img src="${item.image}" alt="${item.title}"
                    onerror="this.src='data:image/svg+xml,...'">
                <div>
                    <div class="title">${item.title}</div>
                    <div class="qty">Qty: ${item.quantity || 1}</div>
                </div>
            </div>
            <span class="summary-item-price">₹${item.price * (item.quantity || 1)}</span>
        </div>
    `).join('');
}

// Calculate totals
function calculateTotals() {
    subtotal = cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
    grandTotal = subtotal - discount;

    document.getElementById('subtotal').textContent = `₹${subtotal}`;
    document.getElementById('grandTotal').textContent = `₹${grandTotal}`;

    // Show/hide discount row
    const discountRow = document.getElementById('discountRow');
    if (discount > 0) {
        discountRow.style.display = 'flex';
        document.getElementById('discountAmount').textContent = `-₹${discount}`;
    } else {
        discountRow.style.display = 'none';
    }

    // Update shipping (free above ₹499)
    const shippingEl = document.getElementById('shipping');
    if (subtotal >= 499) {
        shippingEl.textContent = 'FREE';
        shippingEl.className = 'free-shipping';
    } else {
        shippingEl.textContent = '₹49';
        shippingEl.className = '';
        grandTotal += 49;
        document.getElementById('grandTotal').textContent = `₹${grandTotal}`;
    }
}

// Remove item from cart
function removeItem(bookId) {
    cartItems = cartItems.filter(item => item.id !== bookId);
    localStorage.setItem('abc_books_cart', JSON.stringify(cartItems));
    loadCartItems();
    loadSummaryItems();
    calculateTotals();
}

// Apply promo code
function applyPromo() {
    const code = document.getElementById('promoCode').value.trim().toUpperCase();

    const promoCodes = {
        'NEWYEAR2025': 20,  // 20% off
        'BOOKS10': 10,      // 10% off
        'SAVE50': 50        // Flat ₹50 off
    };

    if (promoCodes[code]) {
        const discountPercent = promoCodes[code];
        if (code === 'SAVE50') {
            discount = 50;
        } else {
            discount = Math.round(subtotal * (discountPercent / 100));
        }
        calculateTotals();
        showNotification(`Promo code applied! You save ₹${discount}`, 'success');
    } else {
        showNotification('Invalid promo code', 'error');
    }
}

// Load saved address
function loadSavedAddress() {
    // Get current logged in user
    const user = JSON.parse(localStorage.getItem('abc_books_current_user') || 'null');

    // If user is logged in, load their specific address
    if (user && user.id) {
        const userAddress = localStorage.getItem(`abc_books_user_${user.id}_address`);

        if (userAddress) {
            const address = JSON.parse(userAddress);
            document.getElementById('firstName').value = address.firstName || '';
            document.getElementById('lastName').value = address.lastName || '';
            document.getElementById('email').value = address.email || '';
            document.getElementById('phone').value = address.phone || '';
            document.getElementById('address1').value = address.address1 || '';
            document.getElementById('address2').value = address.address2 || '';
            document.getElementById('city').value = address.city || '';
            document.getElementById('state').value = address.state || '';
            document.getElementById('pincode').value = address.pincode || '';
        } else {
            // Clear all address fields for logged-in user without saved address
            clearAddressForm();

            // Pre-fill from user profile
            if (user.email) {
                document.getElementById('email').value = user.email;
            }
            if (user.name) {
                const names = user.name.split(' ');
                document.getElementById('firstName').value = names[0] || '';
                document.getElementById('lastName').value = names.slice(1).join(' ') || '';
            }
            if (user.phone) {
                document.getElementById('phone').value = user.phone;
            }
        }
    } else {
        // Guest user - clear the form
        clearAddressForm();
    }
}

// Clear address form fields
function clearAddressForm() {
    const fields = ['firstName', 'lastName', 'email', 'phone', 'address1', 'address2', 'city', 'state', 'pincode'];
    fields.forEach(field => {
        const input = document.getElementById(field);
        if (input) {
            input.value = '';
        }
    });
}


// Validate form
function validateForm() {
    const required = ['firstName', 'lastName', 'email', 'phone', 'address1', 'city', 'state', 'pincode'];

    for (const field of required) {
        const input = document.getElementById(field);
        if (!input.value.trim()) {
            input.focus();
            showNotification(`Please fill in ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`, 'error');
            return false;
        }
    }

    // Email validation
    const email = document.getElementById('email').value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return false;
    }

    // Phone validation
    const phone = document.getElementById('phone').value;
    if (!/^[0-9+\s-]{10,}$/.test(phone)) {
        showNotification('Please enter a valid phone number', 'error');
        return false;
    }

    // Pincode validation
    const pincode = document.getElementById('pincode').value;
    if (!/^[0-9]{6}$/.test(pincode)) {
        showNotification('Please enter a valid 6-digit PIN code', 'error');
        return false;
    }

    return true;
}

// Place order
async function placeOrder() {
    console.log('🛒 Place Order clicked');
    console.log('Cart items:', cartItems);

    if (cartItems.length === 0) {
        showNotification('Your cart is empty', 'error');
        return;
    }

    if (!validateForm()) {
        return;
    }

    // Get selected payment method
    const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'cod';
    console.log('💳 Payment method selected:', paymentMethod);

    // If Razorpay is selected, initiate Razorpay payment
    if (paymentMethod === 'razorpay') {
        await initiateRazorpayPayment();
        return;
    }

    // For other payment methods (COD, UPI, Card, NetBanking), proceed with normal order
    await processOrder(paymentMethod);
}

// Initiate Razorpay Payment
async function initiateRazorpayPayment() {
    try {
        console.log('💳 Initiating Razorpay payment...');
        showNotification('Initializing payment...', 'info');

        // Create Razorpay order via backend
        const response = await fetch(`${CHECKOUT_API_BASE}/payment/create-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: grandTotal,
                currency: 'INR',
                receipt: 'order_' + Date.now(),
                notes: {
                    customer_name: document.getElementById('firstName').value + ' ' + document.getElementById('lastName').value,
                    customer_email: document.getElementById('email').value
                }
            })
        });

        const data = await response.json();
        console.log('📥 Razorpay order response:', data);

        if (!data.success) {
            showNotification('Failed to create payment order: ' + (data.error || 'Unknown error'), 'error');
            return;
        }

        // Get user details for prefilling
        const currentUser = JSON.parse(localStorage.getItem('abc_books_current_user') || 'null');

        // Razorpay checkout options
        const options = {
            key: data.key_id,
            amount: data.order.amount,
            currency: data.order.currency,
            name: 'ABC Books',
            description: 'Book Purchase',
            order_id: data.order.id,
            prefill: {
                name: document.getElementById('firstName').value + ' ' + document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                contact: document.getElementById('phone').value
            },
            notes: {
                address: document.getElementById('address1').value + ', ' + document.getElementById('city').value
            },
            theme: {
                color: '#8B4513'
            },
            handler: async function (response) {
                console.log('✅ Razorpay payment successful:', response);

                // Verify payment on backend
                const verifyResponse = await fetch(`${CHECKOUT_API_BASE}/payment/verify`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature
                    })
                });

                const verifyData = await verifyResponse.json();
                console.log('🔐 Payment verification:', verifyData);

                if (verifyData.success) {
                    // Payment verified, now save the order
                    await processOrder('razorpay', response.razorpay_payment_id);
                } else {
                    showNotification('Payment verification failed. Please contact support.', 'error');
                }
            },
            modal: {
                ondismiss: function () {
                    console.log('⚠️ Razorpay modal closed');
                    showNotification('Payment cancelled', 'warning');
                }
            }
        };

        // Open Razorpay checkout
        const razorpay = new Razorpay(options);
        razorpay.on('payment.failed', function (response) {
            console.error('❌ Payment failed:', response.error);
            showNotification('Payment failed: ' + response.error.description, 'error');
        });
        razorpay.open();

    } catch (error) {
        console.error('❌ Razorpay error:', error);
        showNotification('Payment initialization failed: ' + error.message, 'error');
    }
}

// Process Order (called after payment or for COD)
async function processOrder(paymentMethod, paymentId = null) {
    try {
        // Get form data
        const orderData = {
            orderId: 'ABC-' + Date.now().toString(36).toUpperCase(),
            items: cartItems,
            subtotal: subtotal,
            discount: discount,
            total: grandTotal,
            shipping: {
                firstName: document.getElementById('firstName').value,
                lastName: document.getElementById('lastName').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                address1: document.getElementById('address1').value,
                address2: document.getElementById('address2').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                pincode: document.getElementById('pincode').value,
                country: 'India'
            },
            paymentMethod: paymentMethod,
            paymentId: paymentId, // Razorpay payment ID if applicable
            orderDate: new Date().toISOString(),
            status: paymentMethod === 'razorpay' ? 'paid' : 'confirmed'
        };

        console.log('📦 Order data:', orderData);

        // Save address for future (user-specific)
        const currentUser = JSON.parse(localStorage.getItem('abc_books_current_user') || 'null');
        if (currentUser && currentUser.id) {
            localStorage.setItem(`abc_books_user_${currentUser.id}_address`, JSON.stringify(orderData.shipping));
        }

        // Try to save order to API (if available)
        let apiOrderSuccess = false;
        const jwtToken = (typeof API !== 'undefined' && API.Token) ? API.Token.get() : (localStorage.getItem('accessToken') || localStorage.getItem('token') || localStorage.getItem('jwt_token'));

        console.log('🔐 Token exists:', !!jwtToken);
        console.log('👤 Current user:', currentUser);

        if (typeof API !== 'undefined' && jwtToken && currentUser && currentUser.id) {
            try {
                console.log('📤 Sending order to API...');
                console.log('📤 User ID:', currentUser.id);

                // Format items for API - includes all book details for storage
                const apiItems = cartItems.map(item => ({
                    book_id: item.id,
                    quantity: item.quantity || 1,
                    price: item.price,
                    title: item.title,
                    author: item.author,
                    image: item.image
                }));

                console.log('📤 Items to save:', apiItems);

                // Send to backend API
                const response = await fetch(`${CHECKOUT_API_BASE}/orders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${jwtToken}`
                    },
                    body: JSON.stringify({
                        user_id: currentUser.id,
                        items: apiItems,
                        subtotal: orderData.subtotal,
                        discount: orderData.discount,
                        total: orderData.total,
                        shipping_first_name: orderData.shipping.firstName,
                        shipping_last_name: orderData.shipping.lastName,
                        shipping_email: orderData.shipping.email,
                        shipping_phone: orderData.shipping.phone,
                        shipping_address1: orderData.shipping.address1,
                        shipping_address2: orderData.shipping.address2,
                        shipping_city: orderData.shipping.city,
                        shipping_state: orderData.shipping.state,
                        shipping_pincode: orderData.shipping.pincode,
                        payment_method: orderData.paymentMethod,
                        payment_id: orderData.paymentId,
                        status: orderData.status
                    })
                });

                const result = await response.json();
                console.log('📥 API Response:', result);
                console.log('📥 Response status:', response.status);

                if (response.ok) {
                    console.log('✅ Order saved to database!');
                    apiOrderSuccess = true;
                    // Update order ID from API response
                    if (result.order && result.order.order_id) {
                        orderData.orderId = result.order.order_id;
                    }
                } else {
                    console.error('❌ API returned error:', result.error || result);
                    // Show user-friendly error
                    if (typeof showNotification === 'function') {
                        showNotification('Order saved locally. Database sync failed: ' + (result.error || 'Unknown error'), 'warning');
                    }
                }
            } catch (apiError) {
                console.error('❌ API Error:', apiError);
                console.error('❌ Error details:', apiError.message);
                console.error('❌ Error stack:', apiError.stack);
                console.error('❌ This could be a network error or server issue');
                // Show user notification
                if (typeof showNotification === 'function') {
                    showNotification('Order saved locally. Could not connect to server: ' + apiError.message, 'warning');
                }
            }
        } else {
            // Log why we're not calling the API
            if (!jwtToken) {
                console.log('⚠️ No JWT token found - user not authenticated with backend');
            }
            if (!currentUser) {
                console.log('⚠️ No current user found');
            }
            if (typeof API === 'undefined') {
                console.log('⚠️ API object not available');
            }
            console.log('ℹ️ Order will be saved to localStorage only');
        }

        // Save order to localStorage
        let orders = JSON.parse(localStorage.getItem('abc_books_orders') || '[]');
        orders.push(orderData);
        localStorage.setItem('abc_books_orders', JSON.stringify(orders));
        console.log('✅ Order saved to localStorage');

        // Clear cart
        localStorage.setItem('abc_books_cart', JSON.stringify([]));
        console.log('✅ Cart cleared');

        // Show success modal
        const orderIdEl = document.getElementById('orderId');
        if (orderIdEl) {
            orderIdEl.textContent = orderData.orderId;
        }

        // Calculate delivery date (5-7 days)
        const deliveryDate = new Date();
        deliveryDate.setDate(deliveryDate.getDate() + 5 + Math.floor(Math.random() * 3));
        const deliveryDateEl = document.getElementById('deliveryDate');
        if (deliveryDateEl) {
            deliveryDateEl.textContent = deliveryDate.toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }

        const successModal = document.getElementById('successModal');
        if (successModal) {
            successModal.classList.add('active');
            console.log('✅ Success modal displayed');
        } else {
            console.error('❌ Success modal element not found!');
            showNotification('Order placed successfully! Order ID: ' + orderData.orderId, 'success');
        }

        // Update progress steps
        document.querySelectorAll('.step').forEach(step => step.classList.add('active'));
        document.querySelectorAll('.step-line').forEach(line => line.classList.add('active'));

    } catch (error) {
        console.error('❌ Error placing order:', error);
        showNotification('Error placing order. Please try again.', 'error');
    }
}

// Show notification
function showNotification(message, type = 'success') {
    // Define colors and icons for each type
    const typeStyles = {
        success: {
            background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
            icon: 'fa-check-circle'
        },
        error: {
            background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
            icon: 'fa-exclamation-circle'
        },
        warning: {
            background: 'linear-gradient(135deg, #f39c12, #e67e22)',
            icon: 'fa-exclamation-triangle'
        },
        info: {
            background: 'linear-gradient(135deg, #3498db, #2980b9)',
            icon: 'fa-info-circle'
        }
    };

    const style = typeStyles[type] || typeStyles.info;

    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${style.background};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    notification.innerHTML = `
        <i class="fas ${style.icon}"></i>
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
`;
document.head.appendChild(style);
