# TrueNorth PM API v2.0.0 Documentation

## Overview

The TrueNorth PM API is a full-featured RESTful API built with Node.js and Express. It provides complete CRUD operations for properties, maintenance requests, vendors, and documents with persistent CSV storage.

## Base URL
```
http://localhost:3001
```

## Features

✅ **Full CRUD Operations** - Create, Read, Update, Delete for all resources  
✅ **CSV File Persistence** - All data changes are written back to CSV files  
✅ **Input Validation** - Joi schema validation for all POST/PUT requests  
✅ **Document Upload** - Support for PDF, DOC, DOCX, TXT, MD, JPG, PNG files  
✅ **CORS Enabled** - Cross-origin requests supported  
✅ **Error Handling** - Comprehensive error responses with appropriate HTTP status codes  
✅ **Concurrent Requests** - Handles multiple simultaneous requests  

---

## API Endpoints

### Health Check

**GET** `/health`

Returns the API health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-16T21:43:21.210Z",
  "message": "TrueNorth PM API is running"
}
```

---

## Properties

### Get All Properties

**GET** `/api/properties`

Returns all properties.

**Response:**
```json
[
  {
    "Property_ID": "PROP001",
    "Owner_Name": "James Anderson",
    "Owner_Email": "james.anderson@email.com",
    "Owner_Phone": "555-0101",
    "Address": "123 Maple Street",
    "City": "Boston",
    "State": "MA",
    "Zip": "02108",
    "Bedrooms": "3",
    "Bathrooms": "2",
    "Square_Feet": "1500",
    "Monthly_Rent": "2800",
    "Status": "Active",
    ...
  }
]
```

### Get Single Property

**GET** `/api/properties/:id`

Returns a single property by ID.

**Response:**
```json
{
  "Property_ID": "PROP001",
  "Owner_Name": "James Anderson",
  ...
}
```

**Error Response (404):**
```json
{
  "error": "Property not found"
}
```

### Create Property

**POST** `/api/properties`

Creates a new property.

**Request Body:**
```json
{
  "Owner_Name": "John Doe",
  "Owner_Email": "john@example.com",
  "Owner_Phone": "555-1234",
  "Address": "123 Main St",
  "City": "Boston",
  "State": "MA",
  "Zip": "02101",
  "Bedrooms": 2,
  "Bathrooms": 1.5,
  "Square_Feet": 1200,
  "Monthly_Rent": 2500,
  "Status": "Vacant",
  "Notes": "Optional notes"
}
```

**Response (201):**
```json
{
  "message": "Property created successfully",
  "property": {
    "Property_ID": "PROPD0EB7BCC",
    "Owner_Name": "John Doe",
    "Date_Added": "2026-02-16",
    "Management_Fee_Percent": 10,
    ...
  }
}
```

**Validation Requirements:**
- `Owner_Name`: Required
- `Owner_Email`: Required, must be valid email
- `Owner_Phone`: Required
- `Address`: Required
- `City`: Required
- `State`: Required, must be 2 characters
- `Zip`: Required
- `Bedrooms`: Required, integer, minimum 0
- `Bathrooms`: Required, number, minimum 0
- `Square_Feet`: Required, integer, minimum 0
- `Monthly_Rent`: Required, number, minimum 0
- `Status`: Required, must be "Active", "Vacant", or "Maintenance"

### Update Property

**PUT** `/api/properties/:id`

Updates an existing property. Preserves `Property_ID` and `Date_Added`.

**Request Body:** Same as Create Property

**Response (200):**
```json
{
  "message": "Property updated successfully",
  "property": { ... }
}
```

### Delete Property

**DELETE** `/api/properties/:id`

Deletes a property.

**Response (200):**
```json
{
  "message": "Property deleted successfully",
  "property": { ... }
}
```

---

## Maintenance Requests

### Get All Maintenance Requests

**GET** `/api/maintenance`

Returns all maintenance requests.

### Get Single Maintenance Request

**GET** `/api/maintenance/:id`

Returns a single maintenance request by ID.

### Create Maintenance Request

**POST** `/api/maintenance`

Creates a new maintenance request.

**Request Body:**
```json
{
  "Date_Submitted": "2026-02-16",
  "Property_ID": "PROP001",
  "Address": "123 Main St",
  "Tenant_Name": "Jane Doe",
  "Issue_Description": "Leaking faucet",
  "Category": "Plumbing",
  "Priority": "Medium",
  "Status": "Pending"
}
```

**Validation Requirements:**
- `Date_Submitted`: Required
- `Property_ID`: Required
- `Address`: Required
- `Issue_Description`: Required
- `Category`: Required, must be one of: "Plumbing", "HVAC", "Electrical", "Appliance", "General Maintenance", "Other"
- `Priority`: Required, must be one of: "Low", "Medium", "High", "Emergency"
- `Status`: Required, must be one of: "Pending", "Assigned", "In Progress", "Completed", "Cancelled"

**Response (201):**
```json
{
  "message": "Maintenance request created successfully",
  "request": {
    "Request_ID": "MRB0BC5DC4",
    "Date_Submitted": "2026-02-16",
    "Owner_Approved": "Pending",
    ...
  }
}
```

### Update Maintenance Request

**PUT** `/api/maintenance/:id`

Updates a maintenance request. Preserves `Request_ID` and `Date_Submitted`.

### Delete Maintenance Request

**DELETE** `/api/maintenance/:id`

Deletes a maintenance request.

---

## Vendors

### Get All Vendors

**GET** `/api/vendors`

Returns all vendors.

### Get Single Vendor

**GET** `/api/vendors/:id`

Returns a single vendor by ID.

### Create Vendor

**POST** `/api/vendors`

Creates a new vendor.

**Request Body:**
```json
{
  "Company_Name": "ABC Plumbing",
  "Contact_Name": "John Smith",
  "Phone": "555-1234",
  "Email": "john@abcplumbing.com",
  "Category": "Plumbing",
  "Service_Area": "Boston",
  "Hourly_Rate": 125,
  "Response_Time": "Same Day",
  "Insurance_Verified": "Yes",
  "License_Number": "PL-12345",
  "Rating": 4.5
}
```

**Validation Requirements:**
- `Company_Name`: Required
- `Contact_Name`: Required
- `Phone`: Required
- `Email`: Required, must be valid email
- `Category`: Required
- `Service_Area`: Required
- `Hourly_Rate`: Required, number, minimum 0
- `Response_Time`: Required
- `Insurance_Verified`: Required, must be "Yes" or "No"
- `Rating`: Optional, number 0-5

**Response (201):**
```json
{
  "message": "Vendor created successfully",
  "vendor": {
    "Vendor_ID": "VEN4CF4C354",
    ...
  }
}
```

### Update Vendor

**PUT** `/api/vendors/:id`

Updates a vendor. Preserves `Vendor_ID`.

### Delete Vendor

**DELETE** `/api/vendors/:id`

Deletes a vendor.

---

## Documents

### List All Documents

**GET** `/api/documents`

Returns all documents with metadata.

**Response:**
```json
[
  {
    "name": "lease-template.md",
    "path": "/api/documents/lease-template.md",
    "size": 2048,
    "modified": "2026-02-16T10:30:00.000Z",
    "type": "md"
  }
]
```

### Get Document

**GET** `/api/documents/:filename`

Returns document content (for text files) or file download (for binary files).

**Response (text file):**
```json
{
  "filename": "lease-template.md",
  "content": "# Lease Agreement\n...",
  "type": "md"
}
```

**Response (binary file):**
Binary file download

### Upload Document

**POST** `/api/documents/upload`

Uploads a document.

**Request:** `multipart/form-data` with field name `document`

**Allowed File Types:** PDF, DOC, DOCX, TXT, MD, JPG, JPEG, PNG  
**Max File Size:** 10MB

**Example with curl:**
```bash
curl -X POST http://localhost:3001/api/documents/upload \
  -F "document=@/path/to/file.pdf"
