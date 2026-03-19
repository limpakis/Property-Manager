#!/usr/bin/env python3
"""
Seed the demo account with realistic property management data.
Run once: python3 scripts/seed_demo.py
"""

import json, sys, datetime, time
try:
    import urllib.request as req_lib
    import urllib.error
except ImportError:
    sys.exit("stdlib urllib not found")

BASE = "https://property-manager-production-a304.up.railway.app/api"
DEMO_EMAIL = "demo@truenorthpm.com"
DEMO_PASS  = "DemoAccess@2026"

# ─── helpers ─────────────────────────────────────────────────────────────────

def call(method, path, body=None, token=None):
    url  = BASE + path
    data = json.dumps(body).encode() if body else None
    r    = req_lib.Request(url, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("Authorization", f"Bearer {token}")
    try:
        with req_lib.urlopen(r, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err = e.read().decode()
        print(f"  ✗  {method} {path} → {e.code}: {err[:200]}")
        return None

def post(path, body, token):
    return call("POST", path, body, token)

def ok(label, result):
    if result:
        print(f"  ✓  {label}")
    return result

# ─── months helper ───────────────────────────────────────────────────────────

def months_back(n):
    """Return list of (month_name, year_str, YYYY-MM-DD) for last n months."""
    out = []
    today = datetime.date.today()
    for i in range(n, 0, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        dt = datetime.date(y, m, 1)
        out.append((dt.strftime("%B"), str(y), dt.strftime("%Y-%m-%d")))
    return out

# ─── login ───────────────────────────────────────────────────────────────────

print("→ Logging in as demo account …")
resp = post("/auth/login", {"email": DEMO_EMAIL, "password": DEMO_PASS}, token=None)
if not resp or "token" not in resp:
    sys.exit("Login failed – make sure the demo account exists.")
TOKEN = resp["token"]
print(f"  ✓  Logged in (account {resp['account']['account_id']})\n")

# ─── 1. PROPERTIES ───────────────────────────────────────────────────────────
print("→ Creating properties …")

props_data = [
    {
        "Address": "142 Maple Street", "City": "Chicago", "State": "IL", "Zip": "60614",
        "Property_Type": "Single Unit", "Bedrooms": 3, "Bathrooms": 2, "Square_Feet": 1480,
        "Monthly_Rent": 2200, "Status": "Occupied",
        "Tenant_Name": "Jane Foster", "Tenant_Phone": "312-555-0192",
        "Lease_Start": "2025-02-01", "Lease_End": "2026-01-31",
        "Owner_Name": "Robert Langley", "Owner_Email": "r.langley@email.com",
        "Owner_Phone": "312-555-0101", "Management_Fee_Percent": 10,
        "Notes": "Excellent tenant, always pays on time.",
        "Date_Added": "2025-01-15"
    },
    {
        "Address": "890 N Lakeshore Drive", "City": "Chicago", "State": "IL", "Zip": "60611",
        "Property_Type": "Single Unit", "Bedrooms": 2, "Bathrooms": 1, "Square_Feet": 1050,
        "Monthly_Rent": 1750, "Status": "Occupied",
        "Tenant_Name": "Marcus Webb", "Tenant_Phone": "312-555-0247",
        "Lease_Start": "2024-09-01", "Lease_End": "2025-08-31",
        "Owner_Name": "Sandra Kim", "Owner_Email": "s.kim@realty.com",
        "Owner_Phone": "773-555-0088", "Management_Fee_Percent": 10,
        "Notes": "Lease renewal in progress.",
        "Date_Added": "2024-08-20"
    },
    {
        "Address": "3310 W Wicker Park Ave", "City": "Chicago", "State": "IL", "Zip": "60647",
        "Property_Type": "Single Unit", "Bedrooms": 1, "Bathrooms": 1, "Square_Feet": 720,
        "Monthly_Rent": 1400, "Status": "Occupied",
        "Tenant_Name": "Priya Sharma", "Tenant_Phone": "773-555-0316",
        "Lease_Start": "2025-05-01", "Lease_End": "2026-04-30",
        "Owner_Name": "James Horton", "Owner_Email": "j.horton@private.com",
        "Owner_Phone": "312-555-0077", "Management_Fee_Percent": 8,
        "Notes": "Quiet neighborhood. Tenant works remotely.",
        "Date_Added": "2025-04-10"
    },
    {
        "Address": "517 N Clark Street", "City": "Chicago", "State": "IL", "Zip": "60654",
        "Property_Type": "Multi-Unit", "Square_Feet": 4200,
        "Monthly_Rent": 7000, "Status": "Occupied",
        "Owner_Name": "Elena Vasquez", "Owner_Email": "e.vasquez@invest.com",
        "Owner_Phone": "312-555-0204", "Management_Fee_Percent": 12,
        "Notes": "4-unit building. Units A & B leased long-term.",
        "Date_Added": "2024-06-01",
        "Units": [
            {"Unit_Number": "1A", "Bedrooms": "2", "Bathrooms": "1", "Square_Feet": "950",
             "Monthly_Rent": "1800", "Status": "Occupied", "Tenant_Name": "Carlos Rivera",
             "Tenant_Phone": "312-555-0411", "Lease_Start": "2024-07-01", "Lease_End": "2025-06-30"},
            {"Unit_Number": "1B", "Bedrooms": "2", "Bathrooms": "1", "Square_Feet": "950",
             "Monthly_Rent": "1800", "Status": "Occupied", "Tenant_Name": "Amy Lin",
             "Tenant_Phone": "312-555-0412", "Lease_Start": "2024-07-01", "Lease_End": "2026-06-30"},
            {"Unit_Number": "2A", "Bedrooms": "3", "Bathrooms": "2", "Square_Feet": "1150",
             "Monthly_Rent": "2200", "Status": "Occupied", "Tenant_Name": "DeShawn Williams",
             "Tenant_Phone": "312-555-0413", "Lease_Start": "2025-01-01", "Lease_End": "2026-12-31"},
            {"Unit_Number": "2B", "Bedrooms": "1", "Bathrooms": "1", "Square_Feet": "700",
             "Monthly_Rent": "1200", "Status": "Vacant", "Tenant_Name": "",
             "Tenant_Phone": "", "Lease_Start": "", "Lease_End": ""}
        ]
    },
    {
        "Address": "2045 W Division Street", "City": "Chicago", "State": "IL", "Zip": "60622",
        "Property_Type": "Single Unit", "Bedrooms": 2, "Bathrooms": 2, "Square_Feet": 1100,
        "Monthly_Rent": 1950, "Status": "Vacant",
        "Owner_Name": "Patricia Moore", "Owner_Email": "p.moore@email.com",
        "Owner_Phone": "773-555-0155", "Management_Fee_Percent": 10,
        "Notes": "Recently renovated kitchen and bathrooms. Listed for rent.",
        "Date_Added": "2025-10-01"
    },
    {
        "Address": "78 E Oak Street", "City": "Chicago", "State": "IL", "Zip": "60611",
        "Property_Type": "Single Unit", "Bedrooms": 4, "Bathrooms": 3, "Square_Feet": 2300,
        "Monthly_Rent": 3100, "Status": "Occupied",
        "Tenant_Name": "David Chen", "Tenant_Phone": "312-555-0588",
        "Lease_Start": "2024-11-01", "Lease_End": "2026-10-31",
        "Owner_Name": "Michael Stern", "Owner_Email": "m.stern@realty.net",
        "Owner_Phone": "312-555-0033", "Management_Fee_Percent": 10,
        "Notes": "Premium Gold Coast unit. Tenant is a long-term client.",
        "Date_Added": "2024-10-15"
    },
]

prop_ids = []
for p in props_data:
    r = post("/properties", p, TOKEN)
    if r:
        pid = r.get("property", {}).get("Property_ID") or r.get("property_id")
        prop_ids.append(pid)
        ok(f"Property: {p['Address']}", pid)
    else:
        prop_ids.append(None)

print()

# ─── 2. TENANTS ──────────────────────────────────────────────────────────────
print("→ Creating tenants …")

tenants_data = [
    {"tenant_name": "Jane Foster",      "email": "jane.foster@gmail.com",    "phone": "312-555-0192", "property_id": prop_ids[0], "lease_start": "2025-02-01", "lease_end": "2026-01-31", "monthly_rent": 2200, "security_deposit": 4400,  "status": "Active",  "notes": "Veterinarian. Has one cat (approved)."},
    {"tenant_name": "Marcus Webb",      "email": "marcus.webb@outlook.com",  "phone": "312-555-0247", "property_id": prop_ids[1], "lease_start": "2024-09-01", "lease_end": "2025-08-31", "monthly_rent": 1750, "security_deposit": 3500,  "status": "Active",  "notes": "Software engineer. Renewal offered."},
    {"tenant_name": "Priya Sharma",     "email": "priya.sharma@gmail.com",   "phone": "773-555-0316", "property_id": prop_ids[2], "lease_start": "2025-05-01", "lease_end": "2026-04-30", "monthly_rent": 1400, "security_deposit": 2800,  "status": "Active",  "notes": "Remote worker, very quiet."},
    {"tenant_name": "David Chen",       "email": "david.chen@work.com",      "phone": "312-555-0588", "property_id": prop_ids[5], "lease_start": "2024-11-01", "lease_end": "2026-10-31", "monthly_rent": 3100, "security_deposit": 6200,  "status": "Active",  "notes": "Corporate attorney. Excellent references."},
    {"tenant_name": "Carlos Rivera",    "email": "c.rivera@gmail.com",       "phone": "312-555-0411", "property_id": prop_ids[3], "lease_start": "2024-07-01", "lease_end": "2025-06-30", "monthly_rent": 1800, "security_deposit": 3600,  "status": "Active",  "notes": "Unit 1A"},
    {"tenant_name": "Amy Lin",          "email": "amy.lin@email.com",        "phone": "312-555-0412", "property_id": prop_ids[3], "lease_start": "2024-07-01", "lease_end": "2026-06-30", "monthly_rent": 1800, "security_deposit": 3600,  "status": "Active",  "notes": "Unit 1B"},
    {"tenant_name": "DeShawn Williams", "email": "deshawn.w@email.com",      "phone": "312-555-0413", "property_id": prop_ids[3], "lease_start": "2025-01-01", "lease_end": "2026-12-31", "monthly_rent": 2200, "security_deposit": 4400,  "status": "Active",  "notes": "Unit 2A"},
]

tenant_ids = []
for t in tenants_data:
    if t.get("property_id") is None:
        tenant_ids.append(None)
        continue
    r = post("/tenants", t, TOKEN)
    if r:
        tid = r.get("tenant_id")
        tenant_ids.append(tid)
        ok(f"Tenant: {t['tenant_name']}", tid)
    else:
        tenant_ids.append(None)

print()

# ─── 3. VENDORS ──────────────────────────────────────────────────────────────
print("→ Creating vendors …")

vendors_data = [
    {"Company_Name": "24/7 Plumbing Solutions", "Contact_Name": "Mike Rodriguez",
     "Phone": "773-555-0901", "Email": "mike@247plumbing.com",
     "Category": "Plumbing", "Service_Area": "Chicagoland", "Hourly_Rate": 95,
     "Response_Time": "2 hours", "Insurance_Verified": "Yes", "License_Number": "PL-48291",
     "Rating": 4.8, "Notes": "Preferred vendor. Available 24/7 for emergencies."},
    {"Company_Name": "Bright Electric LLC", "Contact_Name": "Tom Bradley",
     "Phone": "312-555-0822", "Email": "tbradley@brightelectric.com",
     "Category": "Electrical", "Service_Area": "Chicago North Side", "Hourly_Rate": 110,
     "Response_Time": "4 hours", "Insurance_Verified": "Yes", "License_Number": "EL-77543",
     "Rating": 4.6, "Notes": "Handles panel upgrades and code compliance work."},
    {"Company_Name": "Cool Air HVAC Services", "Contact_Name": "Sarah Walsh",
     "Phone": "773-555-0744", "Email": "service@coolair-hvac.com",
     "Category": "HVAC", "Service_Area": "Chicagoland", "Hourly_Rate": 120,
     "Response_Time": "Same day", "Insurance_Verified": "Yes", "License_Number": "HVAC-22019",
     "Rating": 4.9, "Notes": "Annual maintenance contracts available. Highly recommended."},
    {"Company_Name": "Green Thumb Landscaping", "Contact_Name": "Jose Martinez",
     "Phone": "312-555-0365", "Email": "jose@greenthumbchi.com",
     "Category": "Landscaping", "Service_Area": "Chicago Metro", "Hourly_Rate": 65,
     "Response_Time": "2 business days", "Insurance_Verified": "Yes", "License_Number": "",
     "Rating": 4.3, "Notes": "Seasonal contracts for lawn care and snow removal."},
    {"Company_Name": "SparkClean Services", "Contact_Name": "Lisa Park",
     "Phone": "773-555-0218", "Email": "bookings@sparkclean.com",
     "Category": "Cleaning", "Service_Area": "Chicago", "Hourly_Rate": 55,
     "Response_Time": "Next day", "Insurance_Verified": "Yes", "License_Number": "",
     "Rating": 4.7, "Notes": "Move-in/move-out cleans. Reliable and thorough."},
]

for v in vendors_data:
    r = post("/vendors", v, TOKEN)
    ok(f"Vendor: {v['Company_Name']}", r)

print()

# ─── 4. MAINTENANCE REQUESTS ─────────────────────────────────────────────────
print("→ Creating maintenance requests …")

maint_data = [
    {
        "Date_Submitted": "2026-02-10", "Property_ID": prop_ids[0],
        "Address": "142 Maple Street, Chicago, IL",
        "Tenant_Name": "Jane Foster", "Issue_Description": "Kitchen faucet dripping constantly. Water damage visible under sink.",
        "Category": "Plumbing", "Priority": "Medium", "Status": "Completed",
        "Assigned_Vendor": "24/7 Plumbing Solutions", "Date_Assigned": "2026-02-11",
        "Date_Completed": "2026-02-12", "Cost": 185, "Owner_Approved": "Yes",
        "Notes": "Replaced O-rings and cartridge. Problem resolved."
    },
    {
        "Date_Submitted": "2026-01-18", "Property_ID": prop_ids[1],
        "Address": "890 N Lakeshore Drive, Chicago, IL",
        "Tenant_Name": "Marcus Webb", "Issue_Description": "Bedroom window AC unit not powering on. Tenant requests urgent repair for pets.",
        "Category": "HVAC", "Priority": "High", "Status": "Completed",
        "Assigned_Vendor": "Cool Air HVAC Services", "Date_Assigned": "2026-01-19",
        "Date_Completed": "2026-01-21", "Cost": 320, "Owner_Approved": "Yes",
        "Notes": "Replaced capacitor and refrigerant recharge. Unit running normally."
    },
    {
        "Date_Submitted": "2026-03-05", "Property_ID": prop_ids[2],
        "Address": "3310 W Wicker Park Ave, Chicago, IL",
        "Tenant_Name": "Priya Sharma", "Issue_Description": "Two outlets in living room not working. Possibly tripped breaker or wiring issue.",
        "Category": "Electrical", "Priority": "Medium", "Status": "In Progress",
        "Assigned_Vendor": "Bright Electric LLC", "Date_Assigned": "2026-03-07",
        "Date_Completed": "", "Cost": 0, "Owner_Approved": "Yes",
        "Notes": "Technician inspected; rewiring 2 outlets scheduled for 3/12."
    },
    {
        "Date_Submitted": "2026-03-08", "Property_ID": prop_ids[3],
        "Address": "517 N Clark Street, Chicago, IL",
        "Tenant_Name": "Carlos Rivera", "Issue_Description": "Radiator in Unit 1A unit not producing heat. Temperature dropped to 58°F.",
        "Category": "HVAC", "Priority": "Emergency", "Status": "Assigned",
        "Assigned_Vendor": "Cool Air HVAC Services", "Date_Assigned": "2026-03-08",
        "Date_Completed": "", "Cost": 0, "Owner_Approved": "Pending",
        "Notes": "Emergency dispatch scheduled for morning of 3/9."
    },
    {
        "Date_Submitted": "2026-03-09", "Property_ID": prop_ids[5],
        "Address": "78 E Oak Street, Chicago, IL",
        "Tenant_Name": "David Chen", "Issue_Description": "Garbage disposal jammed and emitting burning smell. Not in use.",
        "Category": "Appliance", "Priority": "Low", "Status": "Pending",
        "Assigned_Vendor": "", "Date_Assigned": "", "Date_Completed": "",
        "Cost": 0, "Owner_Approved": "Pending",
        "Notes": "Tenant advised to leave unplugged. Scheduling vendor."
    },
    {
        "Date_Submitted": "2026-02-24", "Property_ID": prop_ids[3],
        "Address": "517 N Clark Street, Chicago, IL",
        "Tenant_Name": "DeShawn Williams", "Issue_Description": "Front entry door hinge broken, door difficult to fully close. Security concern.",
        "Category": "General Maintenance", "Priority": "High", "Status": "Completed",
        "Assigned_Vendor": "SparkClean Services", "Date_Assigned": "2026-02-25",
        "Date_Completed": "2026-02-26", "Cost": 95, "Owner_Approved": "Yes",
        "Notes": "Replaced hinges and adjusted door frame. Fully functional."
    },
    {
        "Date_Submitted": "2025-12-15", "Property_ID": prop_ids[0],
        "Address": "142 Maple Street, Chicago, IL",
        "Tenant_Name": "Jane Foster", "Issue_Description": "Water heater making loud popping noise and not maintaining temperature.",
        "Category": "Plumbing", "Priority": "High", "Status": "Completed",
        "Assigned_Vendor": "24/7 Plumbing Solutions", "Date_Assigned": "2025-12-16",
        "Date_Completed": "2025-12-17", "Cost": 425, "Owner_Approved": "Yes",
        "Notes": "Sediment flush performed, anode rod replaced. Extended heater life 3-5 years."
    },
    {
        "Date_Submitted": "2026-03-10", "Property_ID": prop_ids[4],
        "Address": "2045 W Division Street, Chicago, IL",
        "Tenant_Name": "", "Issue_Description": "Prep for new tenant: deep clean, touch-up painting in bedroom, replace bathroom caulking.",
        "Category": "General Maintenance", "Priority": "Medium", "Status": "In Progress",
        "Assigned_Vendor": "SparkClean Services", "Date_Assigned": "2026-03-10",
        "Date_Completed": "", "Cost": 0, "Owner_Approved": "Yes",
        "Notes": "Turnover work for vacant unit. Target completion 3/14."
    }
]

for m in maint_data:
    r = post("/maintenance", m, TOKEN)
    ok(f"Maintenance: {m['Issue_Description'][:55]}…", r)

print()

# ─── 5. EXPENSES ─────────────────────────────────────────────────────────────
print("→ Creating expenses …")

months = months_back(6)  # last 6 months

expenses = []

# Recurring monthly: property insurance
for mo, yr, dt in months:
    expenses.append({
        "category": "Insurance", "description": "Portfolio property insurance – monthly premium",
        "amount": 487, "date": dt, "recurring": True, "recurring_frequency": "monthly",
        "vendor_name": "Allstate Commercial", "tax_deductible": True,
        "notes": "Covers all 6 properties. Policy #CHI-2024-7743."
    })

# Recurring monthly: management fee (self)
for mo, yr, dt in months:
    expenses.append({
        "category": "Management Fee", "description": "TrueNorth PM management fee – monthly",
        "amount": 820, "date": dt, "recurring": True, "recurring_frequency": "monthly",
        "vendor_name": "True North PM", "tax_deductible": True,
        "notes": "10% average across occupied units."
    })

# Recurring: property taxes (quarterly)
for mo, yr, dt in months[::2]:
    expenses.append({
        "category": "Property Tax", "description": "Cook County property tax installment",
        "amount": 3240, "date": dt, "recurring": True, "recurring_frequency": "quarterly",
        "vendor_name": "Cook County Treasurer", "tax_deductible": True,
        "notes": "Combined for all properties."
    })

# Landscaping / seasonal
if months:
    expenses.append({
        "category": "Landscaping", "description": "Spring lawn treatment – 142 Maple & 78 E Oak",
        "amount": 380, "date": months[-1][2], "recurring": False,
        "vendor_name": "Green Thumb Landscaping", "tax_deductible": True, "notes": ""
    })
    expenses.append({
        "category": "Landscaping", "description": "Snow removal – 517 N Clark (Dec-Feb seasonal contract)",
        "amount": 1250, "date": months[0][2], "recurring": False,
        "vendor_name": "Green Thumb Landscaping", "tax_deductible": True, "notes": "3-month contract, prepaid."
    })

# One-off repairs / marketing
expenses.extend([
    {
        "category": "Repairs", "description": "Kitchen faucet repair – 142 Maple St (Unit 1)",
        "amount": 185, "date": "2026-02-12", "recurring": False,
        "vendor_name": "24/7 Plumbing Solutions", "tax_deductible": True, "notes": ""
    },
    {
        "category": "Repairs", "description": "HVAC capacitor + refrigerant – 890 Lakeshore",
        "amount": 320, "date": "2026-01-21", "recurring": False,
        "vendor_name": "Cool Air HVAC Services", "tax_deductible": True, "notes": ""
    },
    {
        "category": "Repairs", "description": "Water heater anode rod + flush – 142 Maple",
        "amount": 425, "date": "2025-12-17", "recurring": False,
        "vendor_name": "24/7 Plumbing Solutions", "tax_deductible": True, "notes": ""
    },
    {
        "category": "Repairs", "description": "Front door hinge replacement – 517 N Clark 2A",
        "amount": 95, "date": "2026-02-26", "recurring": False,
        "vendor_name": "SparkClean Services", "tax_deductible": True, "notes": ""
    },
    {
        "category": "Marketing", "description": "Zillow & Apartments.com listing – 2045 W Division",
        "amount": 149, "date": "2026-03-01", "recurring": False,
        "vendor_name": "Zillow Group", "tax_deductible": True,
        "notes": "30-day featured listing for vacant unit."
    },
    {
        "category": "Legal", "description": "Lease agreement review + update (all properties)",
        "amount": 750, "date": "2026-01-05", "recurring": False,
        "vendor_name": "Goldstein & Park Attorneys", "tax_deductible": True,
        "notes": "Annual legal review of all 6 lease agreements."
    },
    {
        "category": "Cleaning", "description": "Move-out deep clean – 2045 W Division",
        "amount": 285, "date": "2026-03-10", "recurring": False,
        "vendor_name": "SparkClean Services", "tax_deductible": True,
        "notes": "Turnover clean before new tenant listing."
    },
    {
        "category": "Utilities", "description": "Common area utilities – 517 N Clark (hallways, laundry)",
        "amount": 210, "date": months[-1][2] if months else "2026-03-01", "recurring": True,
        "recurring_frequency": "monthly", "vendor_name": "ComEd / Peoples Gas",
        "tax_deductible": True, "notes": ""
    },
    {
        "category": "HOA Fees", "description": "HOA quarterly fee – 890 N Lakeshore Drive",
        "amount": 485, "date": "2026-01-01", "recurring": True, "recurring_frequency": "quarterly",
        "vendor_name": "Lakeshore Towers HOA", "tax_deductible": True, "notes": ""
    },
    {
        "category": "HOA Fees", "description": "HOA quarterly fee – 78 E Oak Street",
        "amount": 625, "date": "2026-01-01", "recurring": True, "recurring_frequency": "quarterly",
        "vendor_name": "Gold Coast Residences HOA", "tax_deductible": True, "notes": ""
    },
])

for e in expenses:
    r = post("/expenses", e, TOKEN)
    ok(f"Expense: {e['description'][:55]}…", r)

print()

# ─── 6. RENT LEDGER ──────────────────────────────────────────────────────────
print("→ Creating rent ledger entries …")

# (property_index, tenant_name, monthly_rent, all_paid_on_time?)
rent_config = [
    (0, "Jane Foster",      2200, True),
    (1, "Marcus Webb",      1750, True),
    (2, "Priya Sharma",     1400, True),
    (5, "David Chen",       3100, True),
    (3, "Carlos Rivera",    1800, True),
    (3, "Amy Lin",          1800, True),
    (3, "DeShawn Williams", 2200, True),
]

months_list = months_back(6)  # oldest → newest

for prop_idx, tenant, rent, on_time in rent_config:
    pid = prop_ids[prop_idx]
    if not pid:
        continue
    for i, (mo, yr, dt) in enumerate(months_list):
        # Current month = unpaid
        is_current = i == len(months_list) - 1
        if is_current:
            entry = {
                "property_id": pid, "tenant_name": tenant,
                "month": mo, "year": yr,
                "amount_due": rent, "amount_paid": 0,
                "date_paid": None, "status": "Unpaid"
            }
        elif tenant == "Marcus Webb" and i == 3:
            # One partial month for drama
            paid_on = datetime.date.fromisoformat(dt).replace(day=14).isoformat()
            entry = {
                "property_id": pid, "tenant_name": tenant,
                "month": mo, "year": yr,
                "amount_due": rent, "amount_paid": rent - 250,
                "date_paid": paid_on, "status": "Partial",
                "notes": "Partial payment accepted. Remainder collected 3 days later.",
                "late_fee": 0
            }
        elif tenant == "Carlos Rivera" and i == 1:
            # One late fee
            paid_on = datetime.date.fromisoformat(dt).replace(day=19).isoformat()
            entry = {
                "property_id": pid, "tenant_name": tenant,
                "month": mo, "year": yr,
                "amount_due": rent, "amount_paid": rent,
                "date_paid": paid_on, "status": "Late",
                "late_fee": 75, "notes": "Paid 19 days late. $75 late fee collected."
            }
        else:
            # Normal on-time payment
            day = 1 if on_time else 5
            paid_on = datetime.date.fromisoformat(dt).replace(day=day).isoformat()
            entry = {
                "property_id": pid, "tenant_name": tenant,
                "month": mo, "year": yr,
                "amount_due": rent, "amount_paid": rent,
                "date_paid": paid_on, "status": "Paid"
            }
        r = post("/rent-roll", entry, TOKEN)
        ok(f"Rent: {tenant} – {mo} {yr} ({entry.get('status')})", r)

print()
print("=" * 60)
print("✓  Demo seed complete! All data loaded into the demo account.")
print("=" * 60)
