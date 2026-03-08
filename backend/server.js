// TrueNorth PM SaaS - Multi-Tenant Backend Server
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Database & Auth
import { initializeDatabase, getDb, SUBSCRIPTION_TIERS } from './database/schema.js';
import { authenticate, requireActiveSubscription, checkPropertyLimit } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import subscriptionRoutes from './routes/subscription.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize database
initializeDatabase();

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

function ensureStripeConfigured(res) {
  if (!stripe) {
    res.status(503).json({
      error: 'Stripe is not configured. Set STRIPE_SECRET_KEY to enable payment features.'
    });
    return false;
  }
  return true;
}

const app = express();
const PORT = process.env.PORT || 3001;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Per-account upload directory
    const accountDir = req.accountId ? join(__dirname, '../documents', req.accountId) : join(__dirname, '../documents');
    if (!fs.existsSync(accountDir)) {
      fs.mkdirSync(accountDir, { recursive: true });
    }
    cb(null, accountDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /pdf|doc|docx|txt|md|jpg|jpeg|png/;
    const allowedMimeTypes = /pdf|msword|document|text|markdown|image/;
    const extname = allowedExtensions.test(file.originalname.toLowerCase());
    const mimetype = allowedMimeTypes.test(file.mimetype.toLowerCase());
    if (extname || mimetype) return cb(null, true);
    cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, TXT, MD, JPG, PNG'));
  }
});

// ============ MIDDLEWARE ============
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON for all routes except webhooks (which need raw body)
app.use((req, res, next) => {
  if (req.path === '/api/payments/webhook' || req.path === '/api/subscription/webhook') {
    next();
  } else {
    express.json({ limit: '10mb' })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============ PUBLIC ROUTES (no auth) ============
app.use('/api/auth', authRoutes);
app.use('/api/subscription', subscriptionRoutes);

// ============ HELPER FUNCTIONS ============
function generateId(prefix) {
  const uid = uuidv4().split('-')[0].toUpperCase();
  return `${prefix}${uid}`;
}

// Calculate transaction fees
function calculateFees(amount, paymentMethod = 'Card') {
  const parsedAmount = parseFloat(amount);
  let fee = paymentMethod === 'ACH' ? parsedAmount * 0.008 : (parsedAmount * 0.029) + 0.30;
  return {
    amount: parsedAmount.toFixed(2),
    fee: fee.toFixed(2),
    netAmount: (parsedAmount - fee).toFixed(2)
  };
}

// ============ VALIDATION SCHEMAS ============
const unitSchema = Joi.object({
  Unit_Number: Joi.string().required(),
  Bedrooms: Joi.string().required(),
  Bathrooms: Joi.string().required(),
  Square_Feet: Joi.string().allow('').optional(),
  Monthly_Rent: Joi.string().required(),
  Status: Joi.string().valid('Active', 'Vacant', 'Occupied', 'Maintenance').required(),
  Tenant_Name: Joi.string().allow('').optional(),
  Tenant_Phone: Joi.string().allow('').optional(),
  Lease_Start: Joi.string().allow('').optional(),
  Lease_End: Joi.string().allow('').optional()
});

const propertySchema = Joi.object({
  Property_ID: Joi.string().optional(),
  Property_Type: Joi.string().valid('Single Unit', 'Multi-Unit').optional(),
  Owner_Name: Joi.string().optional(),
  Owner_Email: Joi.string().email().optional(),
  Owner_Phone: Joi.string().optional(),
  Address: Joi.string().required(),
  City: Joi.string().required(),
  State: Joi.string().length(2).required(),
  Zip: Joi.string().optional(),
  Bedrooms: Joi.alternatives().try(Joi.number().integer().min(0), Joi.string()).optional(),
  Bathrooms: Joi.alternatives().try(Joi.number().min(0), Joi.string()).optional(),
  Square_Feet: Joi.alternatives().try(Joi.number().integer().min(0), Joi.string()).allow('').optional(),
  Monthly_Rent: Joi.alternatives().try(Joi.number().min(0), Joi.string()).optional(),
  Status: Joi.string().valid('Active', 'Vacant', 'Occupied', 'Maintenance').optional(),
  Lease_Start: Joi.string().allow('').optional(),
  Lease_End: Joi.string().allow('').optional(),
  Tenant_Name: Joi.string().allow('').optional(),
  Tenant_Phone: Joi.string().allow('').optional(),
  Date_Added: Joi.string().optional(),
  Management_Fee_Percent: Joi.alternatives().try(Joi.number().min(0).max(100), Joi.string()).allow('').optional(),
  Notes: Joi.string().allow('').optional(),
  Units: Joi.array().items(unitSchema).optional()
});

const maintenanceSchema = Joi.object({
  Request_ID: Joi.string().optional(),
  Date_Submitted: Joi.string().required(),
  Property_ID: Joi.string().required(),
  Address: Joi.string().required(),
  Tenant_Name: Joi.string().allow('').optional(),
  Issue_Description: Joi.string().required(),
  Category: Joi.string().valid('Plumbing', 'HVAC', 'Electrical', 'Appliance', 'General Maintenance', 'Other').required(),
  Priority: Joi.string().valid('Low', 'Medium', 'High', 'Emergency').required(),
  Status: Joi.string().valid('Pending', 'Assigned', 'In Progress', 'Completed', 'Cancelled').required(),
  Assigned_Vendor: Joi.string().allow('').optional(),
  Date_Assigned: Joi.string().allow('').optional(),
  Date_Completed: Joi.string().allow('').optional(),
  Cost: Joi.number().min(0).allow('').optional(),
  Owner_Approved: Joi.string().valid('Yes', 'No', 'Pending', '').optional(),
  Notes: Joi.string().allow('').optional()
});

const vendorSchema = Joi.object({
  Vendor_ID: Joi.string().optional(),
  Company_Name: Joi.string().required(),
  Contact_Name: Joi.string().required(),
  Phone: Joi.string().required(),
  Email: Joi.string().email().required(),
  Category: Joi.string().required(),
  Service_Area: Joi.string().required(),
  Hourly_Rate: Joi.number().min(0).required(),
  Response_Time: Joi.string().required(),
  Insurance_Verified: Joi.string().valid('Yes', 'No').required(),
  License_Number: Joi.string().allow('').optional(),
  Rating: Joi.number().min(0).max(5).optional(),
  Notes: Joi.string().allow('').optional()
});

const paymentSchema = Joi.object({
  tenantId: Joi.string().required(),
  propertyId: Joi.string().required(),
  amount: Joi.number().min(0).required(),
  type: Joi.string().valid('rent', 'deposit', 'late_fee').required(),
  description: Joi.string().allow('').optional()
});

const expenseSchema = Joi.object({
  property_id: Joi.string().allow('', null).optional(),
  category: Joi.string().valid('Insurance', 'Property Tax', 'Utilities', 'Repairs', 'Mortgage', 'HOA Fees', 'Legal', 'Marketing', 'Management Fee', 'Landscaping', 'Cleaning', 'Other').required(),
  description: Joi.string().required(),
  amount: Joi.number().min(0).required(),
  date: Joi.string().required(),
  recurring: Joi.boolean().optional(),
  recurring_frequency: Joi.string().valid('monthly', 'quarterly', 'annually').allow('', null).optional(),
  vendor_name: Joi.string().allow('', null).optional(),
  tax_deductible: Joi.boolean().optional(),
  notes: Joi.string().allow('', null).optional()
});

const rentLedgerSchema = Joi.object({
  property_id: Joi.string().required(),
  tenant_name: Joi.string().allow('', null).optional(),
  month: Joi.string().required(),
  year: Joi.string().required(),
  amount_due: Joi.number().min(0).required(),
  amount_paid: Joi.number().min(0).optional(),
  date_paid: Joi.string().allow('', null).optional(),
  status: Joi.string().valid('Paid', 'Partial', 'Unpaid', 'Late', 'Waived').optional(),
  late_fee: Joi.number().min(0).optional(),
  notes: Joi.string().allow('', null).optional()
});

function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'Validation error', details: error.details.map(d => d.message) });
    }
    next();
  };
}

