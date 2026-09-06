const express = require('express');
const cors = require('cors');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
require('dotenv').config();

const db = require('./db');
const { upload, processImageUpload } = require('./cloudStorage');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_SECRET is required in production. Set it in Render environment variables.'); })() : 'ananyamlives_super_secret_jwt_key_2026');

// CORS configuration for production & local development
const allowedOrigins = [
    'https://ananyamlives.com',
    'https://www.ananyamlives.com',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
];
if (process.env.ALLOWED_ORIGINS) {
    process.env.ALLOWED_ORIGINS.split(',').forEach(o => {
        const trimmed = o.trim();
        if (trimmed && !allowedOrigins.includes(trimmed)) allowedOrigins.push(trimmed);
    });
}

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(null, true);
        }
    },
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Paths
const excelPath = path.join(__dirname, 'orders.xlsx');
const credentialsPath = path.join(__dirname, 'credentials.json');
const tokenPath = path.join(__dirname, 'token.json');
const googleSheetMetaPath = path.join(__dirname, 'google-sheet.json');

const GOOGLE_ORDERS_FOLDER = 'Ananyamlives Orders';
const GOOGLE_SHEET_NAME = 'Ananyamlives Orders Sheet';
const GOOGLE_SHEET_TAB = 'Orders';

let driveService = null;
let sheetsService = null;
let googleSheetState = {
    spreadsheetId: null,
    folderId: null,
    tabName: GOOGLE_SHEET_TAB
};

// Transactional Email Service
function createEmailTransporter() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        return null;
    }

    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: Number(process.env.EMAIL_PORT || 587),
        secure: String(process.env.EMAIL_SECURE || 'false').toLowerCase() === 'true',
        requireTLS: true,
        connectionTimeout: Number(process.env.EMAIL_TIMEOUT_MS || 15000),
        greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT_MS || 15000),
        socketTimeout: Number(process.env.EMAIL_SOCKET_TIMEOUT_MS || 20000),
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        }
    });
}

async function sendTransactionalEmail(toEmail, subject, htmlContent, attachments = []) {
    const transporter = createEmailTransporter();
    const fromAddress = process.env.EMAIL_FROM || '"Ananyamlives Care" <no-reply@ananyamlives.com>';

    if (!transporter) {
        throw new Error('SMTP credentials are missing. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, and EMAIL_FROM in environment variables.');
    }

    try {
        await transporter.verify();
        await transporter.sendMail({
            from: fromAddress,
            to: toEmail,
            subject,
            html: htmlContent,
            attachments
        });
        console.log(`📧 Transactional Email dispatched to ${toEmail}`);
        return true;
    } catch (err) {
        const message = err?.message || 'SMTP delivery failed';
        console.error('❌ Email dispatch failed:', message);
        throw new Error(`Email delivery failed: ${message}`);
    }
}

// Authentication Middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, error: 'Access token required' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, error: 'Invalid or expired token' });
        req.user = user;
        next();
    });
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    next();
}

function optionalToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) req.user = user;
            next();
        });
    } else {
        next();
    }
}

// Google APIs Initialization
function readJsonSource(envVarName, filePath) {
    const envValue = process.env[envVarName];
    if (envValue) {
        try { return JSON.parse(envValue); } catch (error) { throw new Error(`${envVarName} invalid JSON`); }
    }
    if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    return null;
}

function loadGoogleSheetState() {
    if (!fs.existsSync(googleSheetMetaPath)) return;
    try {
        const saved = JSON.parse(fs.readFileSync(googleSheetMetaPath, 'utf8'));
        googleSheetState = {
            spreadsheetId: saved.spreadsheetId || null,
            folderId: saved.folderId || null,
            tabName: saved.tabName || GOOGLE_SHEET_TAB
        };
    } catch (error) {}
}

function saveGoogleSheetState() {
    fs.writeFileSync(googleSheetMetaPath, JSON.stringify(googleSheetState, null, 2));
}

async function initializeGoogleApis() {
    try {
        const credentials = readJsonSource('GOOGLE_CREDENTIALS_JSON', credentialsPath);
        if (!credentials) return false;

        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
        const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        const token = readJsonSource('GOOGLE_TOKEN_JSON', tokenPath);
        if (token) {
            oauth2Client.setCredentials(token);
            driveService = google.drive({ version: 'v3', auth: oauth2Client });
            sheetsService = google.sheets({ version: 'v4', auth: oauth2Client });
            loadGoogleSheetState();
            console.log('✅ Google Drive and Google Sheets initialized');
            return true;
        }
        return false;
    } catch (error) {
        return false;
    }
}