```

**Response (201):**
```json
{
  "message": "Document uploaded successfully",
  "document": {
    "name": "1771278396776-file.pdf",
    "originalName": "file.pdf",
    "path": "/api/documents/1771278396776-file.pdf",
    "size": 54321,
    "type": "application/pdf"
  }
}
```

### Delete Document

**DELETE** `/api/documents/:filename`

Deletes a document.

**Response (200):**
```json
{
  "message": "Document deleted successfully",
  "filename": "1771278396776-file.pdf"
}
```

---

## Financials

### Get Revenue Data

**GET** `/api/financials/revenue`

Returns all revenue tracking data from CSV.

### Get Financial Summary

**GET** `/api/financials/summary`

Returns aggregated financial statistics.

**Response:**
```json
{
  "total_revenue": 45000,
  "total_profit": 22500,
  "avg_properties": 8.5
}
```

---

## Clients

### Get All Clients

**GET** `/api/clients`

Returns all client acquisition data from CSV.

---

## Dashboard Stats

### Get Dashboard Statistics

**GET** `/api/dashboard/stats`

Returns key property management statistics.

**Response:**
```json
{
  "totalProperties": 8,
  "occupiedProperties": 6,
  "vacancyRate": "25.0",
  "totalMonthlyRent": "18700.00",
  "openMaintenanceRequests": 5
}
```

---

## Error Responses

### Validation Error (400)
```json
{
  "error": "Validation error",
  "details": [
    "\"Owner_Email\" must be a valid email"
  ]
}
```

### Not Found (404)
```json
{
  "error": "Property not found"
}
```

### Conflict (409)
```json
{
  "error": "Property ID already exists"
}
```

### Server Error (500)
```json
{
  "error": "Internal server error"
}
```

---

## Testing the API

### Using curl

**Create a Property:**
```bash
curl -X POST http://localhost:3001/api/properties \
  -H "Content-Type: application/json" \
  -d '{
    "Owner_Name": "John Doe",
    "Owner_Email": "john@example.com",
    "Owner_Phone": "555-1234",
    "Address": "123 Main St",
    "City": "Boston",
    "State": "MA",
    "Zip": "02101",
    "Bedrooms": 3,
    "Bathrooms": 2,
    "Square_Feet": 1500,
    "Monthly_Rent": 2800,
    "Status": "Vacant"
  }'
