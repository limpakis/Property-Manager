// Database schema and initialization for multi-tenant SaaS
import Database from 'better-sqlite3';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = process.env.DATABASE_PATH || join(__dirname, '../data/property_manager.db');

// Ensure directory exists
const dbDir = dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function initializeDatabase() {
  const db = getDb();

  db.exec(`
    -- Accounts (Organizations/Property Management Companies)
    CREATE TABLE IF NOT EXISTS accounts (
      account_id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      subscription_tier TEXT CHECK(subscription_tier IN ('starter', 'professional', 'enterprise')) DEFAULT 'starter',
      subscription_status TEXT CHECK(subscription_status IN ('trial', 'active', 'past_due', 'canceled')) DEFAULT 'trial',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      trial_ends_at DATETIME,
      subscription_started_at DATETIME,
      property_limit INTEGER DEFAULT 10,
      current_property_count INTEGER DEFAULT 0,
      custom_domain TEXT,
      white_label_enabled BOOLEAN DEFAULT 0,
      logo_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Users (Property Managers using the platform)
    CREATE TABLE IF NOT EXISTS users (
      user_id TEXT PRIMARY KEY,
      account_id TEXT REFERENCES accounts(account_id) ON DELETE CASCADE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role TEXT CHECK(role IN ('admin', 'manager', 'viewer')) DEFAULT 'admin',
      is_account_owner BOOLEAN DEFAULT 0,
      last_login DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Properties (with account_id for data isolation)
    CREATE TABLE IF NOT EXISTS properties (
      property_id TEXT PRIMARY KEY,
      account_id TEXT REFERENCES accounts(account_id) ON DELETE CASCADE,
      owner_name TEXT,
      owner_email TEXT,
      owner_phone TEXT,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      zip TEXT,
      bedrooms INTEGER,
      bathrooms REAL,
      square_feet INTEGER,
      monthly_rent REAL,
      status TEXT DEFAULT 'Active',
      property_type TEXT DEFAULT 'Single Unit',
      units TEXT, -- JSON for multi-unit
      lease_start TEXT,
      lease_end TEXT,
      tenant_name TEXT,
      tenant_phone TEXT,
      management_fee_percent REAL DEFAULT 10,
      notes TEXT,
      date_added DATE DEFAULT (date('now')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Tenants (with account_id)
    CREATE TABLE IF NOT EXISTS tenants (
      tenant_id TEXT PRIMARY KEY,
      account_id TEXT REFERENCES accounts(account_id) ON DELETE CASCADE,
      property_id TEXT REFERENCES properties(property_id) ON DELETE SET NULL,
      tenant_name TEXT,
      email TEXT,
      phone TEXT,
      lease_start DATE,
      lease_end DATE,
      monthly_rent REAL,
      security_deposit REAL,
      status TEXT DEFAULT 'Active',
      notes TEXT,
      portal_token TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Maintenance Requests (with account_id)
    CREATE TABLE IF NOT EXISTS maintenance_requests (
      request_id TEXT PRIMARY KEY,
      account_id TEXT REFERENCES accounts(account_id) ON DELETE CASCADE,
      property_id TEXT REFERENCES properties(property_id) ON DELETE SET NULL,
      tenant_name TEXT,
      address TEXT,
      issue_description TEXT,
      category TEXT,
      priority TEXT,
      status TEXT DEFAULT 'Pending',
      assigned_vendor TEXT,
      date_submitted DATE DEFAULT (date('now')),
      date_assigned DATE,
      date_completed DATE,
      cost REAL,
      owner_approved TEXT DEFAULT 'Pending',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Vendors (with account_id)
    CREATE TABLE IF NOT EXISTS vendors (
      vendor_id TEXT PRIMARY KEY,
      account_id TEXT REFERENCES accounts(account_id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      contact_name TEXT,
      phone TEXT,
      email TEXT,
      category TEXT,
      service_area TEXT,
      hourly_rate REAL,
      response_time TEXT,
      insurance_verified TEXT DEFAULT 'No',
      license_number TEXT,
      rating REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Payments (with account_id)
    CREATE TABLE IF NOT EXISTS payments (
      payment_id TEXT PRIMARY KEY,
      account_id TEXT REFERENCES accounts(account_id) ON DELETE CASCADE,
      tenant_id TEXT,
      property_id TEXT,
      amount REAL,
      transaction_fee REAL,
      net_amount REAL,
      payment_method TEXT,
      status TEXT DEFAULT 'Pending',
      stripe_payment_intent_id TEXT,
      date_created DATETIME DEFAULT CURRENT_TIMESTAMP,
      date_completed DATETIME,
      notes TEXT
    );

    -- Documents (with account_id)
    CREATE TABLE IF NOT EXISTS documents (
      document_id TEXT PRIMARY KEY,
      account_id TEXT REFERENCES accounts(account_id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      original_name TEXT,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      file_type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Usage Logs (subscription tracking)
    CREATE TABLE IF NOT EXISTS usage_logs (
      log_id TEXT PRIMARY KEY,
      account_id TEXT REFERENCES accounts(account_id) ON DELETE CASCADE,
      metric_type TEXT,
      metric_value INTEGER,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Revenue tracking (financial data per account)
    CREATE TABLE IF NOT EXISTS revenue_entries (
      entry_id TEXT PRIMARY KEY,
      account_id TEXT REFERENCES accounts(account_id) ON DELETE CASCADE,
      month TEXT,
      year TEXT,
      properties_under_management INTEGER,
      total_revenue REAL,
      management_fees REAL,
      maintenance_costs REAL,
      net_profit REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Expenses (standalone expense tracking beyond maintenance)
    CREATE TABLE IF NOT EXISTS expenses (
      expense_id TEXT PRIMARY KEY,
      account_id TEXT REFERENCES accounts(account_id) ON DELETE CASCADE,
      property_id TEXT REFERENCES properties(property_id) ON DELETE SET NULL,
      category TEXT NOT NULL CHECK(category IN ('Insurance', 'Property Tax', 'Utilities', 'Repairs', 'Mortgage', 'HOA Fees', 'Legal', 'Marketing', 'Management Fee', 'Landscaping', 'Cleaning', 'Other')),
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      recurring INTEGER DEFAULT 0,
      recurring_frequency TEXT CHECK(recurring_frequency IN ('monthly', 'quarterly', 'annually', NULL)),
      vendor_name TEXT,
      receipt_url TEXT,
      tax_deductible INTEGER DEFAULT 1,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Rent ledger (track expected vs actual rent per month per property)
    CREATE TABLE IF NOT EXISTS rent_ledger (
      ledger_id TEXT PRIMARY KEY,
      account_id TEXT REFERENCES accounts(account_id) ON DELETE CASCADE,
      property_id TEXT REFERENCES properties(property_id) ON DELETE CASCADE,
      tenant_name TEXT,
      month TEXT NOT NULL,
      year TEXT NOT NULL,
      amount_due REAL NOT NULL,
      amount_paid REAL DEFAULT 0,
      date_paid TEXT,
      status TEXT DEFAULT 'Unpaid' CHECK(status IN ('Paid', 'Partial', 'Unpaid', 'Late', 'Waived')),
      late_fee REAL DEFAULT 0,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for performance
    CREATE INDEX IF NOT EXISTS idx_properties_account ON properties(account_id);
    CREATE INDEX IF NOT EXISTS idx_tenants_account ON tenants(account_id);
    CREATE INDEX IF NOT EXISTS idx_maintenance_account ON maintenance_requests(account_id);
    CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);
    CREATE INDEX IF NOT EXISTS idx_vendors_account ON vendors(account_id);
    CREATE INDEX IF NOT EXISTS idx_documents_account ON documents(account_id);
    CREATE INDEX IF NOT EXISTS idx_users_account ON users(account_id);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_usage_logs_account ON usage_logs(account_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_account ON expenses(account_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_property ON expenses(property_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_rent_ledger_account ON rent_ledger(account_id);
    CREATE INDEX IF NOT EXISTS idx_rent_ledger_property ON rent_ledger(property_id);
    CREATE INDEX IF NOT EXISTS idx_rent_ledger_month_year ON rent_ledger(month, year);
  `);

  console.log('✅ Database schema initialized');

  // Run migrations for existing databases (idempotent)
  const migrations = [
    `ALTER TABLE tenants ADD COLUMN notes TEXT`,
    `ALTER TABLE tenants ADD COLUMN portal_token TEXT`,
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch (_) { /* column already exists */ }
  }

  return db;
}

// Subscription tier configurations
export const SUBSCRIPTION_TIERS = {
  starter: {
    name: 'Starter',
    price_monthly: 4900, // in cents
    price_annual: 47040,  // 49*12*0.8 = $470.40/year
    property_limit: 10,
    user_limit: 2,
    features: ['properties', 'tenants', 'maintenance', 'payments', 'documents', 'reports'],
    white_label: false,
  },
  professional: {
    name: 'Professional',
    price_monthly: 9900,
    price_annual: 95040,  // 99*12*0.8
    property_limit: 50,
    user_limit: 10,
    features: ['properties', 'tenants', 'maintenance', 'payments', 'documents', 'reports', 'api_access', 'priority_support'],
    white_label: false,
  },
  enterprise: {
    name: 'Enterprise',
    price_monthly: 29900,
    price_annual: 287040,  // 299*12*0.8
    property_limit: -1, // unlimited
    user_limit: -1,
    features: ['properties', 'tenants', 'maintenance', 'payments', 'documents', 'reports', 'api_access', 'priority_support', 'white_label', 'custom_domain', 'dedicated_support'],
    white_label: true,
  },
};

export default { getDb, initializeDatabase, SUBSCRIPTION_TIERS };