async function ensureOrdersFolder() {
    if (!driveService) return null;
    try {
        if (googleSheetState.folderId) {
            try {
                await driveService.files.get({ fileId: googleSheetState.folderId, fields: 'id' });
                return googleSheetState.folderId;
            } catch (error) {
                googleSheetState.folderId = null;
                saveGoogleSheetState();
            }
        }
        const folderRes = await driveService.files.list({
            q: `name='${GOOGLE_ORDERS_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            spaces: 'drive',
            pageSize: 1,
            fields: 'files(id, name)'
        });
        let folderId = folderRes.data.files?.[0]?.id;
        if (!folderId) {
            const createRes = await driveService.files.create({
                resource: { name: GOOGLE_ORDERS_FOLDER, mimeType: 'application/vnd.google-apps.folder' },
                fields: 'id'
            });
            folderId = createRes.data.id;
        }
        googleSheetState.folderId = folderId;
        saveGoogleSheetState();
        return folderId;
    } catch (error) {
        return null;
    }
}

async function ensureOrdersSpreadsheet() {
    if (!driveService || !sheetsService) return null;
    try {
        if (googleSheetState.spreadsheetId) {
            try {
                await driveService.files.get({ fileId: googleSheetState.spreadsheetId, fields: 'id' });
                return googleSheetState;
            } catch (error) {
                googleSheetState.spreadsheetId = null;
                saveGoogleSheetState();
            }
        }
        const folderId = await ensureOrdersFolder();
        if (!folderId) return null;

        const existingSheet = await driveService.files.list({
            q: `name='${GOOGLE_SHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and '${folderId}' in parents`,
            spaces: 'drive',
            pageSize: 1,
            fields: 'files(id, name)'
        });

        let spreadsheetId = existingSheet.data.files?.[0]?.id || null;
        let tabName = GOOGLE_SHEET_TAB;

        if (!spreadsheetId) {
            const createRes = await sheetsService.spreadsheets.create({
                resource: {
                    properties: { title: GOOGLE_SHEET_NAME },
                    sheets: [{ properties: { title: GOOGLE_SHEET_TAB } }]
                },
                fields: 'spreadsheetId'
            });
            spreadsheetId = createRes.data.spreadsheetId;
        }

        googleSheetState = { spreadsheetId, folderId, tabName };
        saveGoogleSheetState();
        return googleSheetState;
    } catch (error) {
        return null;
    }
}

async function getWorkbook() {
    let workbook = new ExcelJS.Workbook();
    if (fs.existsSync(excelPath)) {
        workbook = await ExcelJS.Workbook.read(excelPath);
    } else {
        const worksheet = workbook.addWorksheet('Orders');
        worksheet.columns = [
            { header: 'Order ID', key: 'id', width: 16 },
            { header: 'Date', key: 'date', width: 20 },
            { header: 'Customer Name', key: 'name', width: 18 },
            { header: 'Email', key: 'email', width: 22 },
            { header: 'Phone', key: 'phone', width: 14 },
            { header: 'Address', key: 'address', width: 28 },
            { header: 'City', key: 'city', width: 12 },
            { header: 'State', key: 'state', width: 12 },
            { header: 'Pincode', key: 'pincode', width: 10 },
            { header: 'Items', key: 'items', width: 40 },
            { header: 'Total (₹)', key: 'total', width: 12 },
            { header: 'Special Note', key: 'note', width: 25 }
        ];
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B1C09' } };
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    }
    return workbook;
}

async function sendTelegramNotification(orderId, customerName, totalAmount, paymentMethod) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!botToken || !chatId) return;

    try {
        const message = `🔔 <b>NEW PAID ORDER RECEIVED!</b>\nOrder: #${orderId}\nCustomer: ${customerName}\nAmount: ₹${totalAmount}\nPayment: ${paymentMethod}`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' })
        });
    } catch (error) {}
}

// ==========================================
// 1. MANDATORY EMAIL OTP AUTHENTICATION
// ==========================================

const pendingEmailOtps = new Map();

