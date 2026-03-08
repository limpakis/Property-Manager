// Subscription Management Routes
import express from 'express';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { getDb, SUBSCRIPTION_TIERS } from '../database/schema.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Lazy-init Stripe to ensure env vars are loaded
let _stripe;
function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');
  }
  return _stripe;
}

// GET /api/subscription - Get current subscription info
router.get('/', authenticate, (req, res) => {
  const db = getDb();
  const account = db.prepare('SELECT * FROM accounts WHERE account_id = ?').get(req.accountId);
  const tierInfo = SUBSCRIPTION_TIERS[account.subscription_tier] || SUBSCRIPTION_TIERS.starter;
  
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE account_id = ?').get(req.accountId).count;
  
  res.json({
    account_id: account.account_id,
    company_name: account.company_name,
    subscription: {
      tier: account.subscription_tier,
      status: account.subscription_status,
      trial_ends_at: account.trial_ends_at,
      started_at: account.subscription_started_at,
      stripe_subscription_id: account.stripe_subscription_id,
    },
    usage: {
      properties: { current: account.current_property_count, limit: account.property_limit },
      users: { current: userCount, limit: tierInfo.user_limit },
    },
    tier_info: tierInfo,
    all_tiers: SUBSCRIPTION_TIERS,
  });
});

// POST /api/subscription/create-checkout - Create Stripe checkout for subscription
router.post('/create-checkout', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { tier, billing_period } = req.body; // tier: 'starter'|'professional'|'enterprise', billing_period: 'monthly'|'annual'
    
    if (!tier || !SUBSCRIPTION_TIERS[tier]) {
      return res.status(400).json({ error: 'Invalid subscription tier.' });
    }
    
    if (!['monthly', 'annual'].includes(billing_period)) {
      return res.status(400).json({ error: 'Billing period must be monthly or annual.' });
    }
    
    const tierInfo = SUBSCRIPTION_TIERS[tier];
    const price = billing_period === 'annual' ? tierInfo.price_annual : tierInfo.price_monthly;
    
    const db = getDb();
    const account = db.prepare('SELECT * FROM accounts WHERE account_id = ?').get(req.accountId);
    
    // Create or retrieve Stripe customer
    let customerId = account.stripe_customer_id;
    if (!customerId) {
      const customer = await getStripe().customers.create({
        email: req.user.email,
        name: account.company_name,
        metadata: { account_id: req.accountId },
      });
      customerId = customer.id;
      db.prepare('UPDATE accounts SET stripe_customer_id = ? WHERE account_id = ?').run(customerId, req.accountId);
    }
    
    // Create checkout session for subscription
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `TrueNorth PM ${tierInfo.name} Plan`,
            description: `${billing_period === 'annual' ? 'Annual' : 'Monthly'} subscription - ${tierInfo.property_limit === -1 ? 'Unlimited' : tierInfo.property_limit} properties`,
          },
          unit_amount: price,
          recurring: {
            interval: billing_period === 'annual' ? 'year' : 'month',
          },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings/subscription?canceled=true`,
      metadata: {
        account_id: req.accountId,
        tier,
        billing_period,
      },
    });
    
    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Subscription checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session.' });
  }
});

// POST /api/subscription/portal - Open Stripe customer portal for managing subscription
router.post('/portal', authenticate, authorize('admin'), async (req, res) => {
  try {
    const db = getDb();
    const account = db.prepare('SELECT stripe_customer_id FROM accounts WHERE account_id = ?').get(req.accountId);
    
    if (!account.stripe_customer_id) {
      return res.status(400).json({ error: 'No active subscription found.' });
    }
    
    const session = await getStripe().billingPortal.sessions.create({
      customer: account.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings/subscription`,
    });
    
    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal error:', error);
    res.status(500).json({ error: 'Failed to create portal session.' });
  }
});

// POST /api/subscription/webhook - Stripe subscription webhooks
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;
  
  try {
    let event;
    
    if (webhookSecret && sig) {
      event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }
    
    const db = getDb();
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'subscription') {
          const { account_id, tier, billing_period } = session.metadata;
          const tierInfo = SUBSCRIPTION_TIERS[tier];
          
          db.prepare(`
            UPDATE accounts 
            SET subscription_tier = ?, 
                subscription_status = 'active', 
                stripe_subscription_id = ?,
                subscription_started_at = ?,
                property_limit = ?,
                updated_at = ?
            WHERE account_id = ?
          `).run(
            tier,
            session.subscription,
            new Date().toISOString(),
            tierInfo.property_limit,
            new Date().toISOString(),
            account_id
          );
          
          // Log usage
          db.prepare('INSERT INTO usage_logs (log_id, account_id, metric_type, metric_value) VALUES (?, ?, ?, ?)').run(
            `LOG${uuidv4().split('-')[0].toUpperCase()}`, account_id, 'subscription_activated', 1
          );
          
          console.log(`✅ Subscription activated: ${account_id} -> ${tier}`);
        }
        break;
      }
      
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        const account = db.prepare('SELECT * FROM accounts WHERE stripe_customer_id = ?').get(customerId);
        if (account) {
          const status = subscription.status === 'active' ? 'active' : 
                         subscription.status === 'past_due' ? 'past_due' : 
                         subscription.status === 'canceled' ? 'canceled' : account.subscription_status;
          
          db.prepare('UPDATE accounts SET subscription_status = ?, updated_at = ? WHERE account_id = ?').run(
            status, new Date().toISOString(), account.account_id
          );
          
          console.log(`📝 Subscription updated: ${account.account_id} -> ${status}`);
        }
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        const account = db.prepare('SELECT * FROM accounts WHERE stripe_customer_id = ?').get(customerId);
        if (account) {
          db.prepare(`
            UPDATE accounts 
            SET subscription_status = 'canceled', 
                stripe_subscription_id = NULL,
                updated_at = ?
            WHERE account_id = ?
          `).run(new Date().toISOString(), account.account_id);
          
          console.log(`❌ Subscription canceled: ${account.account_id}`);
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        const account = db.prepare('SELECT * FROM accounts WHERE stripe_customer_id = ?').get(customerId);
        if (account) {
          db.prepare('UPDATE accounts SET subscription_status = \'past_due\', updated_at = ? WHERE account_id = ?').run(
            new Date().toISOString(), account.account_id
          );
          console.log(`⚠️ Payment failed: ${account.account_id}`);
        }
        break;
      }
      
      default:
        console.log(`Unhandled subscription event: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Subscription webhook error:', error);
    res.status(400).json({ error: error.message });
  }
});

export default router;
