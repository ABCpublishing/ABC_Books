// Admin Panel JavaScript
// Now uses API service for all data operations

// Storage Keys
const STORAGE_KEYS = {
    ADMIN_AUTH: 'abc_admin_auth',
    // BOOKS_DATA: 'abc_books_data_v4', // No longer used
    ADMIN_LOGS: 'abc_admin_logs'
};

// Default Admin Credentials
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    checkAuth();
    initializeEventListeners();
    initializeCategoriesForBooks();

    // Set initial active state based on hash or default
    const hash = window.location.hash.slice(1) || 'overview';
    navigateToSection(hash);
});

// ===== AUTHENTICATION =====
function checkAuth() {
    const isAuthenticated = localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH);

    if (isAuthenticated === 'true') {
        showDashboard();
    } else {
        showLogin();
    }
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminDashboard').style.display = 'flex';
    updateAdminProfile();
    loadDashboardData();
}

function updateAdminProfile() {
    const token = API.Token.get();
    if (!token) return;

    try {
        const parts = token.split('.');
        if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const email = payload.email || 'Admin';
            const adminLabel = document.querySelector('.admin-user span');
            if (adminLabel) adminLabel.textContent = email;

            // Log for debug
            console.log('👤 Admin Session:', email);
        }
    } catch (e) {
        console.error('Error decoding token:', e);
    }
}

// ===== EVENT LISTENERS =====
function initializeEventListeners() {
    // Capitalize input for Title and Author
    const capitalizeInput = (e) => {
        let value = e.target.value;
        if (value.length > 0) {
            e.target.value = value.replace(/\w\S*/g, (txt) => {
                return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
            });
        }
    };

    const bookTitleInput = document.getElementById('bookTitle');
    const bookAuthorInput = document.getElementById('bookAuthor');

    if (bookTitleInput) {
        bookTitleInput.addEventListener('input', capitalizeInput);
    }
    if (bookAuthorInput) {
        bookAuthorInput.addEventListener('input', capitalizeInput);
    }

    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            navigateToSection(section);
            closeSidebarOnMobile();
        });
    });

    // Preview Site Button
    const previewBtn = document.getElementById('previewSiteBtn');
    if (previewBtn) {
        previewBtn.addEventListener('click', function () {
            window.open('/index.html', '_blank');
        });
    }

    // Book Form
    const bookForm = document.getElementById('bookForm');
    if (bookForm) {
        bookForm.addEventListener('submit', handleBookFormSubmit);
    }
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();

    let username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // Support legacy "admin" username (case-insensitive)
    if (username.toLowerCase() === 'admin') {
        username = 'admin@abcbooks.com';
    }

    // Try real API login
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: username, password })
        });

        const data = await response.json();

        if (response.ok && (data.token || data.accessToken)) {
            const token = data.token || data.accessToken;
            API.Token.set(token); // Store for API services
            localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'true'); // Show UI visibility
            localStorage.setItem('abc_admin_user', JSON.stringify(data.user)); // Store admin profile
            logActivity(`Admin logged in: ${username}`);
            showDashboard();
        } else {
            alert('Login failed: ' + (data.error || 'Invalid credentials'));
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Authentication system unavailable. Please check your internet connection or server status.');
    }
}

// Handle Logout
function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'false');
        // Clear all API tokens
        API.Token.remove();
        logActivity('Admin logged out');
        showLogin();
    }
}

// ===== NAVIGATION =====
function navigateToSection(section) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === section) {
            item.classList.add('active');
        }
    });

    // Update active content section
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    const sectionEl = document.getElementById(`${section}Section`);
    if (sectionEl) sectionEl.classList.add('active');

    // Update page title
    const titles = {
        overview: 'Dashboard Overview',
        books: 'All Books',
        users: 'Users Management',
        orders: 'Orders Management',
        pages: 'Pages Management',
        hero: 'Hero Section',
        editors: "Editor's Choice",
        featured: 'Featured Books',
        trending: 'Trending Now',
        bestseller: 'Bestsellers',
        english: 'English Books',
        arabic: 'Arabic Books',
        kashmiri: 'Kashmiri Books',
        settings: 'Settings'
    };
    const titleEl = document.getElementById('pageTitle');
    if (titleEl) titleEl.textContent = titles[section] || 'Dashboard';

    // Load section data
    loadSectionData(section);
}