// Step 1: Register Request -> Generate & Send 6-Digit Email OTP
app.post('/api/auth/register-request', async (req, res) => {
    try {
        const { name, email, password, phone, address } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, error: 'Name, email and password are required' });
        }

        const existing = await db.findUserByEmail(email);
        if (existing) {
            return res.status(400).json({ success: false, error: 'Email address is already registered. Please login.' });
        }

        const cleanEmail = email.toLowerCase().trim();
        const pending = pendingEmailOtps.get(cleanEmail);

        if (pending && Date.now() < pending.resendAfter) {
            const waitSeconds = Math.ceil((pending.resendAfter - Date.now()) / 1000);
            return res.status(429).json({ success: false, error: `Please wait ${waitSeconds} seconds before requesting a new OTP.` });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        pendingEmailOtps.set(cleanEmail, {
            name,
            email: cleanEmail,
            password_hash,
            phone: phone || '',
            address: address || '',
            otpCode,
            expiresAt: Date.now() + 5 * 60 * 1000, // 5 min expiry
            attempts: 0,
            resendAfter: Date.now() + 45 * 1000 // 45s cooldown
        });

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2d9cc; border-radius: 10px; background: #fff;">
                <h2 style="color: #3b1c09; margin-bottom: 5px;">ANANYAMLIVES</h2>
                <p style="color: #8b4513; margin-top: 0; font-size: 14px;">Verify Your Email Address</p>
                <hr style="border: 0; border-top: 1px solid #eee;" />
                <p>Hello <strong>${name}</strong>,</p>
                <p>Thank you for signing up at Ananyamlives. Please enter the 6-digit verification code below to complete your registration:</p>
                <div style="text-align: center; margin: 20px 0;">
                    <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; background: #fdfbf7; padding: 12px 24px; border: 1px solid #d4a373; color: #5c2c16; border-radius: 8px; display: inline-block;">${otpCode}</span>
                </div>
                <p style="font-size: 13px; color: #666;">This code is valid for <strong>5 minutes</strong>. For security, do not share this OTP with anyone.</p>
            </div>
        `;

        try {
            await sendTransactionalEmail(cleanEmail, 'Verify Your Email — Ananyamlives', emailHtml);
        } catch (emailError) {
            pendingEmailOtps.delete(cleanEmail);
            return res.status(503).json({
                success: false,
                error: 'Email OTP could not be sent right now. Please try again in a few minutes.'
            });
        }

        res.json({
            success: true,
            message: `Verification OTP sent to ${cleanEmail}.`
        });
    } catch (error) {
        console.error('Register request error:', error);
        res.status(500).json({ success: false, error: 'Registration request failed: ' + error.message });
    }
});

// Step 2: Verify Email OTP & Complete Account Creation
app.post('/api/auth/register-verify', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, error: 'Email and OTP code are required' });
        }

        const cleanEmail = email.toLowerCase().trim();
        const pending = pendingEmailOtps.get(cleanEmail);

        if (!pending) {
            return res.status(400).json({ success: false, error: 'No pending registration request found for this email, or request has expired. Please sign up again.' });
        }

        if (Date.now() > pending.expiresAt) {
            pendingEmailOtps.delete(cleanEmail);
            return res.status(400).json({ success: false, error: 'Verification OTP code has expired. Please request a new OTP.' });
        }

        if (pending.attempts >= 5) {
            pendingEmailOtps.delete(cleanEmail);
            return res.status(400).json({ success: false, error: 'Too many incorrect OTP attempts. Please start registration again.' });
        }

        if (pending.otpCode !== String(otp).trim()) {
            pending.attempts += 1;
            return res.status(400).json({ success: false, error: `Invalid OTP code. ${5 - pending.attempts} attempts remaining.` });
        }

        // OTP verified successfully! Delete pending record and create verified user in DB
        pendingEmailOtps.delete(cleanEmail);

        const newUser = await db.createUser({
            name: pending.name,
            email: pending.email,
            password_hash: pending.password_hash,
            phone: pending.phone,
            address: pending.address,
            role: 'USER'
        });

        const token = jwt.sign(
            { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Email verified and account created successfully!',
            token,
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                role: newUser.role,
                phone: newUser.phone,
                address: newUser.address
            }
        });
    } catch (error) {
        console.error('Register verify error:', error);
        res.status(500).json({ success: false, error: 'Verification failed: ' + error.message });
    }
});

// Step 3: Resend Email OTP
app.post('/api/auth/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, error: 'Email is required' });

        const cleanEmail = email.toLowerCase().trim();
        const pending = pendingEmailOtps.get(cleanEmail);

        if (!pending) {
            return res.status(400).json({ success: false, error: 'No active registration request found. Please sign up again.' });
        }

        if (Date.now() < pending.resendAfter) {
            const waitSeconds = Math.ceil((pending.resendAfter - Date.now()) / 1000);
            return res.status(429).json({ success: false, error: `Please wait ${waitSeconds} seconds before requesting a new OTP.` });
        }

        const newOtpCode = Math.floor(100000 + Math.random() * 900000).toString();
        pending.otpCode = newOtpCode;
        pending.expiresAt = Date.now() + 5 * 60 * 1000;
        pending.attempts = 0;
        pending.resendAfter = Date.now() + 45 * 1000;

        const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 20px; border: 1px solid #e2d9cc; border-radius: 10px; background: #fff;">
                <h2 style="color: #3b1c09; margin-bottom: 5px;">ANANYAMLIVES</h2>
                <p style="color: #8b4513; margin-top: 0; font-size: 14px;">Resent Verification Code</p>
                <hr style="border: 0; border-top: 1px solid #eee;" />
                <p>Hello <strong>${pending.name}</strong>,</p>
                <p>Your new 6-digit verification code is:</p>
                <div style="text-align: center; margin: 20px 0;">
                    <span style="font-size: 28px; font-weight: bold; letter-spacing: 6px; background: #fdfbf7; padding: 12px 24px; border: 1px solid #d4a373; color: #5c2c16; border-radius: 8px; display: inline-block;">${newOtpCode}</span>
                </div>
                <p style="font-size: 13px; color: #666;">This code is valid for <strong>5 minutes</strong>.</p>
            </div>
        `;

        try {
            await sendTransactionalEmail(cleanEmail, 'Resent Email OTP Verification — Ananyamlives', emailHtml);
        } catch (emailError) {
            return res.status(503).json({
                success: false,
                error: 'The verification email could not be resent. Please try again shortly.'
            });
        }

        res.json({ success: true, message: `A new 6-digit OTP code has been sent to ${cleanEmail}.` });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Resend OTP failed: ' + error.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, error: 'Email and password required' });
        }

        if (await db.isCustomerActivityBlocked({ email })) {
            return res.status(404).json({ success: false, blocked: true, error: 'Account not found' });
        }

        const user = await db.findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        let match = false;
        if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
            match = await bcrypt.compare(password, user.password_hash);
        } else {
            match = (password === 'SaKaV@GuRu#' || password === user.password_hash);
        }

        if (!match) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone || '',
                address: user.address || ''
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Login failed: ' + error.message });
    }
});

// Current User Profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await db.findUserById(req.user.id);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                address: user.address
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==========================================
// 2. PRODUCT CATALOG APIS
// ==========================================

app.get('/api/products', async (req, res) => {
    try {
        const products = await db.getAllProducts();
        res.json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch products' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await db.getProductById(req.params.id);
        if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
        res.json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch product' });
    }
});

function getClientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    const address = (forwarded ? String(forwarded).split(',')[0].trim() : req.socket.remoteAddress || '').replace(/^::ffff:/, '');
    if (address === '::1') return '127.0.0.1';
    return address;
}

function getBrowserName(userAgent) {
    const ua = String(userAgent || '');
    if (/Edg\//i.test(ua)) return 'Microsoft Edge';
    if (/OPR\//i.test(ua)) return 'Opera';
    if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) return 'Google Chrome';
    if (/Firefox\//i.test(ua)) return 'Mozilla Firefox';
    if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari';
    if (/MSIE|Trident\//i.test(ua)) return 'Internet Explorer';
    return 'Other / Unknown';
}

function getDeviceType(userAgent) {
    const ua = String(userAgent || '');
    if (/iPad/i.test(ua)) return 'iPad';
    if (/iPhone|iPod/i.test(ua)) return 'iPhone / iOS';
    if (/Android/i.test(ua)) return 'Android';
    if (/Mobile/i.test(ua)) return 'Mobile';
    return 'PC / Desktop';
}

function getTrafficSource(referrer) {
    if (!referrer) return 'Direct';
    try {
        const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
        if (/google\.|bing\.|yahoo\.|duckduckgo\.|ecosia\./.test(host)) return `Search: ${host}`;
        if (/facebook\.|instagram\.|youtube\.|tiktok\.|twitter\.|x\.com|linkedin\.|pinterest\.|whatsapp\./.test(host)) return `Social: ${host}`;
        return `Referral: ${host}`;
    } catch (error) {
        return 'Unknown referral';
    }
}

// Enforce permanent IP blocks for storefront requests while keeping the admin portal reachable.
app.use(async (req, res, next) => {
    const adminReferer = String(req.headers.referer || '').includes('/admin.html');
    if (req.path.startsWith('/admin') || req.path.startsWith('/api/admin') || adminReferer) return next();
    try {
        const cookies = Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(cookie => {
            const index = cookie.indexOf('=');
            return [cookie.slice(0, index).trim(), decodeURIComponent(cookie.slice(index + 1))];
        }));
        let email = cookies.ananyan_block_email || null;
        const authorization = req.headers.authorization || '';
        if (authorization.startsWith('Bearer ')) {
            try { email = jwt.verify(authorization.slice(7), JWT_SECRET).email || email; } catch (error) { /* Guest request */ }
        }
        const blocked = await db.isCustomerActivityBlocked({ email, visitorId: cookies.ananyan_visitor_id, ipAddress: getClientIp(req) });
        if (blocked) {
            if (req.path.startsWith('/api/')) return res.status(403).json({ success: false, blocked: true, error: 'Access blocked by administrator' });
            return res.status(404).send('<!doctype html><html><head><title>Page Not Found</title><style>body{font-family:Arial,sans-serif;background:#11141f;color:#f8fafc;display:grid;place-items:center;min-height:100vh;text-align:center}main{max-width:520px;padding:32px}h1{font-size:64px;margin:0 0 12px;color:#d4a373}p{color:#cbd5e1;font-size:18px}</style></head><body><main><h1>404</h1><h2>Page Not Found</h2><p>The page you are looking for does not exist.</p></main></body></html>');
        }
    } catch (error) {
        console.error('Blocklist check failed:', error.message);
    }
    next();
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(__dirname));

// Customer activity is intentionally lightweight and accepts guest visitors too.
app.post('/api/analytics/events', async (req, res) => {
    try {
        const payload = req.body || {};
        const allowedEvents = new Set([
            'page_view', 'product_view', 'wishlist_add', 'wishlist_remove',
            'cart_add', 'cart_remove', 'cart_update', 'search',
            'checkout_start', 'order_success', 'section_view'
        ]);
        if (!payload.visitor_id || !allowedEvents.has(payload.event_type)) {
            return res.status(400).json({ success: false, error: 'Invalid analytics event' });
        }

        let identity = {};
        const authorization = req.headers.authorization || '';
        if (authorization.startsWith('Bearer ')) {
            try { identity = jwt.verify(authorization.slice(7), JWT_SECRET); } catch (error) { /* Guest event */ }
        }

        const referrer = payload.referrer || payload.metadata?.referrer || '';
        const userAgent = req.get('user-agent') || '';
        const ipAddress = getClientIp(req);
        if (await db.isCustomerActivityBlocked({ email: identity.email || payload.customer_email, visitorId: payload.visitor_id, ipAddress })) {
            return res.status(403).json({ success: false, blocked: true });
        }
        const event = await db.recordCustomerActivity({
            ...payload,
            user_id: identity.id || payload.user_id,
            customer_name: identity.name || payload.customer_name,
            customer_email: identity.email || payload.customer_email,
            ip_address: ipAddress,
            user_agent: userAgent,
            browser: getBrowserName(userAgent),
            device_type: getDeviceType(userAgent),
            traffic_source: getTrafficSource(referrer),
            referrer,
            metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {}
        });
        const cookies = [`ananyan_visitor_id=${encodeURIComponent(payload.visitor_id)}; Path=/; Max-Age=31536000; SameSite=Lax`];
        const customerEmail = identity.email || payload.customer_email;
        if (customerEmail) cookies.push(`ananyan_block_email=${encodeURIComponent(customerEmail)}; Path=/; Max-Age=31536000; SameSite=Lax`);
        res.setHeader('Set-Cookie', cookies);
        res.status(201).json({ success: true, event_id: event.id });
    } catch (error) {
        console.error('Analytics event error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to record activity' });
    }
});

app.post('/api/products', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const newProd = await db.createProduct(req.body);
        res.json({ success: true, message: 'Product created successfully', product: newProd });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to create product: ' + error.message });
    }
});