// ============ PROTECTED ROUTES - All require authentication ============

// Apply auth + subscription check to all /api/* routes below
const protectedRouter = express.Router();
protectedRouter.use(authenticate);
protectedRouter.use(requireActiveSubscription);

// ============ PROPERTIES ROUTES ============
protectedRouter.get('/properties', (req, res) => {
  try {
    const db = getDb();
    const properties = db.prepare('SELECT * FROM properties WHERE account_id = ? ORDER BY created_at DESC').all(req.accountId);
    
    // Parse units JSON
    const result = properties.map(p => ({
      ...p,
      Units: p.units ? (() => { try { return JSON.parse(p.units); } catch { return []; } })() : [],
      // Map DB fields to API format for frontend compatibility
      Property_ID: p.property_id,
      Property_Type: p.property_type,
      Owner_Name: p.owner_name,
      Owner_Email: p.owner_email,
      Owner_Phone: p.owner_phone,
      Address: p.address,
      City: p.city,
      State: p.state,
      Zip: p.zip,
      Bedrooms: p.bedrooms,
      Bathrooms: p.bathrooms,
      Square_Feet: p.square_feet,
      Monthly_Rent: p.monthly_rent,
      Status: p.status,
      Lease_Start: p.lease_start,
      Lease_End: p.lease_end,
      Tenant_Name: p.tenant_name,
      Tenant_Phone: p.tenant_phone,
      Management_Fee_Percent: p.management_fee_percent,
      Notes: p.notes,
      Date_Added: p.date_added,
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.get('/properties/:id', (req, res) => {
  try {
    const db = getDb();
    const p = db.prepare('SELECT * FROM properties WHERE property_id = ? AND account_id = ?').get(req.params.id, req.accountId);
    
    if (!p) return res.status(404).json({ error: 'Property not found' });
    
    const result = {
      ...p,
      Units: p.units ? (() => { try { return JSON.parse(p.units); } catch { return []; } })() : [],
      Property_ID: p.property_id,
      Property_Type: p.property_type,
      Owner_Name: p.owner_name,
      Owner_Email: p.owner_email,
      Owner_Phone: p.owner_phone,
      Address: p.address,
      City: p.city,
      State: p.state,
      Zip: p.zip,
      Bedrooms: p.bedrooms,
      Bathrooms: p.bathrooms,
      Square_Feet: p.square_feet,
      Monthly_Rent: p.monthly_rent,
      Status: p.status,
      Lease_Start: p.lease_start,
      Lease_End: p.lease_end,
      Tenant_Name: p.tenant_name,
      Tenant_Phone: p.tenant_phone,
      Management_Fee_Percent: p.management_fee_percent,
      Notes: p.notes,
      Date_Added: p.date_added,
    };
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.post('/properties', checkPropertyLimit, validate(propertySchema), (req, res) => {
  try {
    const db = getDb();
    const propertyId = req.body.Property_ID || generateId('PROP');
    
    // Check duplicate
    const existing = db.prepare('SELECT property_id FROM properties WHERE property_id = ?').get(propertyId);
    if (existing) return res.status(409).json({ error: 'Property ID already exists' });
    
    const unitsJson = req.body.Units ? JSON.stringify(req.body.Units) : null;
    
    db.prepare(`
      INSERT INTO properties (property_id, account_id, owner_name, owner_email, owner_phone, address, city, state, zip, bedrooms, bathrooms, square_feet, monthly_rent, status, property_type, units, lease_start, lease_end, tenant_name, tenant_phone, management_fee_percent, notes, date_added)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      propertyId, req.accountId,
      req.body.Owner_Name || '', req.body.Owner_Email || '', req.body.Owner_Phone || '',
      req.body.Address, req.body.City, req.body.State, req.body.Zip || '',
      req.body.Bedrooms || null, req.body.Bathrooms || null, req.body.Square_Feet || null,
      req.body.Monthly_Rent || null, req.body.Status || 'Active',
      req.body.Property_Type || 'Single Unit', unitsJson,
      req.body.Lease_Start || '', req.body.Lease_End || '',
      req.body.Tenant_Name || '', req.body.Tenant_Phone || '',
      req.body.Management_Fee_Percent || 10, req.body.Notes || '',
      req.body.Date_Added || new Date().toISOString().split('T')[0]
    );
    
    // Update property count
    db.prepare('UPDATE accounts SET current_property_count = current_property_count + 1, updated_at = ? WHERE account_id = ?').run(
      new Date().toISOString(), req.accountId
    );
    
    // Log usage
    db.prepare('INSERT INTO usage_logs (log_id, account_id, metric_type, metric_value) VALUES (?, ?, ?, ?)').run(
      generateId('LOG'), req.accountId, 'property_added', 1
    );
    
    const newProperty = { ...req.body, Property_ID: propertyId };
    res.status(201).json({ message: 'Property created successfully', property: newProperty });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.put('/properties/:id', validate(propertySchema), (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM properties WHERE property_id = ? AND account_id = ?').get(req.params.id, req.accountId);
    
    if (!existing) return res.status(404).json({ error: 'Property not found' });
    
    const unitsJson = req.body.Units ? JSON.stringify(req.body.Units) : existing.units;
    
    db.prepare(`
      UPDATE properties SET 
        owner_name = ?, owner_email = ?, owner_phone = ?,
        address = ?, city = ?, state = ?, zip = ?,
        bedrooms = ?, bathrooms = ?, square_feet = ?,
        monthly_rent = ?, status = ?, property_type = ?, units = ?,
        lease_start = ?, lease_end = ?,
        tenant_name = ?, tenant_phone = ?,
        management_fee_percent = ?, notes = ?
      WHERE property_id = ? AND account_id = ?
    `).run(
      req.body.Owner_Name || '', req.body.Owner_Email || '', req.body.Owner_Phone || '',
      req.body.Address, req.body.City, req.body.State, req.body.Zip || '',
      req.body.Bedrooms || null, req.body.Bathrooms || null, req.body.Square_Feet || null,
      req.body.Monthly_Rent || null, req.body.Status || 'Active',
      req.body.Property_Type || 'Single Unit', unitsJson,
      req.body.Lease_Start || '', req.body.Lease_End || '',
      req.body.Tenant_Name || '', req.body.Tenant_Phone || '',
      req.body.Management_Fee_Percent || 10, req.body.Notes || '',
      req.params.id, req.accountId
    );
    
    const updatedProperty = { ...req.body, Property_ID: req.params.id, Date_Added: existing.date_added };
    res.json({ message: 'Property updated successfully', property: updatedProperty });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.delete('/properties/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM properties WHERE property_id = ? AND account_id = ?').get(req.params.id, req.accountId);
    
    if (!existing) return res.status(404).json({ error: 'Property not found' });
    
    db.prepare('DELETE FROM properties WHERE property_id = ? AND account_id = ?').run(req.params.id, req.accountId);
    
    // Decrement property count
    db.prepare('UPDATE accounts SET current_property_count = MAX(0, current_property_count - 1), updated_at = ? WHERE account_id = ?').run(
      new Date().toISOString(), req.accountId
    );
    
    res.json({ message: 'Property deleted successfully', property: { Property_ID: req.params.id } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MAINTENANCE ROUTES ============
protectedRouter.get('/maintenance', (req, res) => {
  try {
    const db = getDb();
    const requests = db.prepare('SELECT * FROM maintenance_requests WHERE account_id = ? ORDER BY created_at DESC').all(req.accountId);
    
    const result = requests.map(r => ({
      Request_ID: r.request_id,
      Date_Submitted: r.date_submitted,
      Property_ID: r.property_id,
      Address: r.address,
      Tenant_Name: r.tenant_name,
      Issue_Description: r.issue_description,
      Category: r.category,
      Priority: r.priority,
      Status: r.status,
      Assigned_Vendor: r.assigned_vendor,
      Date_Assigned: r.date_assigned,
      Date_Completed: r.date_completed,
      Cost: r.cost,
      Owner_Approved: r.owner_approved,
      Notes: r.notes,
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.get('/maintenance/:id', (req, res) => {
  try {
    const db = getDb();
    const r = db.prepare('SELECT * FROM maintenance_requests WHERE request_id = ? AND account_id = ?').get(req.params.id, req.accountId);
    
    if (!r) return res.status(404).json({ error: 'Maintenance request not found' });
    
    res.json({
      Request_ID: r.request_id, Date_Submitted: r.date_submitted,
      Property_ID: r.property_id, Address: r.address,
      Tenant_Name: r.tenant_name, Issue_Description: r.issue_description,
      Category: r.category, Priority: r.priority, Status: r.status,
      Assigned_Vendor: r.assigned_vendor, Date_Assigned: r.date_assigned,
      Date_Completed: r.date_completed, Cost: r.cost,
      Owner_Approved: r.owner_approved, Notes: r.notes,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.post('/maintenance', validate(maintenanceSchema), (req, res) => {
  try {
    const db = getDb();
    const requestId = req.body.Request_ID || generateId('MR');
    
    const existing = db.prepare('SELECT request_id FROM maintenance_requests WHERE request_id = ?').get(requestId);
    if (existing) return res.status(409).json({ error: 'Request ID already exists' });
    
    db.prepare(`
      INSERT INTO maintenance_requests (request_id, account_id, property_id, address, tenant_name, issue_description, category, priority, status, assigned_vendor, date_submitted, date_assigned, date_completed, cost, owner_approved, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      requestId, req.accountId,
      req.body.Property_ID, req.body.Address, req.body.Tenant_Name || '',
      req.body.Issue_Description, req.body.Category, req.body.Priority,
      req.body.Status || 'Pending', req.body.Assigned_Vendor || '',
      req.body.Date_Submitted || new Date().toISOString().split('T')[0],
      req.body.Date_Assigned || '', req.body.Date_Completed || '',
      req.body.Cost || null, req.body.Owner_Approved || 'Pending',
      req.body.Notes || ''
    );
    
    res.status(201).json({ message: 'Maintenance request created successfully', request: { ...req.body, Request_ID: requestId } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.put('/maintenance/:id', validate(maintenanceSchema), (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM maintenance_requests WHERE request_id = ? AND account_id = ?').get(req.params.id, req.accountId);
    
    if (!existing) return res.status(404).json({ error: 'Maintenance request not found' });
    
    db.prepare(`
      UPDATE maintenance_requests SET
        property_id = ?, address = ?, tenant_name = ?,
        issue_description = ?, category = ?, priority = ?, status = ?,
        assigned_vendor = ?, date_assigned = ?, date_completed = ?,
        cost = ?, owner_approved = ?, notes = ?
      WHERE request_id = ? AND account_id = ?
    `).run(
      req.body.Property_ID, req.body.Address, req.body.Tenant_Name || '',
      req.body.Issue_Description, req.body.Category, req.body.Priority,
      req.body.Status, req.body.Assigned_Vendor || '',
      req.body.Date_Assigned || '', req.body.Date_Completed || '',
      req.body.Cost || null, req.body.Owner_Approved || 'Pending',
      req.body.Notes || '',
      req.params.id, req.accountId
    );
    
    res.json({ message: 'Maintenance request updated successfully', request: { ...req.body, Request_ID: req.params.id } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.delete('/maintenance/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM maintenance_requests WHERE request_id = ? AND account_id = ?').get(req.params.id, req.accountId);
    
    if (!existing) return res.status(404).json({ error: 'Maintenance request not found' });
    
    db.prepare('DELETE FROM maintenance_requests WHERE request_id = ? AND account_id = ?').run(req.params.id, req.accountId);
    
    res.json({ message: 'Maintenance request deleted successfully', request: { Request_ID: req.params.id } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ VENDORS ROUTES ============
protectedRouter.get('/vendors', (req, res) => {
  try {
    const db = getDb();
    const vendors = db.prepare('SELECT * FROM vendors WHERE account_id = ? ORDER BY created_at DESC').all(req.accountId);
    
    const result = vendors.map(v => ({
      Vendor_ID: v.vendor_id, Company_Name: v.company_name,
      Contact_Name: v.contact_name, Phone: v.phone, Email: v.email,
      Category: v.category, Service_Area: v.service_area,
      Hourly_Rate: v.hourly_rate, Response_Time: v.response_time,
      Insurance_Verified: v.insurance_verified, License_Number: v.license_number,
      Rating: v.rating, Notes: v.notes,
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.get('/vendors/:id', (req, res) => {
  try {
    const db = getDb();
    const v = db.prepare('SELECT * FROM vendors WHERE vendor_id = ? AND account_id = ?').get(req.params.id, req.accountId);
    
    if (!v) return res.status(404).json({ error: 'Vendor not found' });
    
    res.json({
      Vendor_ID: v.vendor_id, Company_Name: v.company_name,
      Contact_Name: v.contact_name, Phone: v.phone, Email: v.email,
      Category: v.category, Service_Area: v.service_area,
      Hourly_Rate: v.hourly_rate, Response_Time: v.response_time,
      Insurance_Verified: v.insurance_verified, License_Number: v.license_number,
      Rating: v.rating, Notes: v.notes,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.post('/vendors', validate(vendorSchema), (req, res) => {
  try {
    const db = getDb();
    const vendorId = req.body.Vendor_ID || generateId('VEN');
    
    const existing = db.prepare('SELECT vendor_id FROM vendors WHERE vendor_id = ?').get(vendorId);
    if (existing) return res.status(409).json({ error: 'Vendor ID already exists' });
    
    db.prepare(`
      INSERT INTO vendors (vendor_id, account_id, company_name, contact_name, phone, email, category, service_area, hourly_rate, response_time, insurance_verified, license_number, rating, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      vendorId, req.accountId,
      req.body.Company_Name, req.body.Contact_Name, req.body.Phone,
      req.body.Email, req.body.Category, req.body.Service_Area,
      req.body.Hourly_Rate, req.body.Response_Time,
      req.body.Insurance_Verified || 'No', req.body.License_Number || '',
      req.body.Rating || 0, req.body.Notes || ''
    );
    
    res.status(201).json({ message: 'Vendor created successfully', vendor: { ...req.body, Vendor_ID: vendorId } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.put('/vendors/:id', validate(vendorSchema), (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM vendors WHERE vendor_id = ? AND account_id = ?').get(req.params.id, req.accountId);
    
    if (!existing) return res.status(404).json({ error: 'Vendor not found' });
    
    db.prepare(`
      UPDATE vendors SET
        company_name = ?, contact_name = ?, phone = ?, email = ?,
        category = ?, service_area = ?, hourly_rate = ?, response_time = ?,
        insurance_verified = ?, license_number = ?, rating = ?, notes = ?
      WHERE vendor_id = ? AND account_id = ?
    `).run(
      req.body.Company_Name, req.body.Contact_Name, req.body.Phone,
      req.body.Email, req.body.Category, req.body.Service_Area,
      req.body.Hourly_Rate, req.body.Response_Time,
      req.body.Insurance_Verified, req.body.License_Number || '',
      req.body.Rating || 0, req.body.Notes || '',
      req.params.id, req.accountId
    );
    
    res.json({ message: 'Vendor updated successfully', vendor: { ...req.body, Vendor_ID: req.params.id } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.delete('/vendors/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM vendors WHERE vendor_id = ? AND account_id = ?').get(req.params.id, req.accountId);
    
    if (!existing) return res.status(404).json({ error: 'Vendor not found' });
    
    db.prepare('DELETE FROM vendors WHERE vendor_id = ? AND account_id = ?').run(req.params.id, req.accountId);
    
    res.json({ message: 'Vendor deleted successfully', vendor: { Vendor_ID: req.params.id } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ FINANCIAL ROUTES ============
protectedRouter.get('/financials/revenue', (req, res) => {
  try {
    const db = getDb();
    const revenue = db.prepare('SELECT * FROM revenue_entries WHERE account_id = ? ORDER BY year DESC, month DESC').all(req.accountId);
    
    const result = revenue.map(r => ({
      Month: r.month, Year: r.year,
      Properties_Under_Management: r.properties_under_management,
      Total_Revenue: r.total_revenue, Management_Fees: r.management_fees,
      Maintenance_Costs: r.maintenance_costs, Net_Profit: r.net_profit,
    }));
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.get('/financials/summary', (req, res) => {
  try {
    const db = getDb();
    const revenue = db.prepare('SELECT * FROM revenue_entries WHERE account_id = ?').all(req.accountId);
    
    const summary = {
      total_revenue: revenue.reduce((sum, r) => sum + (r.total_revenue || 0), 0),
      total_profit: revenue.reduce((sum, r) => sum + (r.net_profit || 0), 0),
      avg_properties: revenue.length > 0 ?
        revenue.reduce((sum, r) => sum + (r.properties_under_management || 0), 0) / revenue.length : 0
    };
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ EXPENSES ROUTES ============
protectedRouter.get('/expenses', (req, res) => {
  try {
    const db = getDb();
    const expenses = db.prepare('SELECT * FROM expenses WHERE account_id = ? ORDER BY date DESC, created_at DESC').all(req.accountId);
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.post('/expenses', validate(expenseSchema), (req, res) => {
  try {
    const db = getDb();
    const expenseId = generateId('EXP');
    
    db.prepare(`
      INSERT INTO expenses (expense_id, account_id, property_id, category, description, amount, date, recurring, recurring_frequency, vendor_name, tax_deductible, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      expenseId, req.accountId,
      req.body.property_id || null, req.body.category, req.body.description,
      req.body.amount, req.body.date,
      req.body.recurring ? 1 : 0, req.body.recurring_frequency || null,
      req.body.vendor_name || null, req.body.tax_deductible !== false ? 1 : 0,
      req.body.notes || null
    );
    
    res.status(201).json({ message: 'Expense created', expense: { expense_id: expenseId, ...req.body } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.put('/expenses/:id', validate(expenseSchema), (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM expenses WHERE expense_id = ? AND account_id = ?').get(req.params.id, req.accountId);
    if (!existing) return res.status(404).json({ error: 'Expense not found' });
    
    db.prepare(`
      UPDATE expenses SET property_id = ?, category = ?, description = ?, amount = ?, date = ?, recurring = ?, recurring_frequency = ?, vendor_name = ?, tax_deductible = ?, notes = ?
      WHERE expense_id = ? AND account_id = ?
    `).run(
      req.body.property_id || null, req.body.category, req.body.description,
      req.body.amount, req.body.date,
      req.body.recurring ? 1 : 0, req.body.recurring_frequency || null,
      req.body.vendor_name || null, req.body.tax_deductible !== false ? 1 : 0,
      req.body.notes || null,
      req.params.id, req.accountId
    );
    
    res.json({ message: 'Expense updated', expense: { expense_id: req.params.id, ...req.body } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.delete('/expenses/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM expenses WHERE expense_id = ? AND account_id = ?').get(req.params.id, req.accountId);
    if (!existing) return res.status(404).json({ error: 'Expense not found' });
    
    db.prepare('DELETE FROM expenses WHERE expense_id = ? AND account_id = ?').run(req.params.id, req.accountId);
    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ RENT ROLL / LEDGER ROUTES ============
protectedRouter.get('/rent-roll', (req, res) => {
  try {
    const db = getDb();
    const { month, year } = req.query;
    
    let ledger;
    if (month && year) {
      ledger = db.prepare('SELECT * FROM rent_ledger WHERE account_id = ? AND month = ? AND year = ? ORDER BY created_at DESC').all(req.accountId, month, year);
    } else {
      ledger = db.prepare('SELECT * FROM rent_ledger WHERE account_id = ? ORDER BY year DESC, month DESC, created_at DESC').all(req.accountId);
    }
    
    // Enrich with property info
    const properties = db.prepare('SELECT property_id, address, tenant_name, monthly_rent FROM properties WHERE account_id = ?').all(req.accountId);
    const propMap = {};
    properties.forEach(p => { propMap[p.property_id] = p; });
    
    const enriched = ledger.map(l => ({
      ...l,
      property_address: propMap[l.property_id]?.address || 'Unknown',
      tenant_name: l.tenant_name || propMap[l.property_id]?.tenant_name || 'Unknown',
    }));
    
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.post('/rent-roll', validate(rentLedgerSchema), (req, res) => {
  try {
    const db = getDb();
    const ledgerId = generateId('RL');
    
    // Determine status
    let status = req.body.status || 'Unpaid';
    if (req.body.amount_paid && req.body.amount_paid > 0) {
      status = req.body.amount_paid >= req.body.amount_due ? 'Paid' : 'Partial';
    }
    
    db.prepare(`
      INSERT INTO rent_ledger (ledger_id, account_id, property_id, tenant_name, month, year, amount_due, amount_paid, date_paid, status, late_fee, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      ledgerId, req.accountId,
      req.body.property_id, req.body.tenant_name || null,
      req.body.month, req.body.year, req.body.amount_due,
      req.body.amount_paid || 0, req.body.date_paid || null,
      status, req.body.late_fee || 0, req.body.notes || null
    );
    
    res.status(201).json({ message: 'Rent entry created', entry: { ledger_id: ledgerId, ...req.body, status } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.put('/rent-roll/:id', validate(rentLedgerSchema), (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM rent_ledger WHERE ledger_id = ? AND account_id = ?').get(req.params.id, req.accountId);
    if (!existing) return res.status(404).json({ error: 'Rent entry not found' });
    
    let status = req.body.status || existing.status;
    if (req.body.amount_paid !== undefined) {
      status = req.body.amount_paid >= req.body.amount_due ? 'Paid' : req.body.amount_paid > 0 ? 'Partial' : 'Unpaid';
    }
    
    db.prepare(`
      UPDATE rent_ledger SET property_id = ?, tenant_name = ?, month = ?, year = ?, amount_due = ?, amount_paid = ?, date_paid = ?, status = ?, late_fee = ?, notes = ?
      WHERE ledger_id = ? AND account_id = ?
    `).run(
      req.body.property_id, req.body.tenant_name || null,
      req.body.month, req.body.year, req.body.amount_due,
      req.body.amount_paid || 0, req.body.date_paid || null,
      status, req.body.late_fee || 0, req.body.notes || null,
      req.params.id, req.accountId
    );
    
    res.json({ message: 'Rent entry updated', entry: { ledger_id: req.params.id, ...req.body, status } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.delete('/rent-roll/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM rent_ledger WHERE ledger_id = ? AND account_id = ?').get(req.params.id, req.accountId);
    if (!existing) return res.status(404).json({ error: 'Rent entry not found' });
    
    db.prepare('DELETE FROM rent_ledger WHERE ledger_id = ? AND account_id = ?').run(req.params.id, req.accountId);
    res.json({ message: 'Rent entry deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate rent roll for current month from active properties
protectedRouter.post('/rent-roll/generate', (req, res) => {
  try {
    const db = getDb();
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const year = now.getFullYear().toString();
    
    // Get active properties with tenants
    const properties = db.prepare("SELECT * FROM properties WHERE account_id = ? AND status IN ('Active', 'Occupied') AND monthly_rent > 0").all(req.accountId);
    
    // Check which ones already have entries this month
    const existingEntries = db.prepare('SELECT property_id FROM rent_ledger WHERE account_id = ? AND month = ? AND year = ?').all(req.accountId, month, year);
    const existingPropertyIds = new Set(existingEntries.map(e => e.property_id));
    
    let created = 0;
    const insertStmt = db.prepare(`
      INSERT INTO rent_ledger (ledger_id, account_id, property_id, tenant_name, month, year, amount_due, amount_paid, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'Unpaid', ?)
    `);
    
    for (const prop of properties) {
      if (existingPropertyIds.has(prop.property_id)) continue;
      
      // Handle multi-unit properties
      if (prop.property_type === 'Multi-Unit' && prop.units) {
        let units;
        try { units = JSON.parse(prop.units); } catch { units = []; }
        for (const unit of units) {
          if (unit.Status === 'Active' || unit.Status === 'Occupied') {
            const rent = parseFloat(unit.Monthly_Rent) || 0;
            if (rent > 0) {
              insertStmt.run(
                generateId('RL'), req.accountId, prop.property_id,
                unit.Tenant_Name || 'Vacant', month, year, rent,
                `Unit ${unit.Unit_Number} - ${prop.address}`
              );
              created++;
            }
          }
        }
      } else {
        insertStmt.run(
          generateId('RL'), req.accountId, prop.property_id,
          prop.tenant_name || 'Unknown', month, year,
          parseFloat(prop.monthly_rent) || 0, null
        );
        created++;
      }
    }
    
    res.json({ message: `Generated ${created} rent entries for ${month} ${year}`, created });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DASHBOARD CHART DATA (Real) ============
protectedRouter.get('/dashboard/chart-data', (req, res) => {
  try {
    const db = getDb();
    const months = [];
    const now = new Date();
    
    // Get last 7 months
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.toLocaleString('en-US', { month: 'short' }),
        monthLong: d.toLocaleString('en-US', { month: 'long' }),
        year: d.getFullYear().toString(),
        dateStart: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`,
        dateEnd: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-31`,
      });
    }
    
    const chartData = months.map(m => {
      // Income from completed payments in this month
      const payments = db.prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE account_id = ? AND status = 'Completed' AND date_completed BETWEEN ? AND ?"
      ).get(req.accountId, m.dateStart, m.dateEnd + 'T23:59:59');
      
      // Income from rent ledger entries
      const rentIncome = db.prepare(
        "SELECT COALESCE(SUM(amount_paid), 0) as total FROM rent_ledger WHERE account_id = ? AND month = ? AND year = ? AND status IN ('Paid', 'Partial')"
      ).get(req.accountId, m.monthLong, m.year);
      
      // Expenses from expenses table
      const expenseTotal = db.prepare(
        'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE account_id = ? AND date BETWEEN ? AND ?'
      ).get(req.accountId, m.dateStart, m.dateEnd);
      
      // Maintenance costs
      const maintenanceCost = db.prepare(
        "SELECT COALESCE(SUM(cost), 0) as total FROM maintenance_requests WHERE account_id = ? AND status = 'Completed' AND date_completed BETWEEN ? AND ?"
      ).get(req.accountId, m.dateStart, m.dateEnd);
      
      const income = Math.max((payments?.total || 0), (rentIncome?.total || 0));
      const expenses = (expenseTotal?.total || 0) + (maintenanceCost?.total || 0);
      
      return {
        month: m.month,
        income: parseFloat(income.toFixed(2)),
        expenses: parseFloat(expenses.toFixed(2)),
        profit: parseFloat((income - expenses).toFixed(2)),
      };
    });
    
    res.json(chartData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ FINANCIAL OVERVIEW (for tax reporting) ============
protectedRouter.get('/financials/tax-summary', (req, res) => {
  try {
    const db = getDb();
    const year = req.query.year || new Date().getFullYear().toString();
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    
    // Total rent collected
    const rentCollected = db.prepare(
      "SELECT COALESCE(SUM(amount_paid), 0) as total FROM rent_ledger WHERE account_id = ? AND year = ? AND status IN ('Paid', 'Partial')"
    ).get(req.accountId, year);
    
    // Expenses by category (tax-deductible only)
    const deductibleExpenses = db.prepare(
      'SELECT category, SUM(amount) as total FROM expenses WHERE account_id = ? AND date BETWEEN ? AND ? AND tax_deductible = 1 GROUP BY category ORDER BY total DESC'
    ).all(req.accountId, yearStart, yearEnd);
    
    // All expenses
    const allExpenses = db.prepare(
      'SELECT category, SUM(amount) as total FROM expenses WHERE account_id = ? AND date BETWEEN ? AND ? GROUP BY category ORDER BY total DESC'
    ).all(req.accountId, yearStart, yearEnd);
    
    // Maintenance costs
    const maintenanceCosts = db.prepare(
      "SELECT COALESCE(SUM(cost), 0) as total FROM maintenance_requests WHERE account_id = ? AND status = 'Completed' AND date_completed BETWEEN ? AND ?"
    ).get(req.accountId, yearStart, yearEnd);
    
    // Properties count
    const propertyCount = db.prepare(
      'SELECT COUNT(*) as count FROM properties WHERE account_id = ?'
    ).get(req.accountId);
    
    const totalDeductible = deductibleExpenses.reduce((s, e) => s + e.total, 0) + (maintenanceCosts?.total || 0);
    const totalAllExpenses = allExpenses.reduce((s, e) => s + e.total, 0) + (maintenanceCosts?.total || 0);
    
    res.json({
      year,
      rental_income: rentCollected?.total || 0,
      total_deductible_expenses: totalDeductible,
      total_all_expenses: totalAllExpenses,
      net_rental_income: (rentCollected?.total || 0) - totalDeductible,
      maintenance_costs: maintenanceCosts?.total || 0,
      expense_breakdown: allExpenses,
      deductible_breakdown: deductibleExpenses,
      property_count: propertyCount?.count || 0,
      // Schedule E line items
      schedule_e: {
        line_3_rents_received: rentCollected?.total || 0,
        line_5_advertising: allExpenses.find(e => e.category === 'Marketing')?.total || 0,
        line_7_cleaning_maintenance: (allExpenses.find(e => e.category === 'Cleaning')?.total || 0) + (allExpenses.find(e => e.category === 'Landscaping')?.total || 0),
        line_8_commissions: 0,
        line_9_insurance: allExpenses.find(e => e.category === 'Insurance')?.total || 0,
        line_10_legal: allExpenses.find(e => e.category === 'Legal')?.total || 0,
        line_11_management_fees: allExpenses.find(e => e.category === 'Management Fee')?.total || 0,
        line_12_mortgage_interest: allExpenses.find(e => e.category === 'Mortgage')?.total || 0,
        line_14_repairs: (allExpenses.find(e => e.category === 'Repairs')?.total || 0) + (maintenanceCosts?.total || 0),
        line_16_taxes: allExpenses.find(e => e.category === 'Property Tax')?.total || 0,
        line_17_utilities: allExpenses.find(e => e.category === 'Utilities')?.total || 0,
        line_18_hoa: allExpenses.find(e => e.category === 'HOA Fees')?.total || 0,
        line_19_other: allExpenses.find(e => e.category === 'Other')?.total || 0,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DASHBOARD STATS ============
protectedRouter.get('/dashboard/stats', (req, res) => {
  try {
    const db = getDb();
    const properties = db.prepare('SELECT * FROM properties WHERE account_id = ?').all(req.accountId);
    const maintenance = db.prepare('SELECT * FROM maintenance_requests WHERE account_id = ?').all(req.accountId);
    const account = db.prepare('SELECT * FROM accounts WHERE account_id = ?').get(req.accountId);
    
    const totalProperties = properties.length;
    const occupiedProperties = properties.filter(p => p.status === 'Active' || p.status === 'Occupied').length;
    const totalRent = properties
      .filter(p => p.status === 'Active' || p.status === 'Occupied')
      .reduce((sum, p) => sum + (parseFloat(p.monthly_rent) || 0), 0);
    const openMaintenance = maintenance.filter(m => m.status !== 'Completed').length;
    
    res.json({
      totalProperties,
      occupiedProperties,
      vacancyRate: totalProperties > 0 ? ((totalProperties - occupiedProperties) / totalProperties * 100).toFixed(1) : 0,
      totalMonthlyRent: totalRent.toFixed(2),
      openMaintenanceRequests: openMaintenance,
      subscription: {
        tier: account.subscription_tier,
        status: account.subscription_status,
        property_limit: account.property_limit,
        trial_ends_at: account.trial_ends_at,
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DOCUMENTS ROUTES ============
protectedRouter.get('/documents', (req, res) => {
  try {
    const db = getDb();
    const documents = db.prepare('SELECT * FROM documents WHERE account_id = ? ORDER BY created_at DESC').all(req.accountId);
    
    const result = documents.map(d => ({
      name: d.filename,
      originalName: d.original_name,
      path: `/api/documents/${d.document_id}`,
      size: d.file_size,
      type: d.file_type,
      modified: d.created_at,
    }));
    
    // Also include legacy documents from filesystem
    const documentsPath = join(__dirname, '../documents');
    if (fs.existsSync(documentsPath)) {
      const files = fs.readdirSync(documentsPath).filter(f => !fs.statSync(join(documentsPath, f)).isDirectory());
      files.forEach(f => {
        const stats = fs.statSync(join(documentsPath, f));
        result.push({
          name: f,
          path: `/api/documents/file/${f}`,
          size: stats.size,
          modified: stats.mtime,
          type: f.split('.').pop()
        });
      });
    }
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.get('/documents/file/:filename', (req, res) => {
  try {
    const documentsPath = join(__dirname, '../documents');
    const filePath = join(documentsPath, req.params.filename);
    
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Document not found' });
    
    const ext = req.params.filename.split('.').pop().toLowerCase();
    const textFormats = ['md', 'txt', 'json', 'csv'];
    
    if (textFormats.includes(ext)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.json({ filename: req.params.filename, content, type: ext });
    } else {
      res.sendFile(filePath);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.post('/documents/upload', upload.single('document'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const db = getDb();
    const docId = generateId('DOC');
    
    db.prepare(`
      INSERT INTO documents (document_id, account_id, filename, original_name, file_path, file_size, file_type)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(docId, req.accountId, req.file.filename, req.file.originalname, req.file.path, req.file.size, req.file.mimetype);
    
    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        name: req.file.filename,
        originalName: req.file.originalname,
        path: `/api/documents/${docId}`,
        size: req.file.size,
        type: req.file.mimetype
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.delete('/documents/:id', (req, res) => {
  try {
    const db = getDb();
    const doc = db.prepare('SELECT * FROM documents WHERE document_id = ? AND account_id = ?').get(req.params.id, req.accountId);
    
    if (doc) {
      // Delete from DB
      if (doc.file_path && fs.existsSync(doc.file_path)) fs.unlinkSync(doc.file_path);
      db.prepare('DELETE FROM documents WHERE document_id = ? AND account_id = ?').run(req.params.id, req.accountId);
      return res.json({ message: 'Document deleted successfully' });
    }
    
    // Try legacy file deletion
    const documentsPath = join(__dirname, '../documents');
    const filePath = join(documentsPath, req.params.id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ message: 'Document deleted successfully', filename: req.params.id });
    }
    
    res.status(404).json({ error: 'Document not found' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CLIENTS ROUTE ============
protectedRouter.get('/clients', (req, res) => {
  // Return empty for now - clients will be derived from tenant/property data
  res.json([]);
});

// ============ PAYMENTS ROUTES (STRIPE INTEGRATION) ============

protectedRouter.post('/payments/create-checkout-session', validate(paymentSchema), async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) return;

    const { tenantId, propertyId, amount, type, description } = req.body;
    const db = getDb();
    
    const property = db.prepare('SELECT * FROM properties WHERE property_id = ? AND account_id = ?').get(propertyId, req.accountId);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'us_bank_account'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} Payment`,
            description: description || `${type} payment for ${property.address}`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payments/cancel`,
      metadata: { tenantId, propertyId, type, accountId: req.accountId },
    });
    
    const paymentId = generateId('PAY');
    db.prepare(`
      INSERT INTO payments (payment_id, account_id, tenant_id, property_id, amount, transaction_fee, net_amount, payment_method, status, stripe_payment_intent_id, notes)
      VALUES (?, ?, ?, ?, ?, 0, 0, 'Pending', 'Pending', ?, ?)
    `).run(paymentId, req.accountId, tenantId, propertyId, amount.toFixed(2), session.id, description || `${type} payment`);
    
    res.json({ sessionId: session.id, url: session.url, paymentId });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.get('/payments/tenant/:tenantId', (req, res) => {
  try {
    const db = getDb();
    const payments = db.prepare('SELECT * FROM payments WHERE tenant_id = ? AND account_id = ?').all(req.params.tenantId, req.accountId);
    
    res.json(payments.map(p => ({
      Payment_ID: p.payment_id, Tenant_ID: p.tenant_id,
      Property_ID: p.property_id, Amount: p.amount,
      Transaction_Fee: p.transaction_fee, Net_Amount: p.net_amount,
      Payment_Method: p.payment_method, Status: p.status,
      Stripe_Payment_Intent_ID: p.stripe_payment_intent_id,
      Date_Created: p.date_created, Date_Completed: p.date_completed,
      Notes: p.notes,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.get('/payments/property/:propertyId', (req, res) => {
  try {
    const db = getDb();
    const payments = db.prepare('SELECT * FROM payments WHERE property_id = ? AND account_id = ?').all(req.params.propertyId, req.accountId);
    
    res.json(payments.map(p => ({
      Payment_ID: p.payment_id, Tenant_ID: p.tenant_id,
      Property_ID: p.property_id, Amount: p.amount,
      Transaction_Fee: p.transaction_fee, Net_Amount: p.net_amount,
      Payment_Method: p.payment_method, Status: p.status,
      Stripe_Payment_Intent_ID: p.stripe_payment_intent_id,
      Date_Created: p.date_created, Date_Completed: p.date_completed,
      Notes: p.notes,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.get('/payments', (req, res) => {
  try {
    const db = getDb();
    const payments = db.prepare('SELECT * FROM payments WHERE account_id = ? ORDER BY date_created DESC').all(req.accountId);
    
    res.json(payments.map(p => ({
      Payment_ID: p.payment_id, Tenant_ID: p.tenant_id,
      Property_ID: p.property_id, Amount: p.amount,
      Transaction_Fee: p.transaction_fee, Net_Amount: p.net_amount,
      Payment_Method: p.payment_method, Status: p.status,
      Stripe_Payment_Intent_ID: p.stripe_payment_intent_id,
      Date_Created: p.date_created, Date_Completed: p.date_completed,
      Notes: p.notes,
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.post('/payments/create-payment-link', validate(paymentSchema), async (req, res) => {
  try {
    if (!ensureStripeConfigured(res)) return;

    const { tenantId, propertyId, amount, type, description } = req.body;
    const db = getDb();
    
    const property = db.prepare('SELECT * FROM properties WHERE property_id = ? AND account_id = ?').get(propertyId, req.accountId);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} Payment`,
            description: description || `${type} payment for ${property.address}`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      metadata: { tenantId, propertyId, type, accountId: req.accountId },
    });
    
    res.json({ url: paymentLink.url, id: paymentLink.id });
  } catch (error) {
    console.error('Payment link creation error:', error);
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.get('/payments/stats', (req, res) => {
  try {
    const db = getDb();
    const payments = db.prepare('SELECT * FROM payments WHERE account_id = ?').all(req.accountId);
    
    const stats = {
      total_revenue: 0, total_fees: 0, net_revenue: 0,
      total_payments: payments.length,
      completed_payments: 0, pending_payments: 0, failed_payments: 0,
      by_method: { Card: 0, ACH: 0 }
    };
    
    payments.forEach(payment => {
      const amount = parseFloat(payment.amount) || 0;
      const fee = parseFloat(payment.transaction_fee) || 0;
      const netAmount = parseFloat(payment.net_amount) || 0;
      
      if (payment.status === 'Completed') {
        stats.total_revenue += amount;
        stats.total_fees += fee;
        stats.net_revenue += netAmount;
        stats.completed_payments++;
        if (payment.payment_method === 'Card' || payment.payment_method === 'ACH') {
          stats.by_method[payment.payment_method]++;
        }
      } else if (payment.status === 'Pending') {
        stats.pending_payments++;
      } else if (payment.status === 'Failed') {
        stats.failed_payments++;
      }
    });
    
    stats.total_revenue = parseFloat(stats.total_revenue.toFixed(2));
    stats.total_fees = parseFloat(stats.total_fees.toFixed(2));
    stats.net_revenue = parseFloat(stats.net_revenue.toFixed(2));
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Tenants CRUD ────────────────────────────────────────────────────────────

protectedRouter.get('/tenants', (req, res) => {
  try {
    const db = getDb();
    // Include tenants from the dedicated tenants table
    const dedicatedTenants = db.prepare(`
      SELECT t.tenant_id, t.tenant_name, t.email, t.phone, t.property_id,
             p.address, p.city, p.state,
             t.lease_start, t.lease_end, t.monthly_rent, t.security_deposit,
             t.status, t.notes, t.portal_token, t.created_at,
             'tenant' as source
      FROM tenants t
      LEFT JOIN properties p ON t.property_id = p.property_id
      WHERE t.account_id = ?
    `).all(req.accountId);

    // IDs of properties already covered by dedicated tenant records
    const coveredPropertyIds = new Set(dedicatedTenants.map(t => t.property_id).filter(Boolean));

    // Also pull tenant info directly from properties that have tenant_name set
    // but no dedicated tenant record yet (legacy data)
    const propertyTenants = db.prepare(`
      SELECT
        p.property_id as tenant_id,
        p.tenant_name, p.owner_email as email, p.tenant_phone as phone,
        p.property_id, p.address, p.city, p.state,
        p.lease_start, p.lease_end, p.monthly_rent,
        NULL as security_deposit,
        p.status, p.notes, NULL as portal_token,
        p.date_added as created_at,
        'property' as source
      FROM properties p
      WHERE p.account_id = ?
        AND p.tenant_name IS NOT NULL
        AND TRIM(p.tenant_name) != ''
    `).all(req.accountId).filter(p => !coveredPropertyIds.has(p.property_id));

    const all = [...dedicatedTenants, ...propertyTenants]
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    res.json(all);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.get('/tenants/:id', (req, res) => {
  try {
    const db = getDb();
    const tenant = db.prepare(`
      SELECT t.*, p.address, p.city, p.state, p.monthly_rent
      FROM tenants t
      LEFT JOIN properties p ON t.property_id = p.property_id
      WHERE t.tenant_id = ? AND t.account_id = ?
    `).get(req.params.id, req.accountId);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.post('/tenants', (req, res) => {
  try {
    const db = getDb();
    const { tenant_name, email, phone, property_id, lease_start, lease_end, monthly_rent, security_deposit, status, notes } = req.body;
    if (!tenant_name) return res.status(400).json({ error: 'tenant_name is required' });
    const tenantId = uuidv4();
    const portalToken = uuidv4();
    db.prepare(`
      INSERT INTO tenants (tenant_id, account_id, property_id, tenant_name, email, phone, lease_start, lease_end, monthly_rent, security_deposit, status, notes, portal_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(tenantId, req.accountId, property_id || null, tenant_name, email || null, phone || null, lease_start || null, lease_end || null, monthly_rent || null, security_deposit || null, status || 'Active', notes || null, portalToken);
    // Also update property's tenant info
    if (property_id) {
      db.prepare(`UPDATE properties SET tenant_name = ?, tenant_phone = ?, lease_start = ?, lease_end = ?, monthly_rent = COALESCE(?, monthly_rent) WHERE property_id = ? AND account_id = ?`)
        .run(tenant_name, phone || null, lease_start || null, lease_end || null, monthly_rent || null, property_id, req.accountId);
    }
    const tenant = db.prepare('SELECT * FROM tenants WHERE tenant_id = ?').get(tenantId);
    res.status(201).json(tenant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.put('/tenants/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM tenants WHERE tenant_id = ? AND account_id = ?').get(req.params.id, req.accountId);
    if (!existing) return res.status(404).json({ error: 'Tenant not found' });
    const { tenant_name, email, phone, property_id, lease_start, lease_end, monthly_rent, security_deposit, status, notes } = req.body;
    db.prepare(`
      UPDATE tenants SET tenant_name = ?, email = ?, phone = ?, property_id = ?, lease_start = ?, lease_end = ?, monthly_rent = ?, security_deposit = ?, status = ?, notes = ?
      WHERE tenant_id = ? AND account_id = ?
    `).run(tenant_name || existing.tenant_name, email || existing.email, phone || existing.phone, property_id || existing.property_id, lease_start || existing.lease_start, lease_end || existing.lease_end, monthly_rent || existing.monthly_rent, security_deposit || existing.security_deposit, status || existing.status, notes || existing.notes, req.params.id, req.accountId);
    const tenant = db.prepare('SELECT * FROM tenants WHERE tenant_id = ?').get(req.params.id);
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

protectedRouter.delete('/tenants/:id', (req, res) => {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM tenants WHERE tenant_id = ? AND account_id = ?').get(req.params.id, req.accountId);
    if (!existing) return res.status(404).json({ error: 'Tenant not found' });
    db.prepare('DELETE FROM tenants WHERE tenant_id = ? AND account_id = ?').run(req.params.id, req.accountId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Tenant portal token lookup (public - no auth needed)
app.get('/api/tenant-portal/:token', (req, res) => {
  try {
    const db = getDb();
    const tenant = db.prepare(`
      SELECT t.tenant_id, t.tenant_name, t.email, t.phone, t.lease_start, t.lease_end, t.monthly_rent, t.security_deposit, t.status, t.notes,
             p.address, p.city, p.state, p.monthly_rent as property_rent
      FROM tenants t
      LEFT JOIN properties p ON t.property_id = p.property_id
      WHERE t.portal_token = ?
    `).get(req.params.token);
    if (!tenant) return res.status(404).json({ error: 'Invalid portal link' });
    // Include payment history
    const payments = db.prepare(`
      SELECT * FROM payments WHERE tenant_id = ? ORDER BY date_created DESC LIMIT 12
    `).all(tenant.tenant_id);
    res.json({ tenant, payments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get portal token for a tenant (protected)
protectedRouter.get('/tenants/:id/portal-link', (req, res) => {
  try {
    const db = getDb();
    let tenant = db.prepare('SELECT tenant_id, portal_token FROM tenants WHERE tenant_id = ? AND account_id = ?').get(req.params.id, req.accountId);

    // If not found in tenants table, the ID might be a property_id (legacy/property-sourced tenant)
    if (!tenant) {
      const prop = db.prepare('SELECT * FROM properties WHERE property_id = ? AND account_id = ?').get(req.params.id, req.accountId);
      if (!prop || !prop.tenant_name) return res.status(404).json({ error: 'Tenant not found' });

      // Auto-migrate this property tenant into the tenants table
      const newTenantId = req.params.id; // reuse property_id as tenant_id for consistency
      const portalToken = uuidv4();
      db.prepare(`
        INSERT OR IGNORE INTO tenants
          (tenant_id, account_id, property_id, tenant_name, email, phone, lease_start, lease_end, monthly_rent, status, portal_token)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(newTenantId, req.accountId, prop.property_id, prop.tenant_name, prop.owner_email || null, prop.tenant_phone || null, prop.lease_start || null, prop.lease_end || null, prop.monthly_rent || null, prop.status || 'Active', portalToken);

      tenant = db.prepare('SELECT tenant_id, portal_token FROM tenants WHERE tenant_id = ?').get(newTenantId);
    }

    // If token is missing (old record), assign one now
    if (!tenant.portal_token) {
      const portalToken = uuidv4();
      db.prepare('UPDATE tenants SET portal_token = ? WHERE tenant_id = ?').run(portalToken, tenant.tenant_id);
      tenant.portal_token = portalToken;
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.json({ url: `${baseUrl}/tenant-portal/${tenant.portal_token}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Payment webhook (public - no auth)
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  try {
    if (!ensureStripeConfigured(res)) return;

    let event;
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }
    
    const db = getDb();
    
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode === 'payment') {
          const payment = db.prepare('SELECT * FROM payments WHERE stripe_payment_intent_id = ?').get(session.id);
          if (payment) {
            const amount = session.amount_total / 100;
            const paymentMethod = session.payment_method_types?.includes('us_bank_account') ? 'ACH' : 'Card';
            const fees = calculateFees(amount, paymentMethod);
            
            db.prepare(`
              UPDATE payments SET amount = ?, transaction_fee = ?, net_amount = ?, payment_method = ?, status = 'Completed', date_completed = ?
              WHERE payment_id = ?
            `).run(fees.amount, fees.fee, fees.netAmount, paymentMethod, new Date().toISOString(), payment.payment_id);
            
            console.log(`✅ Payment completed: ${payment.payment_id}`);
          }
        }
        break;
      }
      case 'checkout.session.expired':
      case 'payment_intent.payment_failed': {
        const session = event.data.object;
        const payment = db.prepare('SELECT * FROM payments WHERE stripe_payment_intent_id = ? OR stripe_payment_intent_id = ?').get(
          session.id, session.payment_intent
        );
        if (payment) {
          db.prepare("UPDATE payments SET status = 'Failed' WHERE payment_id = ?").run(payment.payment_id);
          console.log(`❌ Payment failed: ${payment.payment_id}`);
        }
        break;
      }
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mount protected routes
app.use('/api', protectedRouter);

// ============ PUBLIC ROUTES ============

// ─── Lead Capture (ROI Calculator) ───
app.post('/api/leads', (req, res) => {
  try {
    const { email, source, calculatorInputs, calculatorResults } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const db = getDb();
    db.prepare(`
      CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        source TEXT DEFAULT 'roi_calculator',
        calculator_inputs TEXT,
        calculator_results TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `).run();

    db.prepare(`
      INSERT INTO leads (email, source, calculator_inputs, calculator_results)
      VALUES (?, ?, ?, ?)
    `).run(
      email,
      source || 'roi_calculator',
      calculatorInputs ? JSON.stringify(calculatorInputs) : null,
      calculatorResults ? JSON.stringify(calculatorResults) : null
    );

    res.json({ success: true, message: 'Lead captured' });
  } catch (error) {
    console.error('Lead capture error:', error);
    res.json({ success: true }); // Don't fail silently for UX
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'TrueNorth PM SaaS API is running',
    version: '3.0.0'
  });
});

// Root / API docs
app.get('/', (req, res) => {
  res.json({
    name: 'TrueNorth PM SaaS API',
    version: '3.0.0',
    description: 'Multi-tenant Property Management SaaS Platform',
    authentication: 'Bearer token (JWT) required for all /api/* routes',
    public_endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      health: 'GET /health',
      payment_webhook: 'POST /api/payments/webhook',
      subscription_webhook: 'POST /api/subscription/webhook',
    },
    protected_endpoints: {
      auth: {
        me: 'GET /api/auth/me',
        profile: 'PUT /api/auth/profile',
        invite: 'POST /api/auth/invite',
        team: 'GET /api/auth/team',
        removeTeam: 'DELETE /api/auth/team/:userId',
      },
      subscription: {
        info: 'GET /api/subscription',
        checkout: 'POST /api/subscription/create-checkout',
        portal: 'POST /api/subscription/portal',
      },
      properties: { getAll: 'GET /api/properties', getOne: 'GET /api/properties/:id', create: 'POST /api/properties', update: 'PUT /api/properties/:id', delete: 'DELETE /api/properties/:id' },
      maintenance: { getAll: 'GET /api/maintenance', getOne: 'GET /api/maintenance/:id', create: 'POST /api/maintenance', update: 'PUT /api/maintenance/:id', delete: 'DELETE /api/maintenance/:id' },
      vendors: { getAll: 'GET /api/vendors', getOne: 'GET /api/vendors/:id', create: 'POST /api/vendors', update: 'PUT /api/vendors/:id', delete: 'DELETE /api/vendors/:id' },
      documents: { list: 'GET /api/documents', get: 'GET /api/documents/file/:filename', upload: 'POST /api/documents/upload', delete: 'DELETE /api/documents/:id' },
      financials: { revenue: 'GET /api/financials/revenue', summary: 'GET /api/financials/summary' },
      payments: { getAll: 'GET /api/payments', getByTenant: 'GET /api/payments/tenant/:tenantId', getByProperty: 'GET /api/payments/property/:propertyId', stats: 'GET /api/payments/stats', createCheckout: 'POST /api/payments/create-checkout-session', createPaymentLink: 'POST /api/payments/create-payment-link' },
      stats: 'GET /api/dashboard/stats',
    },
    subscription_tiers: SUBSCRIPTION_TIERS,
  });
});

// Error handling middleware (must be last)
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 TrueNorth PM SaaS v3.0.0 running on http://localhost:${PORT}`);
  console.log(`📊 API Health: http://localhost:${PORT}/health`);
  console.log(`📖 API Docs: http://localhost:${PORT}`);
  console.log(`\n✨ Multi-Tenant SaaS Features:`);
  console.log(`   ✅ JWT Authentication & Authorization`);
  console.log(`   ✅ Multi-tenant data isolation (SQLite)`);
  console.log(`   ✅ Tiered subscriptions (Starter / Professional / Enterprise)`);
  console.log(`   ✅ Team management with roles (admin / manager / viewer)`);
  console.log(`   ✅ Property limits by subscription tier`);
  console.log(`   ✅ Stripe subscription + payment processing`);
  console.log(`   ✅ Full CRUD for Properties, Maintenance, Vendors, Documents`);
  console.log(`   ✅ 14-day free trial for new accounts\n`);
});
