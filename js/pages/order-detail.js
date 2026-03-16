// ===== Order Detail Page JavaScript =====

let currentOrder = null;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    loadOrderDetails();
});

// Load order details
async function loadOrderDetails() {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('id');

    if (!orderId) {
        window.location.href = '/pages/my-orders.html';
        return;
    }

    try {
        // Fetch order from API
        const response = await API.Orders.getById(orderId);

        if (response.order) {
            const apiOrder = response.order;
            currentOrder = {
                orderId: apiOrder.order_id,
                orderDate: apiOrder.created_at,
                status: apiOrder.status,
                total: apiOrder.total,
                subtotal: apiOrder.subtotal,
                discount: apiOrder.discount,
                paymentMethod: apiOrder.payment_method,
                items: apiOrder.items || [],
                history: apiOrder.history || [],
                trackingId: apiOrder.tracking_id,
                courierName: apiOrder.courier_name,
                estimatedDelivery: apiOrder.estimated_delivery_date,
                shipping: {
                    firstName: apiOrder.shipping_first_name,
                    lastName: apiOrder.shipping_last_name,
                    email: apiOrder.shipping_email,
                    phone: apiOrder.shipping_phone,
                    address1: apiOrder.shipping_address1,
                    city: apiOrder.shipping_city,
                    state: apiOrder.shipping_state,
                    pincode: apiOrder.shipping_pincode
                }
            };
        } else {
            // Fallback: Check local storage for newly placed orders not yet synced
            const orders = JSON.parse(localStorage.getItem('abc_books_orders') || '[]');
            currentOrder = orders.find(o => o.orderId === orderId);
        }

        if (!currentOrder) {
            alert('Order not found!');
            window.location.href = '/pages/my-orders.html';
            return;
        }

        updateOrderDetailUI(orderId);
    } catch (error) {
        console.error('Error fetching order details:', error);
        // Fallback to local storage
        const orders = JSON.parse(localStorage.getItem('abc_books_orders') || '[]');
        currentOrder = orders.find(o => o.orderId === orderId);

        if (!currentOrder) {
            alert('Order not found!');
            window.location.href = '/pages/my-orders.html';
            return;
        }

        updateOrderDetailUI(orderId);
    }
}

function updateOrderDetailUI(orderId) {
    // Update page
    document.title = `Order #${orderId} | ABC Books`;

    // Safety check for UI elements
    const breadcrumbEl = document.getElementById('breadcrumbOrderId');
    const titleEl = document.getElementById('orderIdTitle');
    if (breadcrumbEl) breadcrumbEl.textContent = `#${orderId}`;
    if (titleEl) titleEl.textContent = `#${orderId}`;

    // Update status badge
    const status = (currentOrder.status || 'confirmed').toLowerCase();
    const statusBadge = document.getElementById('orderStatusBadge');
    if (statusBadge) {
        statusBadge.textContent = capitalizeFirst(status);
        statusBadge.className = `status-badge ${status}`;
    }

    // Show cancel button if order can be cancelled
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        if (status === 'confirmed' || status === 'processing') {
            cancelBtn.style.display = 'flex';
        } else {
            cancelBtn.style.display = 'none';
        }
    }

    // Load sections
    loadTimeline();
    loadOrderItems();
    loadShippingAddress();
    loadPaymentInfo();
    loadOrderSummary();
}