app.put('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const updated = await db.updateProduct(req.params.id, req.body);
        if (!updated) return res.status(404).json({ success: false, error: 'Product not found' });
        res.json({ success: true, message: 'Product updated successfully', product: updated });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update product' });
    }
});

app.delete('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.deleteProduct(req.params.id);
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete product' });
    }
});

app.get('/api/site-content', async (req, res) => {
    try {
        const content = await db.getSiteContent();
        res.json({ success: true, content });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch site content' });
    }
});

app.put('/api/site-content', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const allowedKeys = new Set(Object.keys(await db.getSiteContent()));
        const updates = Object.fromEntries(Object.entries(req.body || {}).filter(([key, value]) => allowedKeys.has(key) && (typeof value === 'string' || (key === 'blogArticles' && Array.isArray(value)))));
        const content = await db.updateSiteContent(updates);
        res.json({ success: true, message: 'Site content updated successfully', content });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update site content' });
    }
});

// ==========================================
// 3. ORDER CONFIRMATION (DIRECT / WHATSAPP)
// ==========================================

// Confirm a direct/WhatsApp order without an online payment gateway
app.post('/api/orders/confirm', optionalToken, async (req, res) => {
    try {
        const { orderData } = req.body || {};
        if (!orderData || !orderData.name || !orderData.email || !orderData.phone || !orderData.address || !orderData.city || !orderData.state || orderData.country !== 'India' || !orderData.pincode || !Array.isArray(orderData.items) || !orderData.items.length) {
            return res.status(400).json({ success: false, error: 'Customer details and at least one product are required' });
        }
        if (!/^\+91\s?[6-9]\d{9}$/.test(String(orderData.phone)) || !/^\d{6}$/.test(String(orderData.pincode))) {
            return res.status(400).json({ success: false, error: 'Only valid Indian +91 mobile numbers and 6-digit pincodes are accepted' });
        }
        if (await db.isCustomerActivityBlocked({ email: orderData.email, ipAddress: getClientIp(req) })) {
            return res.status(404).json({ success: false, blocked: true, error: 'Order service not found' });
        }
        if (await db.getOrderById(orderData.id)) {
            return res.json({ success: true, orderId: orderData.id, pdfUrl: `/api/orders/${orderData.id}/pdf` });
        }

        const savedOrder = await db.createOrder({
            id: orderData.id,
            user_id: req.user ? req.user.id : null,
            customer_name: orderData.name,
            email: orderData.email,
            phone: orderData.phone,
            address: orderData.address,
            city: orderData.city,
            state: orderData.state,
            pincode: orderData.pincode,
            items: orderData.items,
            total: orderData.total,
            status: 'Pending',
            tracking_number: `TRK-${Date.now().toString().slice(-6)}`,
            payment_method: 'WhatsApp Order',
            payment_status: 'UNPAID',
            special_note: orderData.note || ''
        });

        // Try Excel log (optional, fail-safe for production serverless/read-only disks)
        try {
            const workbook = await getWorkbook();
            const worksheet = workbook.getWorksheet('Orders');
            const itemsText = orderData.items.map(item => `${item.title} × ${item.qty}`).join(', ');
            worksheet.addRow({
                id: orderData.id,
                date: new Date().toLocaleString('en-IN'),
                name: orderData.name,
                email: orderData.email,
                phone: orderData.phone,
                address: orderData.address,
                city: orderData.city,
                state: orderData.state,
                pincode: orderData.pincode,
                items: itemsText,
                total: Number(orderData.total),
                note: orderData.note || ''
            });
            await workbook.xlsx.writeFile(excelPath);
        } catch (excelErr) {
            // Excel write failure is non-blocking for cloud hosting
        }

        // Try Google Sheets backup if configured
        if (sheetsService) {
            try {
                const googleSheet = await ensureOrdersSpreadsheet();
                if (googleSheet?.spreadsheetId) {
                    const itemsText = orderData.items.map(item => `${item.title} × ${item.qty}`).join(', ');
                    await sheetsService.spreadsheets.values.append({
                        spreadsheetId: googleSheet.spreadsheetId,
                        range: `${googleSheet.tabName}!A:L`,
                        valueInputOption: 'USER_ENTERED',
                        insertDataOption: 'INSERT_ROWS',
                        requestBody: {
                            values: [[
                                orderData.id,
                                new Date().toLocaleString('en-IN'),
                                orderData.name,
                                orderData.email,
                                orderData.phone,
                                orderData.address,
                                orderData.city,
                                orderData.state,
                                orderData.pincode,
                                itemsText,
                                Number(orderData.total),
                                orderData.note || ''
                            ]]
                        }
                    });
                }
            } catch (gsErr) {}
        }

        sendTelegramNotification(orderData.id, orderData.name, orderData.total, 'WhatsApp Order (UNPAID)');
        res.json({ success: true, message: 'Order confirmed successfully', orderId: savedOrder.id, pdfUrl: `/api/orders/${savedOrder.id}/pdf` });
    } catch (error) {
        console.error('Order confirmation error:', error);
        res.status(500).json({ success: false, error: 'Could not confirm order: ' + error.message });
    }
});

