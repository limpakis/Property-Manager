// Migration Script: CSV files -> SQLite database
// Usage: node scripts/migrateCSV.js [account_id]
// If no account_id provided, creates a default account and imports all CSV data into it.

import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { initializeDatabase, getDb } from '../database/schema.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const trackingPath = join(__dirname, '../../tracking');
const financialsPath = join(__dirname, '../../financials');

// Parse CSV text to array of objects
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values = [];
    let currentValue = '';
    let insideQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        if (insideQuotes && line[j + 1] === '"') {
          currentValue += '"';
          j++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());
    
    const obj = {};
    headers.forEach((header, index) => {
      let value = values[index] ? values[index].trim() : '';
      if (header === 'Units' && value && (value.startsWith('[') || value.startsWith('{"'))) {
        try { obj[header] = JSON.parse(value); } catch { obj[header] = []; }
      } else {
        obj[header] = value;
      }
    });
    data.push(obj);
  }
  
  return data;
}

function readCSV(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    return parseCSV(fs.readFileSync(filePath, 'utf8'));
  } catch { return []; }
}

async function migrate() {
  console.log('🔄 Starting CSV -> SQLite migration...\n');
  
  // Initialize database
  const db = initializeDatabase();
  
  // Create default account
  const accountId = process.argv[2] || `ACC${uuidv4().split('-')[0].toUpperCase()}`;
  const companyName = process.argv[3] || 'TrueNorth PM';
  
  // Check if account exists
  const existingAccount = db.prepare('SELECT account_id FROM accounts WHERE account_id = ?').get(accountId);
  
  if (!existingAccount) {
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 14);
    
    db.prepare(`
      INSERT INTO accounts (account_id, company_name, subscription_tier, subscription_status, trial_ends_at, property_limit)
      VALUES (?, ?, 'starter', 'trial', ?, 10)
    `).run(accountId, companyName, trialEnds.toISOString());
    
    console.log(`✅ Created account: ${accountId} (${companyName})`);
    
    // Create default admin user
    const userId = `USR${uuidv4().split('-')[0].toUpperCase()}`;
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash('admin123', salt);
    
    db.prepare(`
      INSERT INTO users (user_id, account_id, email, password_hash, full_name, role, is_account_owner)
      VALUES (?, ?, 'admin@truenorthpm.com', ?, 'Admin User', 'admin', 1)
    `).run(userId, accountId, passwordHash);
    
    console.log(`✅ Created admin user: admin@truenorthpm.com / admin123`);
  } else {
    console.log(`📌 Using existing account: ${accountId}`);
  }
  
  // ---- Migrate Properties ----
  const properties = readCSV(join(trackingPath, 'properties.csv'));
  console.log(`\n📂 Found ${properties.length} properties to migrate...`);
  
  const insertProperty = db.prepare(`
    INSERT OR IGNORE INTO properties (property_id, account_id, owner_name, owner_email, owner_phone, address, city, state, zip, bedrooms, bathrooms, square_feet, monthly_rent, status, property_type, units, lease_start, lease_end, tenant_name, tenant_phone, management_fee_percent, notes, date_added)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let propCount = 0;
  for (const p of properties) {
    try {
      const unitsJson = p.Units && Array.isArray(p.Units) ? JSON.stringify(p.Units) : (p.Units || null);
      insertProperty.run(
        p.Property_ID || `PROP${uuidv4().split('-')[0].toUpperCase()}`,
        accountId,
        p.Owner_Name || '', p.Owner_Email || '', p.Owner_Phone || '',
        p.Address || '', p.City || '', p.State || '', p.Zip || '',
        p.Bedrooms ? parseInt(p.Bedrooms) : null,
        p.Bathrooms ? parseFloat(p.Bathrooms) : null,
        p.Square_Feet ? parseInt(p.Square_Feet) : null,
        p.Monthly_Rent ? parseFloat(p.Monthly_Rent) : null,
        p.Status || 'Active', p.Property_Type || 'Single Unit',
        unitsJson,
        p.Lease_Start || '', p.Lease_End || '',
        p.Tenant_Name || '', p.Tenant_Phone || '',
        p.Management_Fee_Percent ? parseFloat(p.Management_Fee_Percent) : 10,
        p.Notes || '',
        p.Date_Added || new Date().toISOString().split('T')[0]
      );
      propCount++;
    } catch (e) {
      console.log(`  ⚠️ Skipped property ${p.Property_ID}: ${e.message}`);
    }
  }
  console.log(`  ✅ Migrated ${propCount} properties`);
  
  // Update property count
  db.prepare('UPDATE accounts SET current_property_count = ? WHERE account_id = ?').run(propCount, accountId);
  
  // ---- Migrate Maintenance Requests ----
  const maintenance = readCSV(join(trackingPath, 'maintenance-requests.csv'));
  console.log(`\n📂 Found ${maintenance.length} maintenance requests to migrate...`);
  
  const insertMaintenance = db.prepare(`
    INSERT OR IGNORE INTO maintenance_requests (request_id, account_id, property_id, address, tenant_name, issue_description, category, priority, status, assigned_vendor, date_submitted, date_assigned, date_completed, cost, owner_approved, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let mrCount = 0;
  for (const m of maintenance) {
    try {
      insertMaintenance.run(
        m.Request_ID || `MR${uuidv4().split('-')[0].toUpperCase()}`,
        accountId,
        m.Property_ID || '', m.Address || '', m.Tenant_Name || '',
        m.Issue_Description || '', m.Category || 'Other',
        m.Priority || 'Medium', m.Status || 'Pending',
        m.Assigned_Vendor || '', m.Date_Submitted || '',
        m.Date_Assigned || '', m.Date_Completed || '',
        m.Cost ? parseFloat(m.Cost) : null,
        m.Owner_Approved || 'Pending', m.Notes || ''
      );
      mrCount++;
    } catch (e) {
      console.log(`  ⚠️ Skipped maintenance ${m.Request_ID}: ${e.message}`);
    }
  }
  console.log(`  ✅ Migrated ${mrCount} maintenance requests`);
  
  // ---- Migrate Vendors ----
  const vendors = readCSV(join(trackingPath, 'vendor-database.csv'));
  console.log(`\n📂 Found ${vendors.length} vendors to migrate...`);
  
  const insertVendor = db.prepare(`
    INSERT OR IGNORE INTO vendors (vendor_id, account_id, company_name, contact_name, phone, email, category, service_area, hourly_rate, response_time, insurance_verified, license_number, rating, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let venCount = 0;
  for (const v of vendors) {
    try {
      insertVendor.run(
        v.Vendor_ID || `VEN${uuidv4().split('-')[0].toUpperCase()}`,
        accountId,
        v.Company_Name || '', v.Contact_Name || '', v.Phone || '',
        v.Email || '', v.Category || '', v.Service_Area || '',
        v.Hourly_Rate ? parseFloat(v.Hourly_Rate) : 0,
        v.Response_Time || '', v.Insurance_Verified || 'No',
        v.License_Number || '',
        v.Rating ? parseFloat(v.Rating) : 0, v.Notes || ''
      );
      venCount++;
    } catch (e) {
      console.log(`  ⚠️ Skipped vendor ${v.Vendor_ID}: ${e.message}`);
    }
  }
  console.log(`  ✅ Migrated ${venCount} vendors`);
  
  // ---- Migrate Payments ----
  const payments = readCSV(join(trackingPath, 'payments.csv'));
  console.log(`\n📂 Found ${payments.length} payments to migrate...`);
  
  const insertPayment = db.prepare(`
    INSERT OR IGNORE INTO payments (payment_id, account_id, tenant_id, property_id, amount, transaction_fee, net_amount, payment_method, status, stripe_payment_intent_id, date_created, date_completed, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let payCount = 0;
  for (const p of payments) {
    try {
      insertPayment.run(
        p.Payment_ID || `PAY${uuidv4().split('-')[0].toUpperCase()}`,
        accountId,
        p.Tenant_ID || '', p.Property_ID || '',
        p.Amount ? parseFloat(p.Amount) : 0,
        p.Transaction_Fee ? parseFloat(p.Transaction_Fee) : 0,
        p.Net_Amount ? parseFloat(p.Net_Amount) : 0,
        p.Payment_Method || '', p.Status || 'Pending',
        p.Stripe_Payment_Intent_ID || '',
        p.Date_Created || '', p.Date_Completed || '',
        p.Notes || ''
      );
      payCount++;
    } catch (e) {
      console.log(`  ⚠️ Skipped payment ${p.Payment_ID}: ${e.message}`);
    }
  }
  console.log(`  ✅ Migrated ${payCount} payments`);
  
  // ---- Migrate Revenue ----
  const revenue = readCSV(join(financialsPath, 'monthly-revenue-tracker.csv'));
  console.log(`\n📂 Found ${revenue.length} revenue entries to migrate...`);
  
  const insertRevenue = db.prepare(`
    INSERT OR IGNORE INTO revenue_entries (entry_id, account_id, month, year, properties_under_management, total_revenue, management_fees, maintenance_costs, net_profit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let revCount = 0;
  for (const r of revenue) {
    try {
      insertRevenue.run(
        `REV${uuidv4().split('-')[0].toUpperCase()}`,
        accountId,
        r.Month || '', r.Year || '',
        r.Properties_Under_Management ? parseInt(r.Properties_Under_Management) : 0,
        r.Total_Revenue ? parseFloat(r.Total_Revenue) : 0,
        r.Management_Fees ? parseFloat(r.Management_Fees) : 0,
        r.Maintenance_Costs ? parseFloat(r.Maintenance_Costs) : 0,
        r.Net_Profit ? parseFloat(r.Net_Profit) : 0
      );
      revCount++;
    } catch (e) {
      console.log(`  ⚠️ Skipped revenue entry: ${e.message}`);
    }
  }
  console.log(`  ✅ Migrated ${revCount} revenue entries`);
  
  console.log('\n========================================');
  console.log('🎉 Migration complete!');
  console.log('========================================');
  console.log(`\nAccount ID: ${accountId}`);
  console.log(`Company: ${companyName}`);
  console.log(`Default login: admin@truenorthpm.com / admin123`);
  console.log('\nMigration summary:');
  console.log(`  Properties: ${propCount}`);
  console.log(`  Maintenance Requests: ${mrCount}`);
  console.log(`  Vendors: ${venCount}`);
  console.log(`  Payments: ${payCount}`);
  console.log(`  Revenue Entries: ${revCount}`);
  console.log('\n⚠️  IMPORTANT: Change the default password after first login!');
}

migrate().catch(console.error);
