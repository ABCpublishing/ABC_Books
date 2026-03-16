// ===== Security Middleware for ABC Books =====
const jwt = require('jsonwebtoken');

// Rate limiting storage (in-memory, for production use Redis)
const rateLimitStore = new Map();

// ===== Authentication Middleware =====
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Please login to access this resource'
            });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.userId = decoded.userId;
            req.userEmail = decoded.email;
            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'Token expired',
                    message: 'Your session has expired. Please login again.'
                });
            }
            return res.status(401).json({
                error: 'Invalid token',
                message: 'Authentication failed'
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication error' });
    }
};

// ===== Admin Authentication Middleware =====
const authenticateAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Admin authentication required' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if user is admin (you can enhance this with a role field in the database)
        const sql = req.sql;
        const users = await sql`
            SELECT id, email, is_admin FROM users WHERE id = ${decoded.userId}
        `;

        if (users.length === 0 || !users[0].is_admin) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Admin privileges required'
            });
        }

        req.userId = decoded.userId;
        req.isAdmin = true;
        next();
    } catch (error) {
        console.error('Admin auth error:', error);
        res.status(401).json({ error: 'Admin authentication failed' });
    }
};

// ===== Rate Limiting Middleware =====
const rateLimit = (options = {}) => {
    const {
        windowMs = 15 * 60 * 1000, // 15 minutes
        maxRequests = 100,          // Max 100 requests per window
        message = 'Too many requests, please try again later'
    } = options;

    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        const key = `${clientIP}:${req.path}`;
        const now = Date.now();

        // Get or create rate limit entry
        if (!rateLimitStore.has(key)) {
            rateLimitStore.set(key, { count: 1, startTime: now });
            return next();
        }

        const entry = rateLimitStore.get(key);

        // Reset if window has expired
        if (now - entry.startTime > windowMs) {
            rateLimitStore.set(key, { count: 1, startTime: now });
            return next();
        }

        // Increment counter
        entry.count++;

        // Check if limit exceeded
        if (entry.count > maxRequests) {
            return res.status(429).json({
                error: 'Rate limited',
                message: message,
                retryAfter: Math.ceil((windowMs - (now - entry.startTime)) / 1000)
            });
        }

        next();
    };
};

// ===== Input Sanitization Middleware =====
const sanitizeInput = (req, res, next) => {
    // Function to sanitize strings
    const sanitize = (input) => {
        if (typeof input === 'string') {
            // Remove potential XSS scripts
            return input
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/javascript:/gi, '')
                .replace(/on\w+=/gi, '')
                .trim();
        }
        return input;
    };

    // Sanitize body
    if (req.body && typeof req.body === 'object') {
        Object.keys(req.body).forEach(key => {
            req.body[key] = sanitize(req.body[key]);
        });
    }

    // Sanitize query params
    if (req.query && typeof req.query === 'object') {
        Object.keys(req.query).forEach(key => {
            req.query[key] = sanitize(req.query[key]);
        });
    }

    next();
};

// ===== Security Headers Middleware =====
const securityHeaders = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy (adjust as needed)
    res.setHeader('Content-Security-Policy', [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://accounts.google.com https://apis.google.com",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://accounts.google.com",
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
        "img-src 'self' data: https: blob: https://www.gstatic.com https://*.googleusercontent.com",
        "connect-src 'self' https://api.razorpay.com https://*.vercel.app https://*.neon.tech https://accounts.google.com",
        "frame-src 'self' https://accounts.google.com"
    ].join('; '));

    next();
};

// ===== Request Logging Middleware =====
const requestLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

        console[logLevel](`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });

    next();
};

// ===== Password Validation =====
const validatePassword = (password) => {
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    if (password.length < minLength) {
        return { valid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!hasUppercase || !hasLowercase) {
        return { valid: false, message: 'Password must contain both uppercase and lowercase letters' };
    }
    if (!hasNumber) {
        return { valid: false, message: 'Password must contain at least one number' };
    }

    return { valid: true };
};

// ===== Email Validation =====
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

module.exports = {
    authenticate,
    authenticateAdmin,
    rateLimit,
    sanitizeInput,
    securityHeaders,
    requestLogger,
    validatePassword,
    validateEmail
};