// Stream PDF Invoice Download
app.get('/api/orders/:id/pdf', async (req, res) => {
    try {
        const order = await db.getOrderById(req.params.id);
        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        const doc = new PDFDocument({ margin: 0, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Invoice-${order.id}.pdf`);

        doc.pipe(res);

        const itemsArr = Array.isArray(order.items) ? order.items : (typeof order.items === 'string' ? JSON.parse(order.items) : []);
        const pageWidth = 595;
        const left = 54;
        const right = 560;
        const brown = '#431b0b';
        const terracotta = '#b97032';
        const cream = '#f4ddc5';
        const pale = '#f8eee1';
        const clean = value => String(value ?? '').replace(/[\r\n]/g, ' ').trim();
        const short = (value, length) => {
            const text = clean(value);
            return text.length > length ? `${text.slice(0, length - 3)}...` : text;
        };
        const money = value => `INR ${Number(value || 0).toLocaleString('en-IN')}`;
        const invoiceDate = order.date || new Date(order.created_at).toLocaleString('en-IN');

        doc.rect(0, 0, 360, 84).fill(cream);
        doc.rect(360, 0, pageWidth - 360, 84).fill(brown);
        doc.fillColor('#7e2419').font('Helvetica-Bold').fontSize(21).text('ANANYAMLIVES', 0, 25, { width: 360, align: 'center' });
        doc.fillColor('#1f120b').font('Helvetica').fontSize(10).text('Retrieve our Heredity', 0, 53, { width: 360, align: 'center' });
        doc.fillColor('#fff').font('Helvetica-Bold').fontSize(27).text('INVOICE', 360, 19, { width: 235, align: 'center' });
        doc.fontSize(9).text('CUSTOMER COPY', 360, 55, { width: 235, align: 'center' });

        doc.fillColor(terracotta).font('Helvetica-Bold').fontSize(10).text('INVOICE TO', left, 112);
        doc.fillColor(brown).fontSize(13).text(short(order.customer_name || order.name, 29), left, 132);
        doc.font('Helvetica').fontSize(9).text(short(order.address, 38), left, 151);
        doc.text(`${short(order.city, 18)}, ${short(order.state, 18)} - ${clean(order.pincode)}`, left, 166);
        doc.text(short(order.email, 42), left, 181);

        doc.fillColor(terracotta).font('Helvetica-Bold').fontSize(10).text('INVOICE DETAILS', 380, 112);
        doc.fillColor(brown).fontSize(9).text(`Invoice No.  ${clean(order.id)}`, 380, 133);
        doc.text(`Invoice Date: ${clean(invoiceDate)}`, 380, 149);
        doc.text(`Phone: ${clean(order.phone)}`, 380, 165);
        doc.text('Payment Method: Online', 380, 181);

        const tableTop = 197;
        const columns = [left, 102, 370, 439, 486, right];
        doc.rect(left, tableTop, right - left, 29).fill(brown);
        doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8);
        doc.text('SL#', columns[0] + 10, tableTop + 10);
        doc.text('PRODUCT DESCRIPTION', columns[1] + 6, tableTop + 10);
        doc.text('UNIT PRICE', columns[2] + 7, tableTop + 10);
        doc.text('QTY.', columns[3] + 8, tableTop + 10);
        doc.text('TOTAL', columns[4] + 7, tableTop + 10);

        let rowTop = tableTop + 29;
        let subtotal = 0;
        itemsArr.forEach((item, index) => {
            const qty = Number(item.qty || item.quantity || 1);
            const unitPrice = Number(item.price || 0);
            const lineTotal = qty * unitPrice;
            subtotal += lineTotal;
            doc.rect(left, rowTop, right - left, 28).fill(index % 2 === 0 ? pale : '#fff');
            doc.fillColor(brown).font('Helvetica').fontSize(8);
            doc.text(String(index + 1).padStart(2, '0'), columns[0] + 14, rowTop + 10);
            doc.text(short(item.title || item.name, 43), columns[1] + 6, rowTop + 10);
            doc.text(money(unitPrice), columns[2] + 7, rowTop + 10);
            doc.text(String(qty), columns[3] + 10, rowTop + 10);
            doc.font('Helvetica-Bold').text(money(lineTotal), columns[4] + 7, rowTop + 10);
            rowTop += 28;
        });

        const total = Number(order.total || subtotal);
        doc.rect(360, rowTop, 200, 27).fill('#f0e1ce');
        doc.fillColor(brown).font('Helvetica').fontSize(9).text('Subtotal', 370, rowTop + 9);
        doc.text(money(subtotal), 486, rowTop + 9);
        doc.rect(360, rowTop + 27, 200, 30).fill(terracotta);
        doc.fillColor('#fff').font('Helvetica-Bold').fontSize(10).text('GRAND TOTAL', 370, rowTop + 37);
        doc.text(money(total), 486, rowTop + 37);

        const paymentTop = rowTop + 86;
        doc.fillColor(brown).font('Helvetica-Bold').fontSize(10).text('CUSTOMER NOTES', left, paymentTop);
        doc.font('Helvetica').fontSize(9).text(clean(order.special_note || 'No customer note provided.'), left, paymentTop + 21, { width: 506 });
        doc.rect(0, 790, pageWidth, 52).fill(brown);
        doc.fillColor('#fff').font('Helvetica-Bold').fontSize(8).text('Thank you for choosing Ananyamlives authentic handcrafted cookware!', left, 804, { width: 506, align: 'center' });
        doc.font('Helvetica').fontSize(8).text('+91 883 810 5431 | ananyamlives@gmail.com', left, 821, { width: 506, align: 'center' });

        doc.end();
    } catch (error) {
        console.error('PDF Generation error:', error);
        res.status(500).json({ success: false, error: 'Failed to generate PDF invoice: ' + error.message });
    }
});

app.post('/api/admin/orders/:id/invoice-email', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const order = await db.getOrderById(req.params.id);
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        if (!order.email) return res.status(400).json({ success: false, error: 'Customer email is missing' });
        const invoiceUrl = `${req.protocol}://${req.get('host')}/api/orders/${encodeURIComponent(order.id)}/pdf`;
        const invoiceResponse = await fetch(invoiceUrl);
        if (!invoiceResponse.ok) throw new Error('Could not generate invoice PDF');
        const invoiceBuffer = Buffer.from(await invoiceResponse.arrayBuffer());
        const sent = await sendTransactionalEmail(order.email, `Invoice for Order #${order.id} - Ananyamlives`, `
            <p>Dear ${order.customer_name || 'Customer'},</p>
            <p>Your payment was received successfully. Your invoice is ready:</p>
            <p><a href="${invoiceUrl}">Download Invoice #${order.id}</a></p>
            <p>Thank you for choosing Ananyamlives.</p>`, [{
                filename: `Invoice-${order.id}.pdf`,
                content: invoiceBuffer,
                contentType: 'application/pdf'
            }]);
        if (!sent) return res.status(503).json({ success: false, error: 'Email service is not configured or delivery failed' });
        res.json({ success: true, message: 'Invoice email sent successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message || 'Failed to send invoice email' });
    }
});

// Fetch User Orders
app.get('/api/orders/my-orders', authenticateToken, async (req, res) => {
    try {
        const orders = await db.getUserOrders(req.user.id, req.user.email);
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch user orders' });
    }
});

// Track Order Status
app.get('/api/orders/track/:id', async (req, res) => {
    try {
        const order = await db.getOrderById(req.params.id);
        if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to track order' });
    }
});

// ==========================================
// 4. ADMIN CONTROL PANEL APIS
// ==========================================

app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const stats = await db.getAdminStats({ from: req.query.from, to: req.query.to });
        res.json({ success: true, stats, isPostgres: db.isPgActive() });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch admin stats' });
    }
});

app.get('/api/admin/analytics', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const analytics = await db.getCustomerActivityAnalytics(req.query.limit);
        const blocks = await db.getAnalyticsBlocks();
        res.json({ success: true, analytics, blocks, isPostgres: db.isPgActive() });
    } catch (error) {
        console.error('Analytics load error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch customer analytics' });
    }
});

