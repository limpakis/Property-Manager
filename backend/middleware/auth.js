// JWT Authentication Middleware
import jwt from 'jsonwebtoken';
import { getDb } from '../database/schema.js';

const JWT_SECRET = process.env.JWT_SECRET || 'truenorthpm-saas-secret-change-in-production';
const JWT_EXPIRY = '7d';

export function generateToken(user) {
  return jwt.sign(
    { 
      userId: user.user_id, 
      accountId: user.account_id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

// Main auth middleware - requires valid JWT
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please provide a valid token.' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = verifyToken(token);
    
    // Load user and account from DB
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found. Token may be invalid.' });
    }
    
    const account = db.prepare('SELECT * FROM accounts WHERE account_id = ?').get(user.account_id);
    
    if (!account) {
      return res.status(401).json({ error: 'Account not found.' });
    }
    
    // Attach to request
    req.user = user;
    req.account = account;
    req.accountId = account.account_id;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please log in again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }
}

// Role-based authorization middleware
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    
    next();
  };
}

// Check subscription status middleware
export function requireActiveSubscription(req, res, next) {
  if (!req.account) {
    return res.status(401).json({ error: 'Account not found.' });
  }
  
  const { subscription_status, trial_ends_at } = req.account;
  
  // Allow active subscriptions
  if (subscription_status === 'active') {
    return next();
  }
  
  // Allow active trials
  if (subscription_status === 'trial') {
    if (trial_ends_at && new Date(trial_ends_at) > new Date()) {
      return next();
    }
    return res.status(402).json({ 
      error: 'Trial expired. Please subscribe to continue.',
      code: 'TRIAL_EXPIRED'
    });
  }
  
  // Past due - allow with warning
  if (subscription_status === 'past_due') {
    res.setHeader('X-Subscription-Warning', 'past_due');
    return next();
  }
  
  return res.status(402).json({ 
    error: 'Subscription required. Please subscribe to access this feature.',
    code: 'SUBSCRIPTION_REQUIRED'
  });
}

// Check property limit middleware
export function checkPropertyLimit(req, res, next) {
  if (!req.account) {
    return res.status(401).json({ error: 'Account not found.' });
  }
  
  const { property_limit, current_property_count } = req.account;
  
  // -1 means unlimited (enterprise)
  if (property_limit === -1) {
    return next();
  }
  
  if (current_property_count >= property_limit) {
    return res.status(403).json({ 
      error: `Property limit reached (${current_property_count}/${property_limit}). Please upgrade your plan.`,
      code: 'PROPERTY_LIMIT_REACHED',
      current: current_property_count,
      limit: property_limit
    });
  }
  
  next();
}

export default { generateToken, verifyToken, authenticate, authorize, requireActiveSubscription, checkPropertyLimit };
