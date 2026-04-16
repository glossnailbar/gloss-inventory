/**
 * Auth Routes - User authentication and organization management
 */

import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../db/pool';

const router = Router();

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

// Middleware to verify JWT
export const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Sign up
router.post('/signup', async (req, res) => {
  console.log('Signup request received:', req.body);
  const db = pool;
  const { email, password, firstName, lastName, organizationName } = req.body;

  try {
    console.log('Starting signup for email:', email);
    // Check if user exists
    console.log('Checking if user exists...');
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    console.log('Existing user check complete:', existingUser.rows.length);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    console.log('Hashing password...');
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('Password hashed successfully');

    // Create user
    console.log('Creating user...');
    const userResult = await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, first_name, last_name, created_at`,
      [email.toLowerCase(), passwordHash, firstName, lastName]
    );

    const user = userResult.rows[0];

    // Create organization
    const orgResult = await db.query(
      `INSERT INTO organizations (name, created_at, updated_at)
       VALUES ($1, NOW(), NOW())
       RETURNING *`,
      [organizationName || `${firstName}'s Organization`]
    );

    const organization = orgResult.rows[0];

    // Add user as owner
    await db.query(
      `INSERT INTO organization_members (user_id, organization_id, role, joined_at, is_active)
       VALUES ($1, $2, 'owner', NOW(), true)`,
      [user.id, organization.id]
    );

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        organizationId: organization.id,
        role: 'owner'
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

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
  } catch (error: any) {
    console.error('Signup error:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to create account', details: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const db = pool;
  const { email, password } = req.body;

  try {
    // Find user
    const userResult = await db.query(
      `SELECT id, email, password_hash, first_name, last_name, is_active
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account disabled' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user's organizations
    const orgsResult = await db.query(
      `SELECT om.organization_id, om.role, o.name
       FROM organization_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND om.is_active = true`,
      [user.id]
    );

    if (orgsResult.rows.length === 0) {
      return res.status(400).json({ error: 'No organization access' });
    }

    // Use first organization (could add org selection later)
    const org = orgsResult.rows[0];

    // Update last login
    await db.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        organizationId: org.organization_id,
        role: org.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

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
  } catch (error: any) {
    console.error('Login error:', error.message, error.stack);
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: any, res) => {
  const db = pool;
  const userId = req.user.userId;

  try {
    const userResult = await db.query(
      'SELECT id, email, first_name, last_name FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get organizations
    const orgsResult = await db.query(
      `SELECT om.organization_id, om.role, o.name
       FROM organization_members om
       JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = $1 AND om.is_active = true`,
      [userId]
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      organizations: orgsResult.rows.map((org: any) => ({
        id: org.organization_id,
        name: org.name,
        role: org.role,
      })),
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
