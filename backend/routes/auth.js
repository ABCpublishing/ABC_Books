// ===== Authentication Routes (PostgreSQL / Admin DB) =====
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const emailService = require('../services/email');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone = null } = req.body;
        const sql = req.db.admin;

        // Check if email already exists
        const existingUser = await sql`
            SELECT id FROM users WHERE email = ${email}
        `;

        if (existingUser.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Generate verification token
        const crypto = require('crypto');
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user with RETURNING
        const result = await sql`
            INSERT INTO users (name, email, phone, password_hash, verification_token, is_verified)
            VALUES (${name}, ${email}, ${phone}, ${hashedPassword}, ${verificationToken}, TRUE)
            RETURNING id, name, email, phone, created_at
        `;

        const user = result[0];

        // Generate JWT token for auto-login
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: 'Registration successful. Your account is ready to use.',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                createdAt: user.created_at,
                isVerified: true
            },
            token,
            accessToken: token
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed', message: error.message });
    }
});

// Verify email
router.get('/verify', async (req, res) => {
    try {
        const { token } = req.query;
        const sql = req.db.admin;

        if (!token) {
            return res.status(400).json({ error: 'Missing token' });
        }

        const result = await sql`
            UPDATE users 
            SET is_verified = TRUE, verification_token = NULL
            WHERE verification_token = ${token}
            RETURNING id, name, email
        `;

        if (result.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        res.json({ message: 'Email verified successfully! You can now login.' });
    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { phone, password, email } = req.body;
        const sql = req.db.admin;

        const identifier = phone || email;

        const users = await sql`
            SELECT id, name, email, phone, password_hash, created_at, is_verified, is_admin
            FROM users WHERE phone = ${identifier} OR email = ${identifier}
        `;

        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = users[0];

        if (user.is_verified === false) {
            console.log(`⚠️ Unverified user logging in: ${identifier}`);
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                is_admin: user.is_admin,
                createdAt: user.created_at
            },
            token,
            accessToken: token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed', message: error.message });
    }
});

// Verify token / Get current user
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const sql = req.db.admin;
        const users = await sql`
            SELECT id, name, email, phone, is_admin, created_at
            FROM users WHERE id = ${decoded.userId}
        `;

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                is_admin: user.is_admin,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        console.error('Auth check error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const sql = req.db.admin;

        const users = await sql`
            SELECT id, name FROM users WHERE email = ${email}
        `;

        if (users.length === 0) {
            return res.status(404).json({ error: 'No account found with this email' });
        }

        const user = users[0];

        const crypto = require('crypto');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiry = new Date(Date.now() + 3600000);

        await sql`
            UPDATE users 
            SET reset_password_token = ${resetToken}, 
                reset_password_expires = ${expiry}
            WHERE id = ${user.id}
        `;

        const frontendUrl = process.env.FRONTEND_URL || 'https://abcbooks.store';
        const resetLink = `${frontendUrl}/reset-password.html?token=${resetToken}`;

        const emailSent = await emailService.sendPasswordResetEmail(email, resetLink);

        res.json({
            message: 'Password reset link generated successfully.',
            resetLink,
            emailSent
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// Reset password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        const sql = req.db.admin;

        if (!token || !password) {
            return res.status(400).json({ error: 'Missing token or password' });
        }

        const users = await sql`
            SELECT id FROM users 
            WHERE reset_password_token = ${token} 
            AND reset_password_expires > NOW()
        `;

        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const user = users[0];
        const hashedPassword = await bcrypt.hash(password, 10);

        await sql`
            UPDATE users 
            SET password_hash = ${hashedPassword},
                reset_password_token = NULL,
                reset_password_expires = NULL,
                is_verified = TRUE
            WHERE id = ${user.id}
        `;

        res.json({ message: 'Password reset successful! You can now login with your new password.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Google Sign-In / Sign-Up
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        const sql = req.db.admin;

        if (!credential) {
            return res.status(400).json({ error: 'Missing Google credential' });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

        let users = await sql`SELECT id, name, email, phone, created_at FROM users WHERE email = ${email}`;
        let user;

        if (users.length === 0) {
            const crypto = require('crypto');
            const randomPassword = crypto.randomBytes(16).toString('hex');
            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            const result = await sql`
                INSERT INTO users (name, email, password_hash, is_verified)
                VALUES (${name}, ${email}, ${hashedPassword}, TRUE)
                RETURNING id, name, email, phone, created_at
            `;
            user = result[0];
            console.log(`[Google Auth] New user registered: ${email}`);
        } else {
            user = users[0];
            console.log(`[Google Auth] Existing user logged in: ${email}`);
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Google login successful',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                createdAt: user.created_at,
                picture: picture
            },
            token,
            accessToken: token
        });
    } catch (error) {
        console.error('Google Auth error:', error);
        res.status(401).json({ error: 'Invalid Google token or account issue' });
    }
});

module.exports = router;
