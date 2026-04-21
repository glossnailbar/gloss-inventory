"use strict";
/**
 * Invitations API
 * Manage organization invitations
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const pool_1 = require("../db/pool");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
// Create invitation
router.post('/', auth_1.authenticateToken, async (req, res) => {
    const db = pool_1.pool;
    const { email, role } = req.body;
    const invitedBy = req.user.userId;
    const organizationId = req.user.organizationId;
    try {
        // Validate role
        const validRoles = ['admin', 'manager', 'staff'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        // Check if user is owner or admin
        const memberCheck = await db.query('SELECT role FROM organization_members WHERE user_id = $1 AND organization_id = $2 AND is_active = true', [invitedBy, organizationId]);
        if (memberCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Not a member of this organization' });
        }
        const inviterRole = memberCheck.rows[0].role;
        if (!['owner', 'admin'].includes(inviterRole)) {
            return res.status(403).json({ error: 'Only owners and admins can invite' });
        }
        // Check if user already a member
        const existingMember = await db.query('SELECT id FROM organization_members WHERE user_id = (SELECT id FROM users WHERE email = $1) AND organization_id = $2 AND is_active = true', [email.toLowerCase(), organizationId]);
        if (existingMember.rows.length > 0) {
            return res.status(400).json({ error: 'User is already a member' });
        }
        // Check for existing pending invitation
        const existingInvite = await db.query('SELECT id FROM invitations WHERE email = $1 AND organization_id = $2 AND accepted_at IS NULL AND expires_at > NOW()', [email.toLowerCase(), organizationId]);
        if (existingInvite.rows.length > 0) {
            return res.status(400).json({ error: 'Pending invitation already exists' });
        }
        // Generate token
        const token = crypto_1.default.randomBytes(32).toString('hex');
        // Create invitation (expires in 7 days)
        const result = await db.query(`INSERT INTO invitations (email, organization_id, invited_by, role, token, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days')
       RETURNING id, email, role, token, expires_at, created_at`, [email.toLowerCase(), organizationId, invitedBy, role, token]);
        const invitation = result.rows[0];
        const inviteUrl = `${process.env.CLIENT_URL || 'https://gloss-inventory.vercel.app'}/#/accept-invite?token=${token}`;
        res.status(201).json({
            invitation: {
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                invitedAt: invitation.created_at,
                expiresAt: invitation.expires_at,
            },
            inviteUrl,
        });
    }
    catch (error) {
        console.error('Create invitation error:', error);
        res.status(500).json({ error: 'Failed to create invitation', details: error.message });
    }
});
// List invitations for organization
router.get('/', auth_1.authenticateToken, async (req, res) => {
    const db = pool_1.pool;
    const organizationId = req.user.organizationId;
    try {
        const result = await db.query(`SELECT i.id, i.email, i.role, i.token, i.expires_at, i.accepted_at, i.created_at,
              u.first_name as invited_by_first_name, u.last_name as invited_by_last_name
       FROM invitations i
       JOIN users u ON u.id = i.invited_by
       WHERE i.organization_id = $1
       ORDER BY i.created_at DESC`, [organizationId]);
        res.json({
            invitations: result.rows.map((row) => ({
                id: row.id,
                email: row.email,
                role: row.role,
                invitedAt: row.created_at,
                expiresAt: row.expires_at,
                acceptedAt: row.accepted_at,
                invitedBy: `${row.invited_by_first_name} ${row.invited_by_last_name}`,
            })),
        });
    }
    catch (error) {
        console.error('List invitations error:', error);
        res.status(500).json({ error: 'Failed to list invitations', details: error.message });
    }
});
// Validate invitation token
router.get('/validate', async (req, res) => {
    const db = pool_1.pool;
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token required' });
    }
    try {
        const result = await db.query(`SELECT i.id, i.email, i.role, i.expires_at, i.accepted_at, o.name as organization_name
       FROM invitations i
       JOIN organizations o ON o.id = i.organization_id
       WHERE i.token = $1 AND i.accepted_at IS NULL AND i.expires_at > NOW()`, [token]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired invitation' });
        }
        const invitation = result.rows[0];
        res.json({
            invitation: {
                id: invitation.id,
                email: invitation.email,
                role: invitation.role,
                organizationName: invitation.organization_name,
                expiresAt: invitation.expires_at,
            },
        });
    }
    catch (error) {
        console.error('Validate invitation error:', error);
        res.status(500).json({ error: 'Failed to validate invitation' });
    }
});
// Accept invitation
router.post('/accept', async (req, res) => {
    const db = pool_1.pool;
    const { token, password, firstName, lastName } = req.body;
    try {
        // Find invitation
        const inviteResult = await db.query(`SELECT id, email, organization_id, role, expires_at, accepted_at
       FROM invitations
       WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()`, [token]);
        if (inviteResult.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired invitation' });
        }
        const invitation = inviteResult.rows[0];
        // Check if user already exists
        const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [invitation.email]);
        let userId;
        if (existingUser.rows.length > 0) {
            userId = existingUser.rows[0].id;
        }
        else {
            // Create new user
            const bcrypt = await Promise.resolve().then(() => __importStar(require('bcrypt')));
            const passwordHash = await bcrypt.hash(password, 10);
            const newUser = await db.query(`INSERT INTO users (email, password_hash, first_name, last_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id`, [invitation.email, passwordHash, firstName, lastName]);
            userId = newUser.rows[0].id;
        }
        // Add to organization
        await db.query(`INSERT INTO organization_members (user_id, organization_id, role, invited_at, joined_at, is_active)
       VALUES ($1, $2, $3, $4, NOW(), true)
       ON CONFLICT (user_id, organization_id) DO UPDATE SET
         role = EXCLUDED.role,
         is_active = true,
         joined_at = NOW()`, [userId, invitation.organization_id, invitation.role, invitation.created_at]);
        // Mark invitation as accepted
        await db.query('UPDATE invitations SET accepted_at = NOW() WHERE id = $1', [invitation.id]);
        res.json({ message: 'Invitation accepted successfully' });
    }
    catch (error) {
        console.error('Accept invitation error:', error);
        res.status(500).json({ error: 'Failed to accept invitation', details: error.message });
    }
});
// Cancel/revoke invitation
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    const db = pool_1.pool;
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const userId = req.user.userId;
    try {
        // Check if user can cancel
        const memberCheck = await db.query('SELECT role FROM organization_members WHERE user_id = $1 AND organization_id = $2 AND is_active = true', [userId, organizationId]);
        if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
            return res.status(403).json({ error: 'Only owners and admins can cancel invitations' });
        }
        // Delete invitation
        const result = await db.query('DELETE FROM invitations WHERE id = $1 AND organization_id = $2 RETURNING id', [id, organizationId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invitation not found' });
        }
        res.json({ message: 'Invitation cancelled' });
    }
    catch (error) {
        console.error('Cancel invitation error:', error);
        res.status(500).json({ error: 'Failed to cancel invitation', details: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=invitations.js.map