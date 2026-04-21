"use strict";
/**
 * Auth Routes - User authentication and organization management
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const pool_1 = require("../db/pool");
const router = (0, express_1.Router)();
// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';
// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};
exports.authenticateToken = authenticateToken;
// Sign up
router.post('/signup', async (req, res) => {
    console.log('Signup request received:', req.body);
    const db = pool_1.pool;
    const { email, password, firstName, lastName, organizationName } = req.body;
    try {
        console.log('Starting signup for email:', email);
        // Check if user exists
        console.log('Checking if user exists...');
        const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
        console.log('Existing user check complete:', existingUser.rows.length);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        // Hash password
        console.log('Hashing password...');
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        console.log('Password hashed successfully');
        // Create user
        console.log('Creating user...');
        const userResult = await db.query(`INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, first_name, last_name, created_at`, [email.toLowerCase(), passwordHash, firstName, lastName]);
        const user = userResult.rows[0];
        // Create organization
        const orgResult = await db.query(`INSERT INTO organizations (name, created_at, updated_at)
       VALUES ($1, NOW(), NOW())
       RETURNING *`, [organizationName || `${firstName}'s Organization`]);
        const organization = orgResult.rows[0];
        // Add user as owner
        await db.query(`INSERT INTO organization_members (user_id, organization_id, role, joined_at, is_active)
       VALUES ($1, $2, 'owner', NOW(), true)`, [user.id, organization.id]);
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            organizationId: organization.id,
            role: 'owner'
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.status(201).json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
            },
            organization: {
                id: organization.id,
                name: organization.name,
                role: 'owner',
            },
        });
    }
    catch (error) {
        console.error('Signup error:', error.message, error.stack);
        res.status(500).json({ error: 'Failed to create account', details: error.message });
    }
});
// Login
router.post('/login', async (req, res) => {
    const db = pool_1.pool;
    const { email, password } = req.body;
    try {
        // Find user
        const userResult = await db.query(`SELECT id, email, password_hash, first_name, last_name, is_active
       FROM users WHERE email = $1`, [email.toLowerCase()]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const user = userResult.rows[0];
        if (!user.is_active) {
            return res.status(401).json({ error: 'Account disabled' });
        }
        // Verify password
        const validPassword = await bcrypt_1.default.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        // Get user's organizations
        const orgsResult = await db.query(`SELECT om.organization_id, om.role, o.name
       FROM organization_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND om.is_active = true`, [user.id]);
        if (orgsResult.rows.length === 0) {
            return res.status(400).json({ error: 'No organization access' });
        }
        // Use first organization (could add org selection later)
        const org = orgsResult.rows[0];
        // Update last login
        await db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            organizationId: org.organization_id,
            role: org.role
        }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
            },
            organization: {
                id: org.organization_id,
                name: org.name,
                role: org.role,
            },
        });
    }
    catch (error) {
        console.error('Login error:', error.message, error.stack);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
});
// Get current user
router.get('/me', exports.authenticateToken, async (req, res) => {
    const db = pool_1.pool;
    const userId = req.user.userId;
    try {
        const userResult = await db.query('SELECT id, email, first_name, last_name FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        // Get organizations
        const orgsResult = await db.query(`SELECT om.organization_id, om.role, o.name
       FROM organization_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND om.is_active = true`, [userId]);
        res.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
            },
            organizations: orgsResult.rows.map((org) => ({
                id: org.organization_id,
                name: org.name,
                role: org.role,
            })),
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user' });
    }
});
// Update profile
router.put('/profile', exports.authenticateToken, async (req, res) => {
    const db = pool_1.pool;
    const userId = req.user.userId;
    const { firstName, lastName, email } = req.body;
    try {
        // Check if email is already taken by another user
        if (email) {
            const existingUser = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email.toLowerCase(), userId]);
            if (existingUser.rows.length > 0) {
                return res.status(400).json({ error: 'Email already in use' });
            }
        }
        // Update user
        const result = await db.query(`UPDATE users 
       SET first_name = $1, last_name = $2, email = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, first_name, last_name`, [firstName, lastName, email?.toLowerCase(), userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = result.rows[0];
        res.json({
            user: {
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
            },
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile', details: error.message });
    }
});
// Change password
router.put('/change-password', exports.authenticateToken, async (req, res) => {
    const db = pool_1.pool;
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    try {
        // Get current password hash
        const userResult = await db.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userResult.rows[0];
        // Verify current password
        const validPassword = await bcrypt_1.default.compare(currentPassword, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        // Hash new password
        const newPasswordHash = await bcrypt_1.default.hash(newPassword, 10);
        // Update password
        await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newPasswordHash, userId]);
        res.json({ message: 'Password changed successfully' });
    }
    catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Failed to change password', details: error.message });
    }
});
// Get organization details with owner
router.get('/organization', exports.authenticateToken, async (req, res) => {
    const db = pool_1.pool;
    const userId = req.user.userId;
    const organizationId = req.user.organizationId;
    try {
        // Get organization
        const orgResult = await db.query('SELECT id, name, created_at FROM organizations WHERE id = $1', [organizationId]);
        if (orgResult.rows.length === 0) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        const organization = orgResult.rows[0];
        // Get owner
        const ownerResult = await db.query(`SELECT u.email, u.first_name, u.last_name
       FROM organization_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = $1 AND om.role = 'owner' AND om.is_active = true`, [organizationId]);
        const owner = ownerResult.rows[0] || null;
        // Get all members
        const membersResult = await db.query(`SELECT u.id, u.email, u.first_name, u.last_name, om.role, om.joined_at
       FROM organization_members om
       JOIN users u ON u.id = om.user_id
       WHERE om.organization_id = $1 AND om.is_active = true
       ORDER BY om.joined_at DESC`, [organizationId]);
        res.json({
            organization: {
                id: organization.id,
                name: organization.name,
                createdAt: organization.created_at,
            },
            owner: owner ? {
                email: owner.email,
                firstName: owner.first_name,
                lastName: owner.last_name,
            } : null,
            members: membersResult.rows.map((m) => ({
                id: m.id,
                email: m.email,
                firstName: m.first_name,
                lastName: m.last_name,
                role: m.role,
                joinedAt: m.joined_at,
            })),
        });
    }
    catch (error) {
        console.error('Get organization error:', error);
        res.status(500).json({ error: 'Failed to get organization', details: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map