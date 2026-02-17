import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../database/property_manager.db');
const dbDir = dirname(dbPath);

// Create database directory if it doesn't exist
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

console.log('🗄️  Initializing database...');

// Create tables
db.exec(`
  -- Properties table
  CREATE TABLE IF NOT EXISTS properties (
    property_id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_name TEXT NOT NULL,
    owner_email TEXT,
    owner_phone TEXT,
    address TEXT NOT NULL,
    city TEXT,
    state TEXT,
    zip TEXT,
    bedrooms INTEGER,
    bathrooms REAL,
    square_feet INTEGER,
    monthly_rent REAL,
    status TEXT DEFAULT 'Vacant',
    lease_start TEXT,
    lease_end TEXT,
    tenant_name TEXT,
    tenant_phone TEXT,
    date_added TEXT DEFAULT (date('now')),
    management_fee_percent REAL,
    notes TEXT
  );

  -- Maintenance Requests table
  CREATE TABLE IF NOT EXISTS maintenance_requests (
    request_id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_submitted TEXT DEFAULT (date('now')),
    property_id INTEGER,
    address TEXT,
    tenant_name TEXT,
    issue_description TEXT NOT NULL,
    category TEXT,
    priority TEXT DEFAULT 'Standard',
    status TEXT DEFAULT 'Pending',
    assigned_vendor TEXT,
    date_assigned TEXT,
    date_completed TEXT,
    cost REAL,
    owner_approved INTEGER DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (property_id) REFERENCES properties(property_id)
  );

  -- Monthly Revenue table
  CREATE TABLE IF NOT EXISTS monthly_revenue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    properties_under_management INTEGER,
    total_rent_collected REAL,
    management_fees REAL,
    placement_fees REAL,
    renewal_fees REAL,
    maintenance_markup REAL,
    other_fees REAL,
    total_revenue REAL,
    operating_expenses REAL,
    net_profit REAL,
    UNIQUE(month, year)
  );

  -- Vendors table
  CREATE TABLE IF NOT EXISTS vendors (
    vendor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    category TEXT,
    service_area TEXT,
    hourly_rate REAL,
    response_time TEXT,
    insurance_verified INTEGER DEFAULT 0,
    license_number TEXT,
    rating REAL,
    notes TEXT
  );

  -- Client Acquisition table
  CREATE TABLE IF NOT EXISTS client_acquisition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_contacted TEXT DEFAULT (date('now')),
    owner_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    property_address TEXT,
    source TEXT,
    status TEXT DEFAULT 'Lead',
    follow_up_date TEXT,
    notes TEXT
  );

  -- Create indexes for better performance
  CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
  CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_name);
  CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_requests(status);
  CREATE INDEX IF NOT EXISTS idx_maintenance_priority ON maintenance_requests(priority);
  CREATE INDEX IF NOT EXISTS idx_revenue_date ON monthly_revenue(year, month);
`);

console.log('✅ Database schema created successfully!');
console.log(`📁 Database location: ${dbPath}`);

db.close();
