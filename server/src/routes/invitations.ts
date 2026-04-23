/**
 * Invitations API
 * Manage organization invitations
 */

import { Router } from 'express';
import crypto from 'crypto';
import { pool } from '../db/pool';
import { authenticateToken } from './auth';

const router = Router();

// Create invitation
router.post('/', authenticateToken, async (req: any, res) => {
  const db = pool;
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
    const memberCheck = await db.query(
      'SELECT role FROM organization_members WHERE user_id = $1 AND organization_id = $2 AND is_active = true',
      [invitedBy, organizationId]
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Not a member of this organization' });
    }

    const inviterRole = memberCheck.rows[0].role;
    if (!['owner', 'admin'].includes(inviterRole)) {
      return res.status(403).json({ error: 'Only owners and admins can invite' });
    }

    // Check if user already a member
    const existingMember = await db.query(
      'SELECT id FROM organization_members WHERE user_id = (SELECT id FROM users WHERE email = $1) AND organization_id = $2 AND is_active = true',
      [email.toLowerCase(), organizationId]
    );

    if (existingMember.rows.length > 0) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    // Check for existing pending invitation
    const existingInvite = await db.query(
      'SELECT id FROM invitations WHERE email = $1 AND organization_id = $2 AND accepted_at IS NULL AND expires_at > NOW()',
      [email.toLowerCase(), organizationId]
    );

    if (existingInvite.rows.length > 0) {
      return res.status(400).json({ error: 'Pending invitation already exists' });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');

    // Create invitation (expires in 7 days)
    const result = await db.query(
      `INSERT INTO invitations (email, organization_id, invited_by, role, token, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '7 days')
       RETURNING id, email, role, token, expires_at, created_at`,
      [email.toLowerCase(), organizationId, invitedBy, role, token]
    );

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
  } catch (error: any) {
    console.error('Create invitation error:', error);
    res.status(500).json({ error: 'Failed to create invitation', details: error.message });
  }
});

// List invitations for organization
router.get('/', authenticateToken, async (req: any, res) => {
  const db = pool;
  const organizationId = req.user.organizationId;

  try {
    const result = await db.query(
      `SELECT i.id, i.email, i.role, i.token, i.expires_at, i.accepted_at, i.created_at,
              u.first_name as invited_by_first_name, u.last_name as invited_by_last_name
       FROM invitations i
       JOIN users u ON u.id = i.invited_by
       WHERE i.organization_id = $1
         AND i.accepted_at IS NULL
       ORDER BY i.created_at DESC`,
      [organizationId]
    );

    res.json({
      invitations: result.rows.map((row: any) => ({
        id: row.id,
        email: row.email,
        role: row.role,
        token: row.token,
        invitedAt: row.created_at,
        expiresAt: row.expires_at,
        acceptedAt: row.accepted_at,
        invitedBy: `${row.invited_by_first_name} ${row.invited_by_last_name}`,
      })),
    });
  } catch (error: any) {
    console.error('List invitations error:', error);
    res.status(500).json({ error: 'Failed to list invitations', details: error.message });
  }
});

// Validate invitation token
router.get('/validate', async (req, res) => {
  const db = pool;
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Token required' });
  }

  try {
    const result = await db.query(
      `SELECT i.id, i.email, i.role, i.expires_at, i.accepted_at, o.name as organization_name
       FROM invitations i
       JOIN organizations o ON o.id = i.organization_id
       WHERE i.token = $1 AND i.accepted_at IS NULL AND i.expires_at > NOW()`,
      [token]
    );

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
  } catch (error: any) {
    console.error('Validate invitation error:', error);
    res.status(500).json({ error: 'Failed to validate invitation' });
  }
});

// Accept invitation
router.post('/accept', async (req, res) => {
  const db = pool;
  const { token, password, firstName, lastName } = req.body;

  try {
    // Find invitation
    const inviteResult = await db.query(
      `SELECT id, email, organization_id, role, expires_at, accepted_at
       FROM invitations
       WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired invitation' });
    }

    const invitation = inviteResult.rows[0];

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id, first_name, last_name, email FROM users WHERE email = $1',
      [invitation.email]
    );

    let userId;
    let userData;

    if (existingUser.rows.length > 0) {
      userId = existingUser.rows[0].id;
      userData = existingUser.rows[0];
    } else {
      // Create new user
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash(password, 10);

      const newUser = await db.query(
        `INSERT INTO users (email, password_hash, first_name, last_name)
         VALUES ($1, $2, $3, $4)
         RETURNING id, first_name, last_name, email`,
        [invitation.email, passwordHash, firstName, lastName]
      );

      userId = newUser.rows[0].id;
      userData = newUser.rows[0];
    }

    // Add to organization
    await db.query(
      `INSERT INTO organization_members (user_id, organization_id, role, invited_at, joined_at, is_active)
       VALUES ($1, $2, $3, $4, NOW(), true)
       ON CONFLICT (user_id, organization_id) DO UPDATE SET
         role = EXCLUDED.role,
         is_active = true,
         joined_at = NOW()`,
      [userId, invitation.organization_id, invitation.role, invitation.created_at]
    );

    // Mark invitation as accepted
    await db.query(
      'UPDATE invitations SET accepted_at = NOW() WHERE id = $1',
      [invitation.id]
    );

    // Generate JWT for the invited organization
    const jwt = await import('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const authToken = jwt.default.sign(
      { 
        userId: userId, 
        email: userData.email,
        organizationId: invitation.organization_id,
        role: invitation.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Get organization name
    const orgResult = await db.query(
      'SELECT name FROM organizations WHERE id = $1',
      [invitation.organization_id]
    );

    res.json({ 
      message: 'Invitation accepted successfully',
      token: authToken,
      user: {
        id: userId,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
      },
      organization: {
        id: invitation.organization_id,
        name: orgResult.rows[0]?.name || 'Organization',
        role: invitation.role,
      }
    });
  } catch (error: any) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ error: 'Failed to accept invitation', details: error.message });
  }
});

// Cancel/revoke invitation
router.delete('/:id', authenticateToken, async (req: any, res) => {
  const db = pool;
  const { id } = req.params;
  const organizationId = req.user.organizationId;
  const userId = req.user.userId;

  try {
    // Check if user can cancel
    const memberCheck = await db.query(
      'SELECT role FROM organization_members WHERE user_id = $1 AND organization_id = $2 AND is_active = true',
      [userId, organizationId]
    );

    if (memberCheck.rows.length === 0 || !['owner', 'admin'].includes(memberCheck.rows[0].role)) {
      return res.status(403).json({ error: 'Only owners and admins can cancel invitations' });
    }

    // Delete invitation
    const result = await db.query(
      'DELETE FROM invitations WHERE id = $1 AND organization_id = $2 RETURNING id',
      [id, organizationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    res.json({ message: 'Invitation cancelled' });
  } catch (error: any) {
    console.error('Cancel invitation error:', error);
    res.status(500).json({ error: 'Failed to cancel invitation', details: error.message });
  }
});

export default router;