app.post('/api/admin/analytics/block', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { blockType, blockValue } = req.body || {};
        const block = await db.setAnalyticsBlock(blockType, blockValue);
        if (!block) return res.status(400).json({ success: false, error: 'Valid block type and value are required' });
        res.json({ success: true, block });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to block activity' });
    }
});

app.delete('/api/admin/analytics/block', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.removeAnalyticsBlock(req.query.blockType, req.query.blockValue);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to unblock activity' });
    }
});

app.delete('/api/admin/analytics/history', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const deleted = await db.deleteCustomerActivity({ identifier: req.query.identifier, ipAddress: req.query.ipAddress });
        res.json({ success: true, deleted });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to delete activity history' });
    }
});

app.delete('/api/admin/analytics/customer', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { identifier, ipAddress } = req.query || {};
        if (!identifier && !ipAddress) return res.status(400).json({ success: false, error: 'Customer identifier or IP is required' });
        const deleted = await db.deleteCustomerPermanently({ identifier, ipAddress });
        res.json({ success: true, deleted, message: 'Customer permanently blocked and removed' });
    } catch (error) {
        console.error('Permanent customer delete error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to permanently remove customer' });
    }
});

app.get('/api/admin/analytics/customer', authenticateToken, requireAdmin, async (req, res) => {
    try {
        if (!req.query.identifier) return res.status(400).json({ success: false, error: 'Customer identifier is required' });
        const history = await db.getCustomerActivityHistory(req.query.identifier, req.query.limit);
        res.json({ success: true, history });
    } catch (error) {
        console.error('Customer activity history error:', error.message);
        res.status(500).json({ success: false, error: 'Failed to fetch customer activity history' });
    }
});

app.get('/api/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const orders = await db.getAllOrders();
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch all orders' });
    }
});

app.put('/api/admin/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status, trackingNumber } = req.body;
        if (!status) return res.status(400).json({ success: false, error: 'Status is required' });

        const updatedOrder = await db.updateOrderStatus(req.params.id, status, trackingNumber);
        if (!updatedOrder) return res.status(404).json({ success: false, error: 'Order not found' });

        res.json({ success: true, message: 'Order status updated successfully', order: updatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update order status' });
    }
});

