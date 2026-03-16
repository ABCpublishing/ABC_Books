// ===== Payment Routes (Razorpay Integration) =====
const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay only when keys are present (allows app to start without payment config)
const hasRazorpayKeys = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET;
const razorpay = hasRazorpayKeys
    ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET })
    : null;

// Create Razorpay Order
// POST /api/payment/create-order
router.post('/create-order', async (req, res) => {
    if (!razorpay) {
        return res.status(503).json({ success: false, error: 'Payment gateway not configured' });
    }
    try {
        const { amount, currency = 'INR', receipt, notes } = req.body;

        console.log('========================================');
        console.log('💳 RAZORPAY ORDER REQUEST');
        console.log('========================================');
        console.log('Amount:', amount);
        console.log('Currency:', currency);
        console.log('Receipt:', receipt);
        console.log('========================================');

        // Validate amount
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount'
            });
        }

        // Create order options
        const options = {
            amount: Math.round(amount * 100), // Razorpay expects amount in paise
            currency: currency,
            receipt: receipt || `order_${Date.now()}`,
            notes: notes || {}
        };

        // Create order with Razorpay
        const order = await razorpay.orders.create(options);

        console.log('✅ Razorpay order created:', order.id);

        res.json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
                receipt: order.receipt
            },
            key_id: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error('❌ Razorpay order creation failed:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create payment order',
            details: error.message
        });
    }
});

// Verify Payment Signature
// POST /api/payment/verify
router.post('/verify', async (req, res) => {
    if (!hasRazorpayKeys) {
        return res.status(503).json({ success: false, error: 'Payment gateway not configured' });
    }
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            order_data
        } = req.body;

        console.log('========================================');
        console.log('🔐 PAYMENT VERIFICATION REQUEST');
        console.log('========================================');
        console.log('Order ID:', razorpay_order_id);
        console.log('Payment ID:', razorpay_payment_id);
        console.log('========================================');

        // Validate required fields
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                error: 'Missing payment verification data'
            });
        }

        // Generate signature for verification
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        // Verify signature
        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            console.log('✅ Payment verified successfully!');

            res.json({
                success: true,
                message: 'Payment verified successfully',
                payment_id: razorpay_payment_id,
                order_id: razorpay_order_id
            });
        } else {
            console.log('❌ Payment verification failed - signature mismatch');
            res.status(400).json({
                success: false,
                error: 'Payment verification failed'
            });
        }

    } catch (error) {
        console.error('❌ Payment verification error:', error);
        res.status(500).json({
            success: false,
            error: 'Payment verification error',
            details: error.message
        });
    }
});

// Get Payment Details
// GET /api/payment/:paymentId
router.get('/:paymentId', async (req, res) => {
    if (!razorpay) {
        return res.status(503).json({ success: false, error: 'Payment gateway not configured' });
    }
    try {
        const { paymentId } = req.params;

        const payment = await razorpay.payments.fetch(paymentId);

        res.json({
            success: true,
            payment: {
                id: payment.id,
                amount: payment.amount / 100, // Convert from paise to rupees
                currency: payment.currency,
                status: payment.status,
                method: payment.method,
                email: payment.email,
                contact: payment.contact,
                created_at: payment.created_at
            }
        });

    } catch (error) {
        console.error('❌ Failed to fetch payment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch payment details'
        });
    }
});

// Refund Payment (for admin use)
// POST /api/payment/refund
router.post('/refund', async (req, res) => {
    if (!razorpay) {
        return res.status(503).json({ success: false, error: 'Payment gateway not configured' });
    }
    try {
        const { payment_id, amount, notes } = req.body;

        console.log('💸 Processing refund for payment:', payment_id);

        const refund = await razorpay.payments.refund(payment_id, {
            amount: amount ? Math.round(amount * 100) : undefined, // Full refund if amount not specified
            notes: notes || {}
        });

        console.log('✅ Refund processed:', refund.id);

        res.json({
            success: true,
            refund: {
                id: refund.id,
                amount: refund.amount / 100,
                status: refund.status,
                payment_id: refund.payment_id
            }
        });

    } catch (error) {
        console.error('❌ Refund failed:', error);
        res.status(500).json({
            success: false,
            error: 'Refund failed',
            details: error.message
        });
    }
});

module.exports = router;