// ===== LOAD DASHBOARD DATA =====
async function loadDashboardData() {
    try {
        // Fetch all books to get counts
        const allBooksResponse = await API.Books.getAll({ limit: 1000 });
        const allBooks = allBooksResponse.books || [];

        // We need to count sections manually since API doesn't return section counts
        // This is inefficient but works for now. 
        // Ideally backend should provide better stats endpoint.
        let heroCount = 0;
        let editorsCount = 0;
        let featuredCount = 0;

        // Fetch counts for specific sections (parallel)
        const [heroBooks, editorsBooks, featuredBooks, usersRes, ordersRes] = await Promise.all([
            API.Books.getBySection('hero').catch(() => ({ books: [] })),
            API.Books.getBySection('editors').catch(() => ({ books: [] })),
            API.Books.getBySection('featured').catch(() => ({ books: [] })),
            API.Users.getAll().catch(error => {
                if (error.message.includes('Access denied') || error.message.includes('Admin privileges')) throw error;
                return { users: [] };
            }),
            API.Orders.getAll().catch(error => {
                if (error.message.includes('Access denied') || error.message.includes('Admin privileges')) throw error;
                return { orders: [] };
            })
        ]);

        document.getElementById('totalBooksCount').textContent = allBooks.length;
        document.getElementById('heroCount').textContent = heroBooks.books?.length || 0;
        document.getElementById('editorsCount').textContent = editorsBooks.books?.length || 0;
        document.getElementById('featuredCount').textContent = featuredBooks.books?.length || 0;

        // Update users and orders if elements exist
        if (document.getElementById('usersCount')) {
            document.getElementById('usersCount').textContent = usersRes.users?.length || 0;
        }
        if (document.getElementById('ordersCount')) {
            document.getElementById('ordersCount').textContent = ordersRes.orders?.length || 0;
        }

        // Load activity log
        loadActivityLog();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        if (error.message.includes('Access denied') || error.message.includes('Admin privileges')) {
            alert('Your session is invalid or you lack admin privileges. Please log in again.');
            localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, 'false');
            API.Token.remove();
            showLogin();
        }
    }
}

async function loadSectionData(section) {
    // Show loaders or clear current view if needed
    console.log('Loading section:', section);

    switch (section) {
        case 'books':
            try {
                const response = await API.Books.getAll({ limit: 1000 });
                renderBooksTable(response.books || []);
            } catch (error) {
                console.error('Error loading books:', error);
                document.getElementById('booksTableBody').innerHTML = '<tr><td colspan="6" class="no-data">Error loading books</td></tr>';
            }
            break;
        case 'orders':
            renderOrdersTable();
            break;
        case 'users':
            renderUsersTable();
            break;
        case 'pages':
            renderPagesTable();
            break;
        case 'hero':
        case 'editors':
        case 'featured':
        case 'trending':
        case 'newReleases':
        case 'children':
        case 'bestseller':
        case 'indianAuthors':
            try {
                const response = await API.Books.getBySection(section);
                renderSectionBooks(section, response.books || []);
            } catch (error) {
                console.error(`Error loading ${section} books:`, error);
                document.getElementById(`${section}Books`).innerHTML = '<p class="no-data">Error loading books</p>';
            }
            break;
        case 'categories':
            if (typeof loadCategoriesTable === 'function') {
                loadCategoriesTable();
            } else {
                console.error('loadCategoriesTable not found. Make sure category-manager.js is loaded.');
            }
            break;
        case 'urdu':
        case 'english':
        case 'arabic':
        case 'kashmiri':
            try {
                // Capitalize first letter for category query (English, Arabic, Kashmiri)
                const category = section.charAt(0).toUpperCase() + section.slice(1);
                console.log(`Fetching books for category: ${category}`);
                const response = await API.Books.getAll({ category: category, limit: 100 });
                renderCategoryBooks(section, response.books || []);
            } catch (error) {
                console.error(`Error loading ${section} books:`, error);
                document.getElementById(`${section}Books`).innerHTML = '<p class="no-data">Error loading books</p>';
            }
            break;
    }
}

// ===== RENDER USERS TABLE =====
async function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" class="no-data"><i class="fas fa-spinner fa-spin"></i> Loading users...</td></tr>';
    document.getElementById('selectAllUsers').checked = false;
    updateBulkDeleteBtn();

    try {
        const response = await API.Users.getAll();
        const users = response.users || [];

        // Update counts
        const userCountStat = document.getElementById('usersCount');
        if (userCountStat) userCountStat.textContent = users.length;

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="no-data">No users found</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td><input type="checkbox" class="user-checkbox" value="${user.id}" onchange="updateBulkDeleteBtn()"></td>
                <td><strong>${user.id}</strong></td>
                <td>${user.name || 'User'}</td>
                <td>${user.email}</td>
                <td>
                    <span class="role-badge ${user.is_admin ? 'admin' : 'customer'}">
                        ${user.is_admin ? 'Admin' : 'Customer'}
                    </span>
                </td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <button class="btn-sm ${user.is_admin ? 'btn-outline' : 'btn-primary'}" 
                                onclick="updateUserRole(${user.id}, ${!user.is_admin})"
                                title="${user.is_admin ? 'Demote to Customer' : 'Promote to Admin'}">
                            <i class="fas ${user.is_admin ? 'fa-user-minus' : 'fa-user-shield'}"></i>
                            ${user.is_admin ? 'Demote' : 'Promote'}
                        </button>
                    </div>
                </td>
                <td>
                    <div class="action-icons">
                        <button class="icon-btn delete" onclick="deleteUser(${user.id})" title="Delete User">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        if (error.message.includes('Access denied')) {
            tbody.innerHTML = `<tr><td colspan="8" class="no-data" style="color: #e74c3c; padding: 30px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i><br>
                <strong>Admin Privileges Required</strong><br>
                Your current session does not have permission to view users.<br>
                <button onclick="handleLogout()" class="btn-primary" style="margin-top: 15px; padding: 8px 20px;">Log Out & Sign In Again</button>
            </td></tr>`;
        } else {
            tbody.innerHTML = `<tr><td colspan="8" class="no-data">Error loading users: ${error.message}</td></tr>`;
        }
    }
}

