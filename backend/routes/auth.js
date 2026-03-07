// Authentication Routes - Register, Login, Profile
import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/schema.js';
import { generateToken, authenticate } from '../middleware/auth.js';
import { SUBSCRIPTION_TIERS } from '../database/schema.js';

const router = express.Router();

// POST /api/auth/register - Create new account + admin user
router.post('/register', async (req, res) => {
  try {
    const { email, password, full_name, company_name } = req.body;
    
    if (!email || !password || !company_name) {
      return res.status(400).json({ error: 'Email, password, and company name are required.' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    
    const db = getDb();
    
    // Check if email already exists
    const existingUser = db.prepare('SELECT user_id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);
    
    // Create account
    const account_id = `ACC${uuidv4().split('-')[0].toUpperCase()}`;
    const user_id = `USR${uuidv4().split('-')[0].toUpperCase()}`;
    
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial
    
    const insertAccount = db.prepare(`
      INSERT INTO accounts (account_id, company_name, subscription_tier, subscription_status, trial_ends_at, property_limit, current_property_count)
      VALUES (?, ?, 'starter', 'trial', ?, 10, 0)
    `);
    
    const insertUser = db.prepare(`
      INSERT INTO users (user_id, account_id, email, password_hash, full_name, role, is_account_owner)
      VALUES (?, ?, ?, ?, ?, 'admin', 1)
    `);
    
    const transaction = db.transaction(() => {
      insertAccount.run(account_id, company_name, trialEndsAt.toISOString());
      insertUser.run(user_id, account_id, email.toLowerCase(), password_hash, full_name || '');
    });
    
    transaction();
    
    // Generate token
    const token = generateToken({ user_id, account_id, email: email.toLowerCase(), role: 'admin' });
    
    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        user_id,
        email: email.toLowerCase(),
        full_name: full_name || '',
        role: 'admin',
      },
      account: {
        account_id,
        company_name,
        subscription_tier: 'starter',
        subscription_status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
        property_limit: 10,
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    
    const db = getDb();
    
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    
    // Update last login
    db.prepare('UPDATE users SET last_login = ? WHERE user_id = ?').run(new Date().toISOString(), user.user_id);
    
    // Get account info
    const account = db.prepare('SELECT * FROM accounts WHERE account_id = ?').get(user.account_id);
    
    const token = generateToken(user);
    
    res.json({
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
      account: {
        account_id: account.account_id,
        company_name: account.company_name,
        subscription_tier: account.subscription_tier,
        subscription_status: account.subscription_status,
        trial_ends_at: account.trial_ends_at,
        property_limit: account.property_limit,
        current_property_count: account.current_property_count,
        white_label_enabled: account.white_label_enabled,
        logo_url: account.logo_url,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me - Get current user profile
router.get('/me', authenticate, (req, res) => {
  const db = getDb();
  const account = db.prepare('SELECT * FROM accounts WHERE account_id = ?').get(req.accountId);
  const tierInfo = SUBSCRIPTION_TIERS[account.subscription_tier] || SUBSCRIPTION_TIERS.starter;
  
  res.json({
    user: {
      user_id: req.user.user_id,
      email: req.user.email,
      full_name: req.user.full_name,
      role: req.user.role,
      is_account_owner: req.user.is_account_owner,
      last_login: req.user.last_login,
    },
    account: {
      account_id: account.account_id,
      company_name: account.company_name,
      subscription_tier: account.subscription_tier,
      subscription_status: account.subscription_status,
      trial_ends_at: account.trial_ends_at,
      subscription_started_at: account.subscription_started_at,
      property_limit: account.property_limit,
      current_property_count: account.current_property_count,
      white_label_enabled: account.white_label_enabled,
      logo_url: account.logo_url,
    },
    tier: {
      name: tierInfo.name,
      property_limit: tierInfo.property_limit,
      user_limit: tierInfo.user_limit,
      features: tierInfo.features,
      price_monthly: tierInfo.price_monthly,
      price_annual: tierInfo.price_annual,
    }
  });
});

// PUT /api/auth/profile - Update user profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { full_name, email, current_password, new_password } = req.body;
    const db = getDb();
    
    // If changing password, verify current one
    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ error: 'Current password is required to change password.' });
      }
      
      const validPassword = await bcrypt.compare(current_password, req.user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }
      
      if (new_password.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters.' });
      }
      
      const salt = await bcrypt.genSalt(12);
      const password_hash = await bcrypt.hash(new_password, salt);
      db.prepare('UPDATE users SET password_hash = ? WHERE user_id = ?').run(password_hash, req.user.user_id);
    }
    
    // Update name and email
    if (full_name !== undefined || email !== undefined) {
      const updates = [];
      const values = [];
      
      if (full_name !== undefined) {
        updates.push('full_name = ?');
        values.push(full_name);
      }
      if (email !== undefined) {
        // Check email uniqueness
        const existing = db.prepare('SELECT user_id FROM users WHERE email = ? AND user_id != ?').get(email.toLowerCase(), req.user.user_id);
        if (existing) {
          return res.status(409).json({ error: 'Email already in use.' });
        }
        updates.push('email = ?');
        values.push(email.toLowerCase());
      }
      
      if (updates.length > 0) {
        values.push(req.user.user_id);
        db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`).run(...values);
      }
    }
    
    const updatedUser = db.prepare('SELECT user_id, email, full_name, role FROM users WHERE user_id = ?').get(req.user.user_id);
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// POST /api/auth/invite - Invite a team member
router.post('/invite', authenticate, async (req, res) => {
  try {
    const { email, full_name, role } = req.body;
    
    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required.' });
    }
    
    if (!['admin', 'manager', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin, manager, or viewer.' });
    }
    
    // Only admin can invite
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can invite team members.' });
    }
    
    const db = getDb();
    
    // Check user limit based on tier
    const account = db.prepare('SELECT * FROM accounts WHERE account_id = ?').get(req.accountId);
    const tierInfo = SUBSCRIPTION_TIERS[account.subscription_tier] || SUBSCRIPTION_TIERS.starter;
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE account_id = ?').get(req.accountId).count;
    
    if (tierInfo.user_limit !== -1 && userCount >= tierInfo.user_limit) {
      return res.status(403).json({ 
        error: `User limit reached (${userCount}/${tierInfo.user_limit}). Upgrade your plan to add more team members.`,
        code: 'USER_LIMIT_REACHED'
      });
    }
    
    // Check if email already exists
    const existingUser = db.prepare('SELECT user_id FROM users WHERE email = ?').get(email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    
    // Create user with temporary password
    const tempPassword = uuidv4().split('-')[0];
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(tempPassword, salt);
    
    const user_id = `USR${uuidv4().split('-')[0].toUpperCase()}`;
    
    db.prepare(`
      INSERT INTO users (user_id, account_id, email, password_hash, full_name, role, is_account_owner)
      VALUES (?, ?, ?, ?, ?, ?, 0)
    `).run(user_id, req.accountId, email.toLowerCase(), password_hash, full_name || '', role);
    
    res.status(201).json({
      message: 'Team member invited successfully',
      user: { user_id, email: email.toLowerCase(), full_name: full_name || '', role },
      // In production, send this via email instead of exposing it
      temp_password: tempPassword,
    });
  } catch (error) {
    console.error('Invite error:', error);
    res.status(500).json({ error: 'Failed to invite team member.' });
  }
});

// GET /api/auth/team - Get team members
router.get('/team', authenticate, (req, res) => {
  const db = getDb();
  const users = db.prepare(
    'SELECT user_id, email, full_name, role, is_account_owner, last_login, created_at FROM users WHERE account_id = ?'
  ).all(req.accountId);
  
  res.json(users);
});

// DELETE /api/auth/team/:userId - Remove team member
router.delete('/team/:userId', authenticate, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can remove team members.' });
  }
  
  const db = getDb();
  const targetUser = db.prepare('SELECT * FROM users WHERE user_id = ? AND account_id = ?').get(req.params.userId, req.accountId);
  
  if (!targetUser) {
    return res.status(404).json({ error: 'User not found.' });
  }
  
  if (targetUser.is_account_owner) {
    return res.status(403).json({ error: 'Cannot remove the account owner.' });
  }
  
  db.prepare('DELETE FROM users WHERE user_id = ? AND account_id = ?').run(req.params.userId, req.accountId);
  
  res.json({ message: 'Team member removed successfully.' });
});

export default router;
