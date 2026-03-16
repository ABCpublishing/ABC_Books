// ===== Email Service (Mailgun Integration) =====
const formData = require('form-data');
const Mailgun = require('mailgun.js');

const mailgun = new Mailgun(formData);
const mg = process.env.MAILGUN_API_KEY 
    ? mailgun.client({ username: 'api', key: process.env.MAILGUN_API_KEY })
    : null;

const MG_DOMAIN = process.env.MAILGUN_DOMAIN || 'mg.abcbooks.store';
const FROM_EMAIL = `ABC Books <support@${MG_DOMAIN}>`;

if (!process.env.MAILGUN_API_KEY) {
    console.warn('⚠️ MAILGUN_API_KEY is missing in .env');
}
if (!process.env.MAILGUN_DOMAIN) {
    console.warn('⚠️ MAILGUN_DOMAIN is missing in .env');
}

module.exports = {
    sendVerificationEmail: async (toEmail, verificationLink) => {
        if (!mg) {
            console.log('📧 Mailgun not configured. Verification link:', verificationLink);
            return false;
        }

        try {
            console.log(`📧 Attempting to send verification email to ${toEmail}...`);
            const data = await mg.messages.create(MG_DOMAIN, {
                from: FROM_EMAIL,
                to: [toEmail],
                subject: 'Verify Your Email - ABC Books',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
                        <h2 style="color: #8B0000;">Welcome to ABC Books!</h2>
                        <p>Please click the link below to verify your email address and activate your account.</p>
                        <a href="${verificationLink}" style="display:inline-block;padding:12px 25px;background:#8B0000;color:white;text-decoration:none;border-radius:5px;font-weight:bold;">Verify Email</a>
                        <p style="margin-top: 20px;">If you didn't create an account, you can safely ignore this email.</p>
                        <p>Best regards,<br>The ABC Books Team</p>
                    </div>
                `
            });
            console.log('✅ Verification email sent. ID:', data.id);
            return true;
        } catch (error) {
            console.error('❌ Mailgun Error (Verification):');
            console.error('Status:', error.details || error.status);
            console.error('Message:', error.message);
            return false;
        }
    },

    sendPasswordResetEmail: async (toEmail, resetLink) => {
        if (!mg) {
            console.log('📧 Mailgun not configured. Reset link:', resetLink);
            return false;
        }

        try {
            console.log(`📧 Attempting to send password reset email to ${toEmail}...`);
            const data = await mg.messages.create(MG_DOMAIN, {
                from: FROM_EMAIL,
                to: [toEmail],
                subject: 'Reset Your Password - ABC Books',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
                        <h2 style="color: #8B0000;">Password Reset Request</h2>
                        <p>We received a request to reset your password for ABC Books.</p>
                        <p>Click the link below to reset it. This link expires in 1 hour.</p>
                        <a href="${resetLink}" style="display:inline-block;padding:12px 25px;background:#8B0000;color:white;text-decoration:none;border-radius:5px;font-weight:bold;">Reset Password</a>
                        <p style="margin-top: 20px;">If you didn't request this, you can safely ignore this email.</p>
                        <p>Best regards,<br>The ABC Books Team</p>
                    </div>
                `
            });
            console.log('✅ Password reset email sent. ID:', data.id);
            return true;
        } catch (error) {
            console.error('❌ Mailgun Error (Password Reset):');
            console.error('Status:', error.details || error.status);
            console.error('Message:', error.message);
            return false;
        }
    },

    sendOrderConfirmation: async (toEmail, orderData) => {
        if (!mg) {
            console.log('📧 Mailgun not configured. Order confirmation not sent for:', orderData.order_id);
            return false;
        }

        // Handle nested data if passed that way, or flat data
        const firstName = orderData.shipping_first_name || (orderData.shipping && orderData.shipping.first_name) || 'Customer';
        const total = orderData.total || 0;
        const paymentMethod = (orderData.payment_method || 'COD').toUpperCase();

        try {
            console.log(`📧 Attempting to send order confirmation to ${toEmail} for domain ${MG_DOMAIN}...`);
            const data = await mg.messages.create(MG_DOMAIN, {
                from: FROM_EMAIL,
                to: [toEmail],
                subject: `Order Confirmation #${orderData.order_id} - ABC Books`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee;">
                        <h2 style="color: #8B0000;">Thank you for your order!</h2>
                        <p>Hi ${firstName},</p>
                        <p>Your order <strong>#${orderData.order_id}</strong> has been received and is being processed.</p>
                        <hr style="border: none; border-top: 1px solid #eee;">
                        <p><strong>Total Amount:</strong> ₹${total}</p>
                        <p><strong>Payment Method:</strong> ${paymentMethod}</p>
                        <hr style="border: none; border-top: 1px solid #eee;">
                        <p>We'll notify you when your order is shipped.</p>
                        <p>Best regards,<br><strong>The ABC Books Team</strong></p>
                        <p style="font-size: 11px; color: #999; margin-top: 30px;">
                            ABC Publishing House, 13 Custodian Building, Srinagar
                        </p>
                    </div>
                `
            });
            console.log('✅ Order confirmation email sent successfully. ID:', data.id);
            return true;
        } catch (error) {
            console.error('❌ Mailgun Error (Order Confirmation):');
            console.error('Status:', error.details || error.status);
            console.error('Message:', error.message);
            if (error.message && error.message.includes('403')) {
                console.error('💡 Hint: Check if the domain is verified or if you need to add this recipient to authorized list (Sandbox).');
            }
            return false;
        }
    }
};