// User checkbox helpers
function toggleAllUsers(source) {
    const checkboxes = document.querySelectorAll('.user-checkbox');
    checkboxes.forEach(cb => cb.checked = source.checked);
    updateBulkDeleteBtn();
}

function updateBulkDeleteBtn() {
    const checkedBoxes = document.querySelectorAll('.user-checkbox:checked');
    const bulkBtn = document.getElementById('bulkDeleteUsersBtn');

    // Also update "Select All" checked state appropriately
    const selectAllCheckbox = document.getElementById('selectAllUsers');
    const totalCheckboxes = document.querySelectorAll('.user-checkbox');
    if (selectAllCheckbox && totalCheckboxes.length > 0) {
        selectAllCheckbox.checked = checkedBoxes.length === totalCheckboxes.length;
    }

    if (bulkBtn) {
        bulkBtn.style.display = checkedBoxes.length > 0 ? 'inline-block' : 'none';
        bulkBtn.innerHTML = `<i class="fas fa-trash-alt"></i> Delete Selected (${checkedBoxes.length})`;
    }
}

async function bulkDeleteUsers() {
    const checkedBoxes = document.querySelectorAll('.user-checkbox:checked');
    if (checkedBoxes.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${checkedBoxes.length} selected users? This action cannot be undone.`)) {
        return;
    }

    const ids = Array.from(checkedBoxes).map(cb => cb.value);
    const bulkBtn = document.getElementById('bulkDeleteUsersBtn');
    bulkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    bulkBtn.disabled = true;

    try {
        // Execute deletions in sequence to avoid overwhelming the server or DB connections
        for (const id of ids) {
            await API.Users.delete(id);
        }
        showNotification(`Successfully deleted ${checkedBoxes.length} users`, 'success');
        renderUsersTable(); // Re-render the table
        loadDashboardData(); // Refresh summary stats
    } catch (error) {
        console.error('Error during bulk deletion:', error);
        alert('Some users could not be deleted: ' + error.message);
        renderUsersTable(); // Re-render to reflect any partial success
    } finally {
        bulkBtn.disabled = false;
        bulkBtn.style.display = 'none';
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
        await API.Users.delete(userId);
        alert('User deleted successfully!');
        renderUsersTable();
        loadDashboardData();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function updateUserRole(userId, isAdmin) {
    const action = isAdmin ? 'promote this user to Admin' : 'demote this user to Customer';
    if (!confirm(`Are you sure you want to ${action}?`)) return;

    try {
        await API.Users.updateRole(userId, isAdmin);
        alert('User role updated successfully!');
        renderUsersTable();
        logActivity(`Updated user role for ID ${userId} to ${isAdmin ? 'Admin' : 'Customer'}`);
    } catch (error) {
        alert('Error updating role: ' + error.message);
    }
}

// ===== RENDER PAGES TABLE (Placeholder) =====
function renderPagesTable() {
    const tbody = document.getElementById('pagesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" class="no-data">Dynamic pages management coming in the next update!</td></tr>';
}

// ===== RENDER ORDERS TABLE (Existing Logic Preserved) =====
// ===== RENDER ORDERS TABLE =====
async function renderOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="no-data"><i class="fas fa-spinner fa-spin"></i> Loading orders...</td></tr>';

    try {
        const data = await API.Orders.getAll();
        const orders = data.orders || [];

        // Update counts
        const orderCountStat = document.getElementById('ordersCount');
        if (orderCountStat) orderCountStat.textContent = orders.length;

        if (!orders || orders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data">No orders yet</td></tr>';
            return;
        }

        orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        tbody.innerHTML = orders.map(order => {
            const date = new Date(order.created_at).toLocaleDateString('en-IN', {
                day: 'numeric', month: 'short', year: 'numeric'
            });
            const customerName = order.shipping_first_name && order.shipping_last_name
                ? `${order.shipping_first_name} ${order.shipping_last_name}`
                : (order.customer_name || 'Guest');
            const itemCount = order.items ? order.items.length : 0;
            const status = order.status || 'confirmed';

            return `
                <tr>
                    <td><strong>${order.order_id}</strong></td>
                    <td>
                        <div>${customerName}</div>
                        <small style="color: #888;">${order.shipping_email || order.customer_email || 'N/A'}</small>
                    </td>
                    <td>${itemCount} item(s)</td>
                    <td style="font-weight: 600; color: #27ae60;">₹${order.total || 0}</td>
                    <td>${date}</td>
                    <td>
                        <span class="status-badge status-${status.toLowerCase().replace(/ /g, '_')}">
                            ${status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                    </td>
                    <td>
                        <div class="action-icons">
                            <button class="icon-btn edit" onclick="viewOrderDetails('${order.id}')" title="View Details"><i class="fas fa-eye"></i></button>
                            <button class="icon-btn delete" onclick="deleteOrder('${order.id}')" title="Delete Order"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        if (error.message.includes('Access denied')) {
            tbody.innerHTML = `<tr><td colspan="7" class="no-data" style="color: #e74c3c; padding: 30px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i><br>
                <strong>Admin Privileges Required</strong><br>
                Your current session does not have permission to view orders.<br>
                <button onclick="handleLogout()" class="btn-primary" style="margin-top: 15px; padding: 8px 20px;">Log Out & Sign In Again</button>
            </td></tr>`;
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="no-data">Error loading orders: ${error.message}</td></tr>`;
        }
    }
}

async function deleteOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order?')) return;
    try {
        await API.Orders.delete(orderId);
        alert('Order deleted successfully!');
        renderOrdersTable();
        loadDashboardData();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

async function viewOrderDetails(orderId) {
    try {
        const response = await API.Orders.getById(orderId);
        const order = response.order;
        if (!order) { alert('Order not found'); return; }

        const modal = document.getElementById('orderModal');
        const body = document.getElementById('orderModalBody');

        // Populate Management Form (if exists)
        if (document.getElementById('mgmtOrderId')) {
            document.getElementById('mgmtOrderId').value = order.id;
            document.getElementById('mgmtStatus').value = order.status || 'confirmed';
            document.getElementById('mgmtCourier').value = order.courier_name || '';
            document.getElementById('mgmtTracking').value = order.tracking_id || '';
            document.getElementById('mgmtDeliveryDate').value = order.estimated_delivery_date ? order.estimated_delivery_date.split('T')[0] : '';
        }

        // Format Items HTML
        const itemsList = (order.items || []).map(item => `
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee;">
                <div>
                    <strong>${item.title || item.book_title}</strong><br>
                    <small style="color: #666;">By: ${item.author || item.book_author || 'N/A'}</small>
                </div>
                <div style="text-align: right;">
                    <span>Qty: ${item.quantity}</span><br>
                    <strong style="color: #27ae60;">₹${item.price * item.quantity}</strong>
                </div>
            </div>
        `).join('');

        // Format History HTML
        const historyHtml = (order.history || []).map(h => `
            <div class="history-step" style="position: relative; padding-left: 20px; border-left: 2px solid #667eea; margin-bottom: 15px;">
                <div style="position: absolute; left: -7px; top: 0; width: 12px; height: 12px; border-radius: 50%; background: #667eea; border: 2px solid white;"></div>
                <div style="font-weight: 600; font-size: 13px; text-transform: capitalize;">${h.status.replace(/_/g, ' ')}</div>
                <div style="font-size: 11px; color: #888;">${new Date(h.created_at).toLocaleString()}</div>
                <div style="font-size: 13px; color: #555; margin-top: 2px;">${h.notes || ''}</div>
            </div>
        `).join('');

        const modalDate = new Date(order.created_at).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });

        body.innerHTML = `
            <div style="margin-bottom: 20px;">
                <h3 style="margin: 0; color: #2c3e50; font-size: 24px;">ORDER #${order.order_id}</h3>
                <span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; background-color: #f1f5f9; color: #64748b; margin-top: 5px;">Status: ${order.status.toUpperCase()}</span>
                <p style="color: #7f8c8d; font-size: 14px; margin: 5px 0 0 0;"><i class="fas fa-calendar-alt"></i> ${modalDate}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #f8fbff; padding: 15px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #e2e8f0;">
                <div>
                    <h4 style="margin: 0 0 10px 0; color: #34495e; font-size: 16px;"><i class="fas fa-user"></i> Customer Info</h4>
                    <p style="margin: 0;"><strong>Name:</strong> ${order.shipping_first_name} ${order.shipping_last_name}</p>
                    <p style="margin: 5px 0 0 0;"><strong>Email:</strong> ${order.shipping_email}</p>
                    <p style="margin: 5px 0 0 0;"><strong>Phone:</strong> ${order.shipping_phone || 'N/A'}</p>
                </div>
                <div>
                    <h4 style="margin: 0 0 10px 0; color: #34495e; font-size: 16px;"><i class="fas fa-shipping-fast"></i> Shipping Details</h4>
                    <p style="margin: 0;">${order.shipping_address1}</p>
                    ${order.shipping_address2 ? `<p style="margin: 0;">${order.shipping_address2}</p>` : ''}
                    <p style="margin: 0;">${order.shipping_city}, ${order.shipping_state} - ${order.shipping_pincode}</p>
                </div>
            </div>

            <div style="margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; color: #34495e; font-size: 18px; border-bottom: 2px solid #eee; padding-bottom: 5px;">Order Items</h4>
                ${itemsList}
                <div style="text-align: right; margin-top: 15px; background: #fffaf0; padding: 15px; border-radius: 8px; border: 1px solid #fbd38d;">
                    <div style="display: flex; justify-content: flex-end; gap: 20px;">
                        <div style="text-align: left;">
                            <p style="margin: 0 0 5px 0;">Subtotal:</p>
                            <h3 style="margin: 5px 0 0 0; color: #2c3e50;">Total:</h3>
                        </div>
                        <div style="text-align: right;">
                            <p style="margin: 0 0 5px 0;">₹${order.subtotal || order.total}</p>
                            <h3 style="margin: 5px 0 0 0; color: #27ae60;">₹${order.total}</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div style="margin-top: 25px;">
                <h4 style="margin-bottom: 15px; color: #333; border-bottom: 2px solid #eee; padding-bottom: 5px;">Order Timeline</h4>
                <div class="timeline" style="margin-top: 10px;">
                    ${historyHtml || '<p style="color: #999;">No history records found</p>'}
                </div>
            </div>
        `;

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

async function updateOrderStatusFromAdmin() {
    const orderId = document.getElementById('mgmtOrderId')?.value;
    const status = document.getElementById('mgmtStatus')?.value;
    const courier_name = document.getElementById('mgmtCourier')?.value;
    const tracking_id = document.getElementById('mgmtTracking')?.value;
    const estimated_delivery_date = document.getElementById('mgmtDeliveryDate')?.value;
    const notes = document.getElementById('mgmtNotes')?.value;

    if (!orderId) return;

    try {
        const response = await fetch(`${API_BASE_URL}/orders/${orderId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API.Token.get()}`
            },
            body: JSON.stringify({
                status,
                courier_name,
                tracking_id,
                estimated_delivery_date,
                notes
            })
        });

        if (response.ok) {
            alert('Order updated successfully!');
            logActivity(`Updated order status: ${orderId} to ${status}`);
            viewOrderDetails(orderId);
            renderOrdersTable();
        } else {
            const result = await response.json();
            throw new Error(result.error || 'Update failed');
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Consolidated Users/Orders logic above. Deleting duplicates below.


// ===== RENDER BOOKS TABLE =====
async function renderBooksTable(books) {
    const tbody = document.getElementById('booksTableBody');

    if (!books || books.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">No books added yet</td></tr>';
        return;
    }

    // We need to fetch sections for each book to display badges? 
    // That would be N+1 requests. 
    // Alternatively, just display "Hero" etc if we fetched all books (the API doesn't return sections in getAll list).
    // For now, we might skip detailed section badges on the main list to save performance, 
    // OR we fetch all sections first and map them.

    // Let's try to fetch section maps
    let sectionMap = {};
    try {
        const [hero, editors, featured, trending, bestseller] = await Promise.all([
            API.Books.getBySection('hero').catch(() => ({ books: [] })),
            API.Books.getBySection('editors').catch(() => ({ books: [] })),
            API.Books.getBySection('featured').catch(() => ({ books: [] })),
            API.Books.getBySection('trending').catch(() => ({ books: [] })),
            API.Books.getBySection('bestseller').catch(() => ({ books: [] }))
        ]);

        books.forEach(b => {
            sectionMap[b.id] = [];
            if (hero.books?.find(hb => hb.id === b.id)) sectionMap[b.id].push('Hero');
            if (editors.books?.find(eb => eb.id === b.id)) sectionMap[b.id].push('Editors');
            if (featured.books?.find(fb => fb.id === b.id)) sectionMap[b.id].push('Featured');
            if (trending.books?.find(tb => tb.id === b.id)) sectionMap[b.id].push('Trending');
            if (bestseller.books?.find(bb => bb.id === b.id)) sectionMap[b.id].push('Bestseller');
        });
    } catch (e) { console.warn('Could not load section badges', e); }

    tbody.innerHTML = books.map(book => {
        const sectionBadges = (sectionMap[book.id] || []).map(s => `<span class="badge">${s}</span>`).join('');

        return `
            <tr>
                <td><code style="background:#f0f0f0;padding:2px 6px;border-radius:4px;font-size:12px;">${book.id}</code></td>
                <td><img src="${book.image}" alt="${book.title}" class="book-img" onerror="this.src='https://via.placeholder.com/50x70?text=No+Image'"></td>
                <td>${book.title}</td>
                <td>${book.author}</td>
                <td>₹${book.price}</td>
                <td><div class="section-badges">${sectionBadges || '<span style="color: #999;">None</span>'}</div></td>
                <td>
                    <div class="action-icons">
                        <button class="icon-btn edit" onclick="editBook('${book.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="icon-btn delete" onclick="deleteBook('${book.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}


// ===== RENDER SECTION BOOKS =====
function renderSectionBooks(section, books) {
    const container = document.getElementById(`${section}Books`);

    if (books.length === 0) {
        container.innerHTML = '<p class="no-data">No books in this section yet</p>';
        return;
    }

    container.innerHTML = books.map(book => `
        <div class="book-card">
            <img src="${book.image}" alt="${book.title}" onerror="this.src='https://via.placeholder.com/200x280?text=No+Image'">
            <div class="book-card-content">
                <h3 title="${book.title}">${book.title}</h3>
                <p>${book.author}</p>
                <p style="font-weight: 600; color: var(--primary-color);">₹${book.price}</p>
                <div class="book-card-actions">
                    <button class="btn-edit-book" onclick="editBook('${book.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-remove-book" onclick="removeFromSection('${book.id}', '${section}')">
                        <i class="fas fa-times"></i> Remove
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ===== RENDER CATEGORY BOOKS (New Function) =====
function renderCategoryBooks(section, books) {
    const container = document.getElementById(`${section}Books`);

    if (!books || books.length === 0) {
        container.innerHTML = '<p class="no-data">No books in this category yet</p>';
        return;
    }

    container.innerHTML = books.map(book => `
        <div class="book-card">
            <img src="${book.image}" alt="${book.title}" onerror="this.src='https://via.placeholder.com/200x280?text=No+Image'">
            <div class="book-card-content">
                <h3 title="${book.title}">${book.title}</h3>
                <p>${book.author}</p>
                <p style="font-weight: 600; color: var(--primary-color);">₹${book.price}</p>
                <div class="book-card-actions">
                    <button class="btn-edit-book" onclick="editBook('${book.id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn-remove-book" onclick="deleteBook('${book.id}')" style="background-color: #e74c3c;">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// ===== BOOK MODAL FUNCTIONS =====
function showAddBookModal() {
    const modal = document.getElementById('bookModal');
    document.getElementById('modalTitle').textContent = 'Add New Book';
    document.getElementById('bookForm').reset();
    document.getElementById('bookId').value = '';
    // Clear checkboxes
    document.querySelectorAll('input[name="sections"]').forEach(cb => cb.checked = false);
    modal.classList.add('active');
}

function showAddBookModalWithCategory(category) {
    showAddBookModal();
    const categorySelect = document.getElementById('bookCategory');
    if (categorySelect) {
        // Try to match the category
        for (let i = 0; i < categorySelect.options.length; i++) {
            if (categorySelect.options[i].value.toLowerCase() === category.toLowerCase()) {
                categorySelect.selectedIndex = i;
                break;
            }
        }
    }
}

function closeBookModal() {
    document.getElementById('bookModal').classList.remove('active');
}

async function editBook(bookId) {
    try {
        const response = await API.Books.getById(bookId);
        const book = response.book;

        if (!book) return;

        document.getElementById('modalTitle').textContent = 'Edit Book';
        document.getElementById('bookId').value = book.id;
        document.getElementById('bookTitle').value = book.title;
        document.getElementById('bookAuthor').value = book.author;
        document.getElementById('bookPublisher').value = book.publisher || 'ABC Publishing';
        document.getElementById('bookPrice').value = book.price;
        document.getElementById('bookOriginalPrice').value = book.original_price || '';
        document.getElementById('bookCategory').value = book.category || '';
        document.getElementById('bookImage').value = book.image;

        // Populate language and subcategory dropdowns
        const languageSelect = document.getElementById('bookLanguage');
        if (languageSelect) {
            const langValue = (book.language || book.category || '').toLowerCase();
            languageSelect.value = langValue;

            // Trigger subcategory load and wait for it
            await loadSubcategories();

            const subcategorySelect = document.getElementById('bookSubcategory');
            if (subcategorySelect) {
                subcategorySelect.value = book.subcategory || '';
            }
        }

        // Populate sections
        // Note: The API GET /:id response now includes 'sections' array thanks to our backend update
        const bookSections = book.sections || [];
        document.querySelectorAll('input[name="sections"]').forEach(checkbox => {
            checkbox.checked = bookSections.includes(checkbox.value);
        });

        document.getElementById('bookModal').classList.add('active');
    } catch (error) {
        console.error('Error fetching book details:', error);
        alert('Failed to load book parameters');
    }
}

async function handleBookFormSubmit(e) {
    e.preventDefault();

    const bookId = document.getElementById('bookId').value;
    const isEdit = !!bookId;

    const book = {
        title: document.getElementById('bookTitle').value,
        author: document.getElementById('bookAuthor').value,
        publisher: document.getElementById('bookPublisher')?.value || 'ABC Publishing',
        price: parseInt(document.getElementById('bookPrice').value),
        original_price: parseInt(document.getElementById('bookOriginalPrice').value) || null,
        image: document.getElementById('bookImage').value,
        language: document.getElementById('bookLanguage')?.value || 'urdu',
        subcategory: document.getElementById('bookSubcategory')?.value || '',
        category: document.getElementById('bookLanguage')?.value || document.getElementById('bookCategory')?.value || 'general',
        rating: 4.5, // Default rating
        sections: Array.from(document.querySelectorAll('input[name="sections"]:checked')).map(cb => cb.value)
    };

    try {
        if (isEdit) {
            await API.Books.update(bookId, book);
            logActivity(`Updated book: ${book.title}`);
            alert('Book updated successfully!');
        } else {
            await API.Books.create(book);
            logActivity(`Added new book: ${book.title}`);
            alert('Book added successfully!');
        }

        closeBookModal();
        loadDashboardData();

        // Reload current section if applicable
        const activeSection = document.querySelector('.nav-item.active')?.getAttribute('data-section');
        if (activeSection) loadSectionData(activeSection);

    } catch (error) {
        console.error('Error saving book:', error);
        alert('Error saving book: ' + error.message);
    }
}

async function deleteBook(bookId) {
    if (!confirm('Are you sure you want to delete this book? This action cannot be undone.')) {
        return;
    }

    try {
        await API.Books.delete(bookId);
        logActivity(`Deleted book ID: ${bookId}`);
        alert('Book deleted successfully!');

        loadDashboardData();
        const activeSection = document.querySelector('.nav-item.active')?.getAttribute('data-section');
        if (activeSection) loadSectionData(activeSection);
    } catch (error) {
        console.error('Error deleting book:', error);
        alert('Error deleting book: ' + error.message);
    }
}

async function removeFromSection(bookId, sectionToRemove) {
    if (!confirm('Remove this book from this section?')) return;

    try {
        // 1. Get current book details (including sections)
        const response = await API.Books.getById(bookId);
        const book = response.book;
        if (!book) throw new Error('Book not found');

        // 2. Filter out the specific section
        const currentSections = book.sections || [];
        const newSections = currentSections.filter(s => s !== sectionToRemove);

        // 3. Update the book with the new sections list
        await API.Books.update(bookId, {
            ...book,
            sections: newSections
        });

        logActivity(`Removed book from ${sectionToRemove}`);

        // Reload
        loadSectionData(sectionToRemove);
        loadDashboardData(); // Update counts
    } catch (error) {
        console.error('Error removing from section:', error);
        alert('Failed to remove from section: ' + error.message);
    }
}

async function showAddToSectionModal(section) {
    // This is a bit complex. We need to show books NOT in this section.
    // Ideally we have a modal with a search/dropdown.
    // For simplicity, we'll prompt for an ID like before, or better, show a simple prompt.
    // In a real app, a proper selector modal is needed.

    // Let's implement a simple "Enter Book ID" prompt for now, 
    // or if we want to be fancy, we could reuse the book modal but that complicates things.
    // The previous implementation used a prompt or search.

    const bookTitleOrId = prompt('Enter Book ID or exact Title to add to ' + section + ':');
    if (!bookTitleOrId) return;

    try {
        // Find the book first.
        // We can search by ID first.
        let bookToAdd = null;
        try {
            const res = await API.Books.getById(bookTitleOrId);
            if (res.book) bookToAdd = res.book;
        } catch (e) {
            // Not a valid ID, try finding by title? 
            // We don't have search by exact title easily exposed in API.Books without search parameter
            // Let's assume user enters ID for now for reliability.
        }

        // Fallback: search API
        if (!bookToAdd) {
            const searchRes = await API.Books.getAll({ search: bookTitleOrId, limit: 1 });
            if (searchRes.books && searchRes.books.length > 0) {
                bookToAdd = searchRes.books[0];
            }
        }

        if (!bookToAdd) {
            alert('Book not found!');
            return;
        }

        // Add section
        const currentSections = bookToAdd.sections || [];
        if (!currentSections.includes(section)) {
            const newSections = [...currentSections, section];
            await API.Books.update(bookToAdd.id, {
                ...bookToAdd,
                sections: newSections
            });
            alert('Added to ' + section);
            loadSectionData(section);
            loadDashboardData();
        } else {
            alert('Book is already in this section');
        }

    } catch (error) {
        alert('Error: ' + error.message);
    }
}


// ===== ACTIVITY LOG (LocalStorage for now) =====
function logActivity(message) {
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.ADMIN_LOGS) || '[]');
    logs.unshift({
        message,
        timestamp: new Date().toISOString()
    });
    if (logs.length > 20) logs.pop();
    localStorage.setItem(STORAGE_KEYS.ADMIN_LOGS, JSON.stringify(logs));
}

function loadActivityLog() {
    const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.ADMIN_LOGS) || '[]');
    const container = document.getElementById('activityLog');

    if (logs.length === 0) {
        container.innerHTML = '<p class="no-activity">No recent activity</p>';
        return;
    }

    container.innerHTML = logs.slice(0, 10).map(log => {
        const date = new Date(log.timestamp);
        return `
            <div class="activity-item">
                <strong>${log.message}</strong>
                <div style="font-size: 12px; color: #999; margin-top: 4px;">
                    ${date.toLocaleDateString()} ${date.toLocaleTimeString()}
                </div>
            </div>
        `;
    }).join('');
}

function exportData() {
    alert('Export now only supports local logs, as books are in cloud database.');
    // Logic for exporting logs/local data if needed
}

function importData() {
    alert('Import not supported for cloud database via this tool.');
}

function clearAllData() {
    alert('Clear All Data is disabled for cloud database protection.');
}

function resetToDefault() {
    alert('Reset to default is disabled for cloud database protection.');
}

function showChangePasswordModal() {
    alert('Feature coming soon');
}

// ===== RESPONSIVE SIDEBAR =====
function toggleAdminSidebar() {
    const sidebar = document.querySelector('.admin-sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

function closeSidebarOnMobile() {
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.admin-sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }
}

// Helper to update the date on dashboard
function updateDate() {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }
}

// ===== DYNAMIC CATEGORIES SYSTEM =====
// Different subcategories for each language (Fallback for when DB is empty)
const SUBCATEGORIES_BY_LANGUAGE = {
    'urdu': [
        { value: 'Quran & Tafsir', label: '📖 Quran & Tafsir' },
        { value: 'Hadith', label: '📜 Hadith' },
        { value: 'Biography', label: '👤 Biography' },
        { value: 'Creed & Fiqh', label: '⚖️ Creed & Fiqh' },
        { value: 'Literature & Fiction', label: '📕 Literature & Fiction' }
    ],
    'english': [
        { value: 'Quran & Tafsir', label: '📖 Quran & Tafsir' },
        { value: 'Hadith', label: '📜 Hadith' },
        { value: 'Academic', label: '🎓 Academic' },
        { value: 'Literature & Fiction', label: '📕 Literature & Fiction' }
    ],
    'arabic': [
        { value: 'Quran & Tafsir', label: '📖 Quran & Tafsir' },
        { value: 'Hadith', label: '📜 Hadith' },
        { value: 'Arabic Grammar', label: '📝 Arabic Grammar' }
    ],
    'kashmiri': [
        { value: 'Kashmiri Poetry', label: '🎭 Kashmiri Poetry' },
        { value: 'Kashmiri Literature', label: '📕 Kashmiri Literature' }
    ]
};

// Load languages for the book form
async function initializeCategoriesForBooks() {
    const languageSelect = document.getElementById('bookLanguage');
    if (!languageSelect) return;

    try {
        const response = await API.Categories.getLanguages();
        const languages = response.languages || [];

        // Save some default options if API fails or returns empty
        const displayLanguages = languages.length > 0 ? languages : [
            { name: 'Urdu', slug: 'urdu' },
            { name: 'English', slug: 'english' },
            { name: 'Arabic', slug: 'arabic' },
            { name: 'Kashmiri', slug: 'kashmiri' }
        ];

        languageSelect.innerHTML = '<option value="">-- Select Category --</option>';
        displayLanguages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.slug || lang.name;
            option.textContent = lang.name;
            languageSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading languages for book form:', error);
    }
}

// Load subcategories based on selected language
async function loadSubcategories() {
    const languageSelect = document.getElementById('bookLanguage');
    const subcategorySelect = document.getElementById('bookSubcategory');
    if (!languageSelect || !subcategorySelect) return;

    const language = languageSelect.value;

    // Clear existing options
    subcategorySelect.innerHTML = '';

    if (!language) {
        subcategorySelect.innerHTML = '<option value="">-- Select Category First --</option>';
        return;
    }

    // Add loading indicator
    subcategorySelect.innerHTML = '<option value="">Loading...</option>';

    try {
        // Fetch subcategories for the selected language
        // We use the language name as slug for now as per current DB setup
        const response = await API.Categories.getSubcategories(language);
        const subcategories = response.subcategories || [];

        subcategorySelect.innerHTML = '<option value="">-- Select Subcategory --</option>';

        if (subcategories.length === 0) {
            // Fallback to legacy categories if none found in DB for this language
            loadFallbackSubcategories(language, subcategorySelect);
        } else {
            subcategories.forEach(sub => {
                const option = document.createElement('option');
                option.value = sub.name;
                option.textContent = sub.name;
                subcategorySelect.appendChild(option);
            });
        }
    } catch (error) {
        console.warn('DB categories not found, using fallback. Error:', error.message);
        subcategorySelect.innerHTML = '<option value="">-- Select Subcategory --</option>';
        loadFallbackSubcategories(language, subcategorySelect);
    }

    // Update the hidden category field for backward compatibility
    document.getElementById('bookCategory').value = language;
}

// Helper for fallback loading
function loadFallbackSubcategories(language, selectElement) {
    const legacySub = SUBCATEGORIES_BY_LANGUAGE[language] || [
        { value: 'General', label: 'General' }
    ];
    legacySub.forEach(sub => {
        const option = document.createElement('option');
        option.value = sub.value;
        option.textContent = sub.label;
        selectElement.appendChild(option);
    });
}

// Updated function to populate form when editing
async function populateBookFormForEdit(book) {
    document.getElementById('bookTitle').value = book.title || '';
    document.getElementById('bookAuthor').value = book.author || '';
    document.getElementById('bookPrice').value = book.price || '';
    document.getElementById('bookOriginalPrice').value = book.original_price || '';

    // Set language
    const languageSelect = document.getElementById('bookLanguage');
    if (languageSelect) {
        languageSelect.value = book.language || 'Urdu';
        loadSubcategories(); // Populate subcategories

        // Set subcategory after loading options
        setTimeout(() => {
            const subcategorySelect = document.getElementById('bookSubcategory');
            if (subcategorySelect && book.subcategory) {
                subcategorySelect.value = book.subcategory;
            }
        }, 100);
    }

    // Set image
    if (book.image) {
        document.getElementById('bookImage').value = book.image;
        // Show preview
        const previewContainer = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');
        if (previewContainer && previewImg) {
            previewImg.src = book.image;
            previewContainer.style.display = 'block';
        }
    }

    // Set sections checkboxes
    const bookSections = book.sections || [];
    document.querySelectorAll('input[name="sections"]').forEach(checkbox => {
        checkbox.checked = bookSections.includes(checkbox.value);
    });
}
// Cleanup secondary duplicate definitions that were at the end of the file
// Note: All relevant logic from the bottom has been merged into the main sections above.