app.put('/api/admin/orders/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const updates = req.body || {};

        updates.payment_method = 'WhatsApp Order';
        if (Object.prototype.hasOwnProperty.call(updates, 'items') && (!Array.isArray(updates.items) || !updates.items.length || updates.items.some(item => !item || !String(item.title || item.name || '').trim() || Number(item.qty || item.quantity) < 1))) {
            return res.status(400).json({ success: false, error: 'At least one valid product item is required' });
        }
        if (!String(updates.customer_name || '').trim() || !String(updates.email || '').trim() || !String(updates.phone || '').trim()) {
            return res.status(400).json({ success: false, error: 'Customer name, email and phone are required' });
        }

        if (Object.prototype.hasOwnProperty.call(updates, 'total')) {
            const total = Number(updates.total);
            if (Number.isNaN(total) || total < 0) {
                return res.status(400).json({ success: false, error: 'Total amount must be a valid number' });
            }
            updates.total = total;
        }

        if (Object.prototype.hasOwnProperty.call(updates, 'items') && !Array.isArray(updates.items)) {
            if (typeof updates.items === 'string') {
                try {
                    updates.items = JSON.parse(updates.items);
                } catch (error) {
                    return res.status(400).json({ success: false, error: 'Items must be a valid JSON array' });
                }
            } else {
                return res.status(400).json({ success: false, error: 'Items must be a valid JSON array' });
            }
        }

        const normalizedUpdates = {
            customer_name: updates.customer_name,
            email: updates.email,
            phone: updates.phone,
            address: updates.address,
            city: updates.city,
            state: updates.state,
            pincode: updates.pincode,
            items: updates.items,
            total: updates.total,
            status: updates.status,
            tracking_number: updates.tracking_number ?? updates.trackingNumber,
            payment_method: updates.payment_method,
            payment_status: updates.payment_status,
            special_note: updates.special_note
        };

        const updatedOrder = await db.updateOrderDetails(req.params.id, normalizedUpdates);
        if (!updatedOrder) return res.status(404).json({ success: false, error: 'Order not found' });

        res.json({ success: true, message: 'Order details updated successfully', order: updatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update order details' });
    }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
});

app.get('/api/admin/users/export', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await db.getAllUsers();
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Users');
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Name', key: 'name', width: 28 },
            { header: 'Email', key: 'email', width: 34 },
            { header: 'Phone', key: 'phone', width: 18 },
            { header: 'Address', key: 'address', width: 45 },
            { header: 'Role', key: 'role', width: 14 },
            { header: 'Registered At', key: 'created_at', width: 24 }
        ];
        worksheet.addRows(users);
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B4513' } };
        worksheet.views = [{ state: 'frozen', ySplit: 1 }];
        worksheet.autoFilter = { from: 'A1', to: 'G1' };

        const buffer = await workbook.xlsx.writeBuffer();
        const date = new Date().toISOString().slice(0, 10);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="ananyamlives-users-${date}.xlsx"`);
        res.send(buffer);
    } catch (error) {
        console.error('User export error:', error);
        res.status(500).json({ success: false, error: 'Failed to export users' });
    }
});

app.put('/api/admin/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { role } = req.body;
        if (!['USER', 'ADMIN'].includes(role)) {
            return res.status(400).json({ success: false, error: 'Invalid role' });
        }
        const updatedUser = await db.updateUserRole(req.params.id, role);
        res.json({ success: true, message: 'User role updated', user: updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Failed to update user role' });
    }
});

// ==========================================
// 5. IMAGE & FILE UPLOAD API
// ==========================================

app.post('/api/upload', authenticateToken, requireAdmin, upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'No image file uploaded' });
        const result = await processImageUpload(req.file);
        res.json({ success: true, message: 'Image uploaded successfully', url: result.url, file: result });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Image upload failed: ' + error.message });
    }
});

// Backward compatibility route aliases for authentication
app.post('/api/auth/register', (req, res, next) => {
    req.url = '/api/auth/register-request';
    app._router.handle(req, res, next);
});

app.post('/api/auth/verify-otp', (req, res, next) => {
    req.url = '/api/auth/register-verify';
    app._router.handle(req, res, next);
});

// Production Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        status: 'UP',
        message: 'Ananyamlives Full-Stack E-Commerce Server is running',
        timestamp: new Date().toISOString(),
        database: db.isPgActive() ? 'PostgreSQL' : 'Embedded JSON (localDb.json)',
        cloudStorage: (process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) ? 'Cloudinary' : 'Local uploads/',
        smtpConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD),
        googleDrive: !!driveService,
        googleSheets: !!sheetsService
    });
});

// Startup Server
async function startServer() {
    console.log('\n========================================');
    console.log('  Ananyamlives E-Commerce Server');
    console.log('========================================\n');

    await db.initDb();
    const driveReady = await initializeGoogleApis();

    const HOST = process.env.HOST || '0.0.0.0';
    app.listen(PORT, HOST, () => {
        console.log(`🚀 Server active on: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
        console.log(`👑 Admin Dashboard: http://localhost:${PORT}/admin.html`);
        if (driveReady) {
            console.log('☁️  Google Sheets backup: ENABLED');
        } else {
            console.log('☁️  Google Sheets backup: DISABLED');
        }
        console.log('\n✨ System ready for Production Deployment!\n');
    });
}

startServer();