```

**Update a Property:**
```bash
curl -X PUT http://localhost:3001/api/properties/PROP001 \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

**Delete a Property:**
```bash
curl -X DELETE http://localhost:3001/api/properties/PROP001
```

**Upload a Document:**
```bash
curl -X POST http://localhost:3001/api/documents/upload \
  -F "document=@/path/to/file.pdf"
```

### Using JavaScript/Fetch

```javascript
// Create a property
const response = await fetch('http://localhost:3001/api/properties', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    Owner_Name: 'John Doe',
    Owner_Email: 'john@example.com',
    // ... other fields
  }),
});

const result = await response.json();
console.log(result);
```

---

## Technical Details

### Dependencies
- **express** - Web framework
- **cors** - Cross-origin resource sharing
- **multer** - File upload handling
- **joi** - Schema validation
- **uuid** - Unique ID generation

### Data Persistence
All data is stored in CSV files located in:
- `/tracking/properties.csv`
- `/tracking/maintenance-requests.csv`
- `/tracking/vendor-database.csv`
- `/financials/monthly-revenue-tracker.csv`
- `/tracking/client-acquisition-tracker.csv`

### Auto-Generated Fields
- **Property_ID**: Generated with format `PROP{UUID}`
- **Request_ID**: Generated with format `MR{UUID}`
- **Vendor_ID**: Generated with format `VEN{UUID}`
- **Date_Added**: Auto-set to current date for properties
- **Management_Fee_Percent**: Defaults to 10 for properties
- **Owner_Approved**: Defaults to "Pending" for maintenance requests

---

## Running the Server

### Start Server
```bash
cd backend
node server.js
```

### Development Mode (Auto-restart)
```bash
cd backend
npm run dev
```

### Stop Server
```bash
# Find process on port 3001
lsof -ti:3001 | xargs kill -9
```

---

## Best Practices

1. **Always validate input** - The API validates all POST/PUT requests
2. **Check error responses** - Handle 400, 404, 409, and 500 status codes
3. **Use proper HTTP methods** - GET, POST, PUT, DELETE
4. **Handle file uploads properly** - Use multipart/form-data
5. **Limit concurrent writes** - CSV file writes are not atomic

---

## API Version History

### v2.0.0 (Current)
- ✅ Added full CRUD operations for properties, maintenance, vendors
- ✅ CSV write persistence
- ✅ Document upload and management
- ✅ Input validation with Joi
- ✅ Enhanced error handling
- ✅ CORS configuration

### v1.0.0
- Basic GET endpoints
- CSV reading only
- Simple document listing

---

For questions or issues, refer to the server logs or check the health endpoint.
