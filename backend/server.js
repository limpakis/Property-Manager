import express from 'express';
import cors from 'cors';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import Joi from 'joi';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = join(__dirname, '../documents');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedExtensions = /pdf|doc|docx|txt|md|jpg|jpeg|png/;
    const allowedMimeTypes = /pdf|msword|document|text|markdown|image/;
    const extname = allowedExtensions.test(file.originalname.toLowerCase());
    const mimetype = allowedMimeTypes.test(file.mimetype.toLowerCase());
    
    if (extname || mimetype) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type. Allowed: PDF, DOC, DOCX, TXT, MD, JPG, PNG'));
  }
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error' 
  });
});

// ============ HELPER FUNCTIONS ============

// Parse CSV text to array of objects
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue; // Skip empty lines
    
    const values = line.split(',');
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] ? values[index].trim() : '';
    });
    data.push(obj);
  }
  
  return data;
}

// Read CSV file
function readCSV(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return [];
    }
    const csvText = fs.readFileSync(filePath, 'utf8');
    return parseCSV(csvText);
  } catch (error) {
    console.log(`⚠️  Could not read ${filePath}:`, error.message);
    return [];
  }
}

// Convert array of objects to CSV text
function arrayToCSV(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvLines = [headers.join(',')];
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] || '';
      // Escape commas and quotes
      if (value.toString().includes(',') || value.toString().includes('"')) {
        return `"${value.toString().replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvLines.push(values.join(','));
  });
  
  return csvLines.join('\n');
}

// Write data to CSV file
function writeCSV(filePath, data) {
  try {
    const csvText = arrayToCSV(data);
    fs.writeFileSync(filePath, csvText, 'utf8');
    return true;
  } catch (error) {
    console.error(`❌ Error writing to ${filePath}:`, error.message);
    throw error;
  }
}

// Generate unique ID with prefix
function generateId(prefix) {
  const uid = uuidv4().split('-')[0].toUpperCase();
  return `${prefix}${uid}`;
}

// ============ VALIDATION SCHEMAS ============

const propertySchema = Joi.object({
  Property_ID: Joi.string().optional(),
  Owner_Name: Joi.string().required(),
  Owner_Email: Joi.string().email().required(),
  Owner_Phone: Joi.string().required(),
  Address: Joi.string().required(),
  City: Joi.string().required(),
  State: Joi.string().length(2).required(),
  Zip: Joi.string().required(),
  Bedrooms: Joi.number().integer().min(0).required(),
  Bathrooms: Joi.number().min(0).required(),
  Square_Feet: Joi.number().integer().min(0).required(),
  Monthly_Rent: Joi.number().min(0).required(),
  Status: Joi.string().valid('Active', 'Vacant', 'Maintenance').required(),
  Lease_Start: Joi.string().allow('').optional(),
  Lease_End: Joi.string().allow('').optional(),
  Tenant_Name: Joi.string().allow('').optional(),
  Tenant_Phone: Joi.string().allow('').optional(),
  Date_Added: Joi.string().optional(),
  Management_Fee_Percent: Joi.number().min(0).max(100).optional(),
  Notes: Joi.string().allow('').optional()
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

// Validation middleware
function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.details.map(d => d.message) 
      });
    }
    next();
  };
}

// Paths to CSV files
const trackingPath = join(__dirname, '../tracking');
const financialsPath = join(__dirname, '../financials');
const documentsPath = join(__dirname, '../documents');

// ============ PROPERTIES ROUTES ============
app.get('/api/properties', (req, res) => {
  try {
    const properties = readCSV(join(trackingPath, 'properties.csv'));
    res.json(properties);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/properties/:id', (req, res) => {
  try {
    const properties = readCSV(join(trackingPath, 'properties.csv'));
    const property = properties.find(p => p.Property_ID === req.params.id);
    
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    res.json(property);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/properties', validate(propertySchema), (req, res) => {
  try {
    const filePath = join(trackingPath, 'properties.csv');
    const properties = readCSV(filePath);
    
    // Generate new property ID
    const newProperty = {
      ...req.body,
      Property_ID: req.body.Property_ID || generateId('PROP'),
      Date_Added: req.body.Date_Added || new Date().toISOString().split('T')[0],
      Management_Fee_Percent: req.body.Management_Fee_Percent || 10
    };
    
    // Check for duplicate ID
    if (properties.find(p => p.Property_ID === newProperty.Property_ID)) {
      return res.status(409).json({ error: 'Property ID already exists' });
    }
    
    properties.push(newProperty);
    writeCSV(filePath, properties);
    
    res.status(201).json({ 
      message: 'Property created successfully', 
      property: newProperty 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/properties/:id', validate(propertySchema), (req, res) => {
  try {
    const filePath = join(trackingPath, 'properties.csv');
    const properties = readCSV(filePath);
    const index = properties.findIndex(p => p.Property_ID === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    // Preserve original Property_ID and Date_Added
    const updatedProperty = {
      ...req.body,
      Property_ID: properties[index].Property_ID,
      Date_Added: properties[index].Date_Added
    };
    
    properties[index] = updatedProperty;
    writeCSV(filePath, properties);
    
    res.json({ 
      message: 'Property updated successfully', 
      property: updatedProperty 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/properties/:id', (req, res) => {
  try {
    const filePath = join(trackingPath, 'properties.csv');
    const properties = readCSV(filePath);
    const index = properties.findIndex(p => p.Property_ID === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Property not found' });
    }
    
    const deletedProperty = properties[index];
    properties.splice(index, 1);
    writeCSV(filePath, properties);
    
    res.json({ 
      message: 'Property deleted successfully', 
      property: deletedProperty 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MAINTENANCE REQUESTS ROUTES ============
app.get('/api/maintenance', (req, res) => {
  try {
    const requests = readCSV(join(trackingPath, 'maintenance-requests.csv'));
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/maintenance/:id', (req, res) => {
  try {
    const requests = readCSV(join(trackingPath, 'maintenance-requests.csv'));
    const request = requests.find(r => r.Request_ID === req.params.id);
    
    if (!request) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }
    
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/maintenance', validate(maintenanceSchema), (req, res) => {
  try {
    const filePath = join(trackingPath, 'maintenance-requests.csv');
    const requests = readCSV(filePath);
    
    // Generate new request ID
    const newRequest = {
      ...req.body,
      Request_ID: req.body.Request_ID || generateId('MR'),
      Date_Submitted: req.body.Date_Submitted || new Date().toISOString().split('T')[0],
      Status: req.body.Status || 'Pending',
      Owner_Approved: req.body.Owner_Approved || 'Pending'
    };
    
    // Check for duplicate ID
    if (requests.find(r => r.Request_ID === newRequest.Request_ID)) {
      return res.status(409).json({ error: 'Request ID already exists' });
    }
    
    requests.push(newRequest);
    writeCSV(filePath, requests);
    
    res.status(201).json({ 
      message: 'Maintenance request created successfully', 
      request: newRequest 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/maintenance/:id', validate(maintenanceSchema), (req, res) => {
  try {
    const filePath = join(trackingPath, 'maintenance-requests.csv');
    const requests = readCSV(filePath);
    const index = requests.findIndex(r => r.Request_ID === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }
    
    // Preserve original Request_ID and Date_Submitted
    const updatedRequest = {
      ...req.body,
      Request_ID: requests[index].Request_ID,
      Date_Submitted: requests[index].Date_Submitted
    };
    
    requests[index] = updatedRequest;
    writeCSV(filePath, requests);
    
    res.json({ 
      message: 'Maintenance request updated successfully', 
      request: updatedRequest 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/maintenance/:id', (req, res) => {
  try {
    const filePath = join(trackingPath, 'maintenance-requests.csv');
    const requests = readCSV(filePath);
    const index = requests.findIndex(r => r.Request_ID === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }
    
    const deletedRequest = requests[index];
    requests.splice(index, 1);
    writeCSV(filePath, requests);
    
    res.json({ 
      message: 'Maintenance request deleted successfully', 
      request: deletedRequest 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ FINANCIAL ROUTES ============
app.get('/api/financials/revenue', (req, res) => {
  try {
    const revenue = readCSV(join(financialsPath, 'monthly-revenue-tracker.csv'));
    res.json(revenue);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/financials/summary', (req, res) => {
  try {
    const revenue = readCSV(join(financialsPath, 'monthly-revenue-tracker.csv'));
    const summary = {
      total_revenue: revenue.reduce((sum, r) => sum + parseFloat(r.Total_Revenue || 0), 0),
      total_profit: revenue.reduce((sum, r) => sum + parseFloat(r.Net_Profit || 0), 0),
      avg_properties: revenue.length > 0 ? 
        revenue.reduce((sum, r) => sum + parseInt(r.Properties_Under_Management || 0), 0) / revenue.length : 0
    };
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ VENDORS ROUTES ============
app.get('/api/vendors', (req, res) => {
  try {
    const vendors = readCSV(join(trackingPath, 'vendor-database.csv'));
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/vendors/:id', (req, res) => {
  try {
    const vendors = readCSV(join(trackingPath, 'vendor-database.csv'));
    const vendor = vendors.find(v => v.Vendor_ID === req.params.id);
    
    if (!vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    res.json(vendor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/vendors', validate(vendorSchema), (req, res) => {
  try {
    const filePath = join(trackingPath, 'vendor-database.csv');
    const vendors = readCSV(filePath);
    
    // Generate new vendor ID
    const newVendor = {
      ...req.body,
      Vendor_ID: req.body.Vendor_ID || generateId('VEN'),
      Rating: req.body.Rating || 0,
      Insurance_Verified: req.body.Insurance_Verified || 'No'
    };
    
    // Check for duplicate ID
    if (vendors.find(v => v.Vendor_ID === newVendor.Vendor_ID)) {
      return res.status(409).json({ error: 'Vendor ID already exists' });
    }
    
    vendors.push(newVendor);
    writeCSV(filePath, vendors);
    
    res.status(201).json({ 
      message: 'Vendor created successfully', 
      vendor: newVendor 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/vendors/:id', validate(vendorSchema), (req, res) => {
  try {
    const filePath = join(trackingPath, 'vendor-database.csv');
    const vendors = readCSV(filePath);
    const index = vendors.findIndex(v => v.Vendor_ID === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    // Preserve original Vendor_ID
    const updatedVendor = {
      ...req.body,
      Vendor_ID: vendors[index].Vendor_ID
    };
    
    vendors[index] = updatedVendor;
    writeCSV(filePath, vendors);
    
    res.json({ 
      message: 'Vendor updated successfully', 
      vendor: updatedVendor 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/vendors/:id', (req, res) => {
  try {
    const filePath = join(trackingPath, 'vendor-database.csv');
    const vendors = readCSV(filePath);
    const index = vendors.findIndex(v => v.Vendor_ID === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    
    const deletedVendor = vendors[index];
    vendors.splice(index, 1);
    writeCSV(filePath, vendors);
    
    res.json({ 
      message: 'Vendor deleted successfully', 
      vendor: deletedVendor 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CLIENT ACQUISITION ROUTES ============
app.get('/api/clients', (req, res) => {
  try {
    const clients = readCSV(join(trackingPath, 'client-acquisition-tracker.csv'));
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DASHBOARD STATS ============
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const properties = readCSV(join(trackingPath, 'properties.csv'));
    const maintenance = readCSV(join(trackingPath, 'maintenance-requests.csv'));
    
    const totalProperties = properties.length;
    const occupiedProperties = properties.filter(p => p.Status === 'Occupied').length;
    const totalRent = properties
      .filter(p => p.Status === 'Occupied')
      .reduce((sum, p) => sum + parseFloat(p.Monthly_Rent || 0), 0);
    const openMaintenance = maintenance.filter(m => m.Status !== 'Completed').length;
    
    res.json({
      totalProperties,
      occupiedProperties,
      vacancyRate: totalProperties > 0 ? ((totalProperties - occupiedProperties) / totalProperties * 100).toFixed(1) : 0,
      totalMonthlyRent: totalRent.toFixed(2),
      openMaintenanceRequests: openMaintenance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DOCUMENTS ROUTES ============
app.get('/api/documents', (req, res) => {
  try {
    const files = fs.readdirSync(documentsPath);
    const documents = files.map(f => {
      const stats = fs.statSync(join(documentsPath, f));
      return {
        name: f,
        path: `/api/documents/${f}`,
        size: stats.size,
        modified: stats.mtime,
        type: f.split('.').pop()
      };
    });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/documents/:filename', (req, res) => {
  try {
    const filePath = join(documentsPath, req.params.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Check if it's a text-based file
    const ext = req.params.filename.split('.').pop().toLowerCase();
    const textFormats = ['md', 'txt', 'json', 'csv'];
    
    if (textFormats.includes(ext)) {
      const content = fs.readFileSync(filePath, 'utf8');
      res.json({ filename: req.params.filename, content, type: ext });
    } else {
      // For binary files (images, PDFs, etc.), send the file directly
      res.sendFile(filePath);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/documents/upload', upload.single('document'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        name: req.file.filename,
        originalName: req.file.originalname,
        path: `/api/documents/${req.file.filename}`,
        size: req.file.size,
        type: req.file.mimetype
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/documents/:filename', (req, res) => {
  try {
    const filePath = join(documentsPath, req.params.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    fs.unlinkSync(filePath);
    
    res.json({ 
      message: 'Document deleted successfully',
      filename: req.params.filename
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Property Manager API is running'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Property Manager API',
    version: '2.0.0',
    description: 'Full CRUD API for Property Management',
    endpoints: {
      properties: {
        getAll: 'GET /api/properties',
        getOne: 'GET /api/properties/:id',
        create: 'POST /api/properties',
        update: 'PUT /api/properties/:id',
        delete: 'DELETE /api/properties/:id'
      },
      maintenance: {
        getAll: 'GET /api/maintenance',
        getOne: 'GET /api/maintenance/:id',
        create: 'POST /api/maintenance',
        update: 'PUT /api/maintenance/:id',
        delete: 'DELETE /api/maintenance/:id'
      },
      vendors: {
        getAll: 'GET /api/vendors',
        getOne: 'GET /api/vendors/:id',
        create: 'POST /api/vendors',
        update: 'PUT /api/vendors/:id',
        delete: 'DELETE /api/vendors/:id'
      },
      documents: {
        list: 'GET /api/documents',
        get: 'GET /api/documents/:filename',
        upload: 'POST /api/documents/upload',
        delete: 'DELETE /api/documents/:filename'
      },
      financials: {
        revenue: 'GET /api/financials/revenue',
        summary: 'GET /api/financials/summary'
      },
      clients: 'GET /api/clients',
      stats: 'GET /api/dashboard/stats',
      health: 'GET /health'
    }
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Property Manager Backend v2.0.0 running on http://localhost:${PORT}`);
  console.log(`📊 API Health Check: http://localhost:${PORT}/health`);
  console.log(`📖 API Documentation: http://localhost:${PORT}`);
  console.log(`\n✨ Features:`);
  console.log(`   ✅ Full CRUD operations for Properties, Maintenance, Vendors`);
  console.log(`   ✅ CSV file persistence`);
  console.log(`   ✅ Document upload and management`);
  console.log(`   ✅ Input validation with Joi`);
  console.log(`   ✅ CORS enabled for cross-origin requests`);
  console.log(`   ✅ Error handling and logging\n`);
});
