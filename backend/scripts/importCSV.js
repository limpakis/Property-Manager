import Database from 'better-sqlite3';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '../database/property_manager.db');
const db = new Database(dbPath);

console.log('📥 Importing CSV data...\n');

// Import Properties
try {
  const propertiesCSV = fs.readFileSync(join(__dirname, '../../tracking/properties.csv'), 'utf8');
  const properties = parse(propertiesCSV, { columns: true, skip_empty_lines: true });
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO properties (
      owner_name, owner_email, owner_phone, address, city, state, zip,
      bedrooms, bathrooms, square_feet, monthly_rent, status, lease_start,
      lease_end, tenant_name, tenant_phone, management_fee_percent, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let count = 0;
  for (const row of properties) {
    if (row.Address && row.Address.trim()) {
      stmt.run(
        row.Owner_Name, row.Owner_Email, row.Owner_Phone, row.Address,
        row.City, row.State, row.Zip, row.Bedrooms, row.Bathrooms,
        row.Square_Feet, row.Monthly_Rent, row.Status, row.Lease_Start,
        row.Lease_End, row.Tenant_Name, row.Tenant_Phone,
        row.Management_Fee_Percent, row.Notes
      );
      count++;
    }
  }
  console.log(`✅ Imported ${count} properties`);
} catch (error) {
  console.log(`ℹ️  No properties to import (${error.message})`);
}

// Import Maintenance Requests
try {
  const maintenanceCSV = fs.readFileSync(join(__dirname, '../../tracking/maintenance-requests.csv'), 'utf8');
  const maintenance = parse(maintenanceCSV, { columns: true, skip_empty_lines: true });
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO maintenance_requests (
      date_submitted, property_id, address, tenant_name, issue_description,
      category, priority, status, assigned_vendor, date_assigned, date_completed,
      cost, owner_approved, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let count = 0;
  for (const row of maintenance) {
    if (row.Issue_Description && row.Issue_Description.trim()) {
      stmt.run(
        row.Date_Submitted, row.Property_ID, row.Address, row.Tenant_Name,
        row.Issue_Description, row.Category, row.Priority, row.Status,
        row.Assigned_Vendor, row.Date_Assigned, row.Date_Completed,
        row.Cost, row.Owner_Approved === 'Yes' ? 1 : 0, row.Notes
      );
      count++;
    }
  }
  console.log(`✅ Imported ${count} maintenance requests`);
} catch (error) {
  console.log(`ℹ️  No maintenance requests to import (${error.message})`);
}

// Import Monthly Revenue
try {
  const revenueCSV = fs.readFileSync(join(__dirname, '../../financials/monthly-revenue-tracker.csv'), 'utf8');
  const revenue = parse(revenueCSV, { columns: true, skip_empty_lines: true });
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO monthly_revenue (
      month, year, properties_under_management, total_rent_collected,
      management_fees, placement_fees, renewal_fees, maintenance_markup,
      other_fees, total_revenue, operating_expenses, net_profit
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let count = 0;
  for (const row of revenue) {
    if (row.Month && row.Year) {
      stmt.run(
        row.Month, row.Year, row.Properties_Under_Management,
        row.Total_Rent_Collected, row.Management_Fees, row.Placement_Fees,
        row.Renewal_Fees, row.Maintenance_Markup, row.Other_Fees,
        row.Total_Revenue, row.Operating_Expenses, row.Net_Profit
      );
      count++;
    }
  }
  console.log(`✅ Imported ${count} revenue records`);
} catch (error) {
  console.log(`ℹ️  No revenue data to import (${error.message})`);
}

// Import Vendors
try {
  const vendorsCSV = fs.readFileSync(join(__dirname, '../../tracking/vendor-database.csv'), 'utf8');
  const vendors = parse(vendorsCSV, { columns: true, skip_empty_lines: true });
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO vendors (
      company_name, contact_name, phone, email, category, service_area,
      hourly_rate, response_time, insurance_verified, license_number, rating, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let count = 0;
  for (const row of vendors) {
    if (row.Company_Name && row.Company_Name.trim()) {
      stmt.run(
        row.Company_Name, row.Contact_Name, row.Phone, row.Email,
        row.Category, row.Service_Area, row.Hourly_Rate, row.Response_Time,
        row.Insurance_Verified === 'Yes' ? 1 : 0, row.License_Number,
        row.Rating, row.Notes
      );
      count++;
    }
  }
  console.log(`✅ Imported ${count} vendors`);
} catch (error) {
  console.log(`ℹ️  No vendors to import (${error.message})`);
}

// Import Client Acquisition
try {
  const clientsCSV = fs.readFileSync(join(__dirname, '../../tracking/client-acquisition-tracker.csv'), 'utf8');
  const clients = parse(clientsCSV, { columns: true, skip_empty_lines: true });
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO client_acquisition (
      date_contacted, owner_name, phone, email, property_address,
      source, status, follow_up_date, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  let count = 0;
  for (const row of clients) {
    if (row.Owner_Name && row.Owner_Name.trim()) {
      stmt.run(
        row.Date_Contacted, row.Owner_Name, row.Phone, row.Email,
        row.Property_Address, row.Source, row.Status, row.Follow_Up_Date, row.Notes
      );
      count++;
    }
  }
  console.log(`✅ Imported ${count} leads/clients`);
} catch (error) {
  console.log(`ℹ️  No client data to import (${error.message})`);
}

console.log('\n✨ CSV import complete!');
db.close();
