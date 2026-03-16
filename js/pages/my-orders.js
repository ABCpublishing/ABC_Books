// ===== My Orders Page JavaScript =====

let allOrders = [];
let currentFilter = 'all';

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('abc_books_current_user'));
    if (!user) {
        // Show guest tracking UI or redirect to login
        showGuestTrackingUI();
    } else {
        loadOrders(user.id);
    }
    initializeFilters();
    initializeSearch();
});

function showGuestTrackingUI() {
    const container = document.getElementById('ordersList');
    const emptyState = document.getElementById('emptyState');

    container.innerHTML = `
        <div class="guest-track-card" style="background: #fff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); text-align: center; max-width: 500px; margin: 40px auto;">
            <div style="font-size: 50px; color: var(--primary-color); margin-bottom: 20px;">
                <i class="fas fa-truck-fast"></i>
            </div>
            <h2 style="margin-bottom: 15px; font-family: 'Playfair Display', serif;">Quick Order Tracking</h2>
            <p style="color: #666; margin-bottom: 25px;">Enter your Order ID below to track its status without logging in.</p>
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <input type="text" id="trackOrderId" placeholder="Order ID (e.g. ORD-12345)" style="flex: 1; padding: 12px; border: 2px solid #eee; border-radius: 8px; font-size: 16px;">
                <button onclick="trackOrderQuick()" style="background: var(--primary-color); color: white; border: none; padding: 0 25px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: 0.3s hover;">Track</button>
            </div>
            <button onclick="showLoginModal()" style="background: none; border: none; color: var(--primary-color); font-weight: 500; cursor: pointer; text-decoration: underline;">Login to view full history</button>
        </div>
    `;
    emptyState.style.display = 'none';
}

async function trackOrderQuick() {
    const orderId = document.getElementById('trackOrderId').value.trim();
    if (!orderId) return alert('Please enter an Order ID');

    try {
        const response = await API.Orders.getById(orderId);
        if (response.order) {
            window.location.href = `order-detail.html?id=${orderId}`;
        } else {
            alert('Order not found. Please check the ID and try again.');
        }
    } catch (e) {
        alert('Order not found or search failed.');
    }
}

// Load orders
async function loadOrders(userId) {
    const container = document.getElementById('ordersList');
    container.innerHTML = '<div class="loading-state"><i class="fas fa-spinner fa-spin"></i><p>Fetching your orders...</p></div>';

    try {
        // First check local storage for newly placed orders (if any)
        const localOrders = JSON.parse(localStorage.getItem('abc_books_orders') || '[]');

        // Fetch from API
        const response = await API.Orders.getByUser();
        const apiOrders = response.orders || [];

        // Merge and remove duplicates (prefer API data)
        const apiOrderIds = new Set(apiOrders.map(o => o.order_id));
        const mergedOrders = [
            ...apiOrders,
            ...localOrders.filter(lo => !apiOrderIds.has(lo.order_id || lo.orderId))
        ];

        allOrders = mergedOrders.map(o => ({
            orderId: o.order_id || o.orderId,
            orderDate: o.created_at || o.orderDate,
            total: o.total,
            status: o.status || 'confirmed',
            items: o.items || []
        }));

        // Sort by date (newest first)
        allOrders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

        renderOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
        // Fallback to local storage if API fails
        allOrders = JSON.parse(localStorage.getItem('abc_books_orders') || '[]');
        renderOrders();
    }
}

// Render orders
function renderOrders(orders = allOrders) {
    const container = document.getElementById('ordersList');
    const emptyState = document.getElementById('emptyState');

    // Apply filter
    let filteredOrders = orders;
    if (currentFilter !== 'all') {
        filteredOrders = orders.filter(order =>
            (order.status || 'confirmed').toLowerCase() === currentFilter
        );
    }

    if (filteredOrders.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    container.style.display = 'flex';
    emptyState.style.display = 'none';

    container.innerHTML = filteredOrders.map(order => createOrderHTML(order)).join('');
}

// Create order HTML
function createOrderHTML(order) {
    const date = new Date(order.orderDate).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const items = order.items || [];
    const itemCount = items.length;
    const status = (order.status || 'confirmed').toLowerCase();

    // Create item previews (max 4)
    let itemsPreview = '';
    const displayItems = items.slice(0, 4);
    displayItems.forEach(item => {
        itemsPreview += `
            <div class="item-preview">
                <img src="${item.image}" alt="${item.title}" 
                    onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22100%22 height=%22100%22/%3E%3C/svg%3E'">
            </div>
        `;
    });

    if (items.length > 4) {
        itemsPreview += `
            <div class="item-preview item-count">
                +${items.length - 4} more
            </div>
        `;
    }

    return `
        <div class="order-item">
            <div class="order-header">
                <div class="order-id-info">
                    <div class="order-icon">
                        <i class="fas fa-box"></i>
                    </div>
                    <div class="order-id">
                        <h3>Order #${order.orderId}</h3>
                        <p>${itemCount} item(s)</p>
                    </div>
                </div>
                <div class="order-status-price">
                    <div class="order-price">₹${order.total || 0}</div>
                    <span class="status-badge ${status}">
                        ${capitalizeFirst(status)}
                    </span>
                </div>
            </div>
            <div class="order-body">
                <div class="order-items-preview">
                    ${itemsPreview}
                </div>
                <div class="order-footer">
                    <span class="order-date">
                        <i class="fas fa-calendar-alt"></i> Ordered on ${date}
                    </span>
                    <button class="btn-view-order" onclick="viewOrder('${order.orderId}')">
                        View Details <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// View order details
function viewOrder(orderId) {
    window.location.href = `order-detail.html?id=${orderId}`;
}

// Initialize filters
function initializeFilters() {
    const filterTabs = document.querySelectorAll('.filter-tab');

    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active state
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Update filter
            currentFilter = tab.dataset.filter;
            renderOrders();
        });
    });
}

// Initialize search
function initializeSearch() {
    const searchInput = document.getElementById('orderSearch');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();

        if (!query) {
            renderOrders();
            return;
        }

        const filtered = allOrders.filter(order =>
            order.orderId.toLowerCase().includes(query)
        );

        renderOrders(filtered);
    });
}

// Helper: Capitalize first letter
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