// Load order timeline
function loadTimeline() {
    const container = document.getElementById('orderTimeline');

    // Show tracking info if available
    let trackingInfoHtml = '';
    if (currentOrder.trackingId) {
        trackingInfoHtml = `
            <div class="tracking-info-box" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid var(--primary-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="font-weight: 600; color: #555;"><i class="fas fa-truck"></i> Shipment Tracking</span>
                    <span class="status-badge shipped" style="font-size: 11px;">Active</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <div>
                        <p style="font-size: 12px; color: #888; margin: 0;">Courier</p>
                        <p style="font-weight: 600; margin: 0;">${currentOrder.courierName || 'Standard Shipping'}</p>
                    </div>
                    <div>
                        <p style="font-size: 12px; color: #888; margin: 0;">Tracking ID</p>
                        <p style="font-weight: 600; margin: 0; color: var(--primary-color);">${currentOrder.trackingId}</p>
                    </div>
                </div>
                ${currentOrder.estimatedDelivery ? `
                <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;">
                    <p style="font-size: 12px; color: #888; margin: 0;">Estimated Delivery</p>
                    <p style="font-weight: 600; margin: 0; color: #27ae60;">${new Date(currentOrder.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                ` : ''}
            </div>
        `;
    }

    const status = (currentOrder.status || 'confirmed').toLowerCase();
    const history = currentOrder.history || [];

    // Base steps for timeline
    const steps = [
        { id: 'confirmed', title: 'Order Confirmed', desc: 'Your order has been placed' },
        { id: 'processing', title: 'Processing', desc: 'Preparing your order' },
        { id: 'shipped', title: 'Shipped', desc: 'On the way to you' },
        { id: 'delivered', title: 'Delivered', desc: 'Order completed' }
    ];

    const statusOrder = ['confirmed', 'processing', 'shipped', 'delivered'];
    const currentIndex = statusOrder.indexOf(status);

    let cancelled = status === 'cancelled';

    // If we have real history, use it
    if (history.length > 0) {
        container.innerHTML = trackingInfoHtml + history.map((event, index) => {
            const isLatest = index === history.length - 1;
            const date = new Date(event.created_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            return `
                <div class="timeline-step completed ${isLatest ? 'current' : ''}">
                    <div class="timeline-dot">
                        <i class="fas ${event.status === 'cancelled' ? 'fa-times' : 'fa-check'}"></i>
                    </div>
                    <div class="timeline-content">
                        <h4>${capitalizeFirst(event.status)}</h4>
                        <p>${event.notes || ''}</p>
                        <span class="timeline-date">${date}</span>
                    </div>
                </div>
            `;
        }).join('');

        // If not delivered or cancelled, show what's next (optional)
        return;
    }

    // Fallback to hardcoded steps for orders without history
    container.innerHTML = trackingInfoHtml + steps.map((step, index) => {
        let stepClass = '';
        if (cancelled) {
            stepClass = index === 0 ? 'completed' : '';
        } else if (index < currentIndex) {
            stepClass = 'completed';
        } else if (index === currentIndex) {
            stepClass = 'current completed';
        }

        const date = index <= currentIndex ? getStepDate(index) : '';

        return `
            <div class="timeline-step ${stepClass}">
                <div class="timeline-dot">
                    <i class="fas fa-check"></i>
                </div>
                <div class="timeline-content">
                    <h4>${step.title}</h4>
                    <p>${date ? date : step.desc}</p>
                </div>
            </div>
        `;
    }).join('');

    // Add cancelled step if order is cancelled
    if (cancelled) {
        container.innerHTML += `
            <div class="timeline-step current">
                <div class="timeline-dot" style="background: #e74c3c;">
                    <i class="fas fa-times" style="display: block;"></i>
                </div>
                <div class="timeline-content">
                    <h4>Order Cancelled</h4>
                    <p>This order has been cancelled</p>
                </div>
            </div>
        `;
    }
}

// Get step date (mock for demo)
function getStepDate(stepIndex) {
    const orderDate = new Date(currentOrder.orderDate);
    const dates = [
        orderDate,
        new Date(orderDate.getTime() + 1 * 24 * 60 * 60 * 1000),
        new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000),
        new Date(orderDate.getTime() + 5 * 24 * 60 * 60 * 1000)
    ];

    return dates[stepIndex].toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Load order items
function loadOrderItems() {
    const container = document.getElementById('orderItems');
    const items = currentOrder.items || [];

    if (items.length === 0) {
        container.innerHTML = '<p style="color: #888;">No items found</p>';
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="order-item-row">
            <img src="${item.image}" alt="${item.title}"
                onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22150%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22100%22 height=%22150%22/%3E%3C/svg%3E'">
            <div class="order-item-info">
                <h4>${item.title}</h4>
                <p class="author">${item.author || 'Unknown Author'}</p>
                <div class="qty-price">
                    <span class="qty">Qty: ${item.quantity || 1}</span>
                    <span class="price">₹${item.price * (item.quantity || 1)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Load shipping address
function loadShippingAddress() {
    const container = document.getElementById('shippingAddress');
    const shipping = currentOrder.shipping || {};

    container.innerHTML = `
        <p class="name">${shipping.firstName || ''} ${shipping.lastName || ''}</p>
        <p>
            ${shipping.address1 || ''}<br>
            ${shipping.address2 ? shipping.address2 + '<br>' : ''}
            ${shipping.city || ''}, ${shipping.state || ''} - ${shipping.pincode || ''}<br>
            ${shipping.country || 'India'}
        </p>
        <p style="margin-top: 10px;">
            <strong>Phone:</strong> ${shipping.phone || 'N/A'}<br>
            <strong>Email:</strong> ${shipping.email || 'N/A'}
        </p>
    `;
}

// Load payment info
function loadPaymentInfo() {
    const container = document.getElementById('paymentInfo');
    const paymentMethod = currentOrder.paymentMethod || 'cod';

    const paymentIcons = {
        cod: 'fas fa-money-bill-wave',
        upi: 'fas fa-mobile-alt',
        card: 'fas fa-credit-card',
        netbanking: 'fas fa-university'
    };

    const paymentNames = {
        cod: 'Cash on Delivery',
        upi: 'UPI Payment',
        card: 'Credit/Debit Card',
        netbanking: 'Net Banking'
    };

    container.innerHTML = `
        <div class="payment-icon">
            <i class="${paymentIcons[paymentMethod] || 'fas fa-wallet'}"></i>
        </div>
        <div class="payment-details">
            <h4>${paymentNames[paymentMethod] || 'Online Payment'}</h4>
            <p>Payment ${currentOrder.status === 'cancelled' ? 'Refunded' : 'Completed'}</p>
        </div>
    `;
}

// Load order summary
function loadOrderSummary() {
    const subtotal = currentOrder.subtotal || currentOrder.total || 0;
    const discount = currentOrder.discount || 0;
    const total = currentOrder.total || 0;

    document.getElementById('summarySubtotal').textContent = `₹${subtotal}`;
    document.getElementById('summaryTotal').textContent = `₹${total}`;

    if (discount > 0) {
        document.getElementById('discountRow').style.display = 'flex';
        document.getElementById('summaryDiscount').textContent = `-₹${discount}`;
    }

    // Shipping
    const shipping = subtotal >= 499 ? 'FREE' : '₹49';
    document.getElementById('summaryShipping').textContent = shipping;
}

// Cancel order
function cancelOrder() {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    // Update order status
    let orders = JSON.parse(localStorage.getItem('abc_books_orders') || '[]');
    const orderIndex = orders.findIndex(o => o.orderId === currentOrder.orderId);

    if (orderIndex >= 0) {
        orders[orderIndex].status = 'cancelled';
        localStorage.setItem('abc_books_orders', JSON.stringify(orders));
    }

    // Reload page
    location.reload();
}

// Print order
function printOrder() {
    window.print();
}

// Download invoice
function downloadInvoice() {
    // In a real app, this would generate a PDF
    alert('Invoice download feature will be available soon!');
}

// Helper: Capitalize first letter
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
