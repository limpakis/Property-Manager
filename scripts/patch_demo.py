#!/usr/bin/env python3
"""Patch: create the multi-unit property, its tenants, the remaining maintenance requests,
and rent ledger entries for the Clark St units."""

import json, urllib.request as req_lib, urllib.error, datetime

BASE  = "https://property-manager-production-a304.up.railway.app/api"
EMAIL = "demo@truenorthpm.com"
PASS  = "DemoAccess@2026"

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
        print(f"  ✗  {method} {path} → {e.code}: {err[:300]}")
        return None

def post(path, body, token): return call("POST", path, body, token)
def ok(label, r):
    print(f"  {'✓' if r else '✗'}  {label}")
    return r

def months_back(n):
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

# ── Login ────────────────────────────────────────────────────────────────────
print("→ Logging in …")
r = post("/auth/login", {"email": EMAIL, "password": PASS}, None)
TOKEN = r["token"]
print(f"  ✓  Logged in\n")

# ── Fetch existing properties ────────────────────────────────────────────────
props = call("GET", "/properties", token=TOKEN) or []
addr_to_id = {p["Address"]: p["Property_ID"] for p in props}
print("Existing properties:")
for a, i in addr_to_id.items():
    print(f"    {i}  {a}")
print()

def pid(fragment):
    for addr, prop_id in addr_to_id.items():
        if fragment.lower() in addr.lower():
            return prop_id
    return None

# ── Multi-unit property (517 N Clark) ────────────────────────────────────────
CLARK_ID = pid("Clark")
if CLARK_ID:
    print(f"→ 517 N Clark already exists ({CLARK_ID}) – skipping property creation\n")
else:
    print("→ Creating 517 N Clark Street (multi-unit) …")
    mu = post("/properties", {
        "Address": "517 N Clark Street", "City": "Chicago", "State": "IL", "Zip": "60654",
        "Property_Type": "Multi-Unit",
        "Square_Feet": 4200, "Monthly_Rent": 7000, "Status": "Occupied",
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
    }, TOKEN)
    ok("517 N Clark Street (multi-unit)", mu)
    CLARK_ID = mu["property"]["Property_ID"] if mu else None
    print(f"  property_id = {CLARK_ID}\n")

# ── Multi-unit tenants ────────────────────────────────────────────────────────
if CLARK_ID:
    print("→ Creating tenants for 517 N Clark …")
    for t in [
        {"tenant_name": "Carlos Rivera", "email": "c.rivera@gmail.com", "phone": "312-555-0411",
         "property_id": CLARK_ID, "lease_start": "2024-07-01", "lease_end": "2025-06-30",
         "monthly_rent": 1800, "security_deposit": 3600, "status": "Active", "notes": "Unit 1A"},
        {"tenant_name": "Amy Lin", "email": "amy.lin@email.com", "phone": "312-555-0412",
         "property_id": CLARK_ID, "lease_start": "2024-07-01", "lease_end": "2026-06-30",
         "monthly_rent": 1800, "security_deposit": 3600, "status": "Active", "notes": "Unit 1B"},
        {"tenant_name": "DeShawn Williams", "email": "deshawn.w@email.com", "phone": "312-555-0413",
         "property_id": CLARK_ID, "lease_start": "2025-01-01", "lease_end": "2026-12-31",
         "monthly_rent": 2200, "security_deposit": 4400, "status": "Active", "notes": "Unit 2A"},
    ]:
        r = post("/tenants", t, TOKEN)
        ok(f"Tenant: {t['tenant_name']}", r)
    print()

# ── Maintenance (previously failed items) ────────────────────────────────────
print("→ Creating remaining maintenance requests …")

maint_fixes = [
    {
        "Date_Submitted": "2026-03-05", "Property_ID": pid("Wicker"),
        "Address": "3310 W Wicker Park Ave, Chicago, IL",
        "Tenant_Name": "Priya Sharma",
        "Issue_Description": "Two outlets in living room not working. Possibly tripped breaker or wiring issue.",
        "Category": "Electrical", "Priority": "Medium", "Status": "In Progress",
        "Assigned_Vendor": "Bright Electric LLC", "Date_Assigned": "2026-03-07",
        "Date_Completed": "", "Cost": 0, "Owner_Approved": "Yes",
        "Notes": "Technician inspected; rewiring 2 outlets scheduled for 3/12."
    },
    {
        "Date_Submitted": "2026-03-08", "Property_ID": CLARK_ID,
        "Address": "517 N Clark Street, Chicago, IL",
        "Tenant_Name": "Carlos Rivera",
        "Issue_Description": "Radiator in Unit 1A not producing heat. Temperature dropped to 58\u00b0F.",
        "Category": "HVAC", "Priority": "Emergency", "Status": "Assigned",
        "Assigned_Vendor": "Cool Air HVAC Services", "Date_Assigned": "2026-03-08",
        "Date_Completed": "", "Cost": 0, "Owner_Approved": "Pending",
        "Notes": "Emergency dispatch scheduled for morning of 3/9."
    },
    {
        "Date_Submitted": "2026-03-09", "Property_ID": pid("Oak"),
        "Address": "78 E Oak Street, Chicago, IL",
        "Tenant_Name": "David Chen",
        "Issue_Description": "Garbage disposal jammed and emitting burning smell. Not in use.",
        "Category": "Appliance", "Priority": "Low", "Status": "Pending",
        "Assigned_Vendor": "", "Date_Assigned": "", "Date_Completed": "",
        "Cost": 0, "Owner_Approved": "Pending",
        "Notes": "Tenant advised to leave unplugged. Scheduling vendor."
    },
    {
        "Date_Submitted": "2026-03-10", "Property_ID": pid("Division"),
        "Address": "2045 W Division Street, Chicago, IL",
        "Tenant_Name": "",
        "Issue_Description": "Turnover prep: deep clean, touch-up paint, replace bathroom caulking.",
        "Category": "General Maintenance", "Priority": "Medium", "Status": "In Progress",
        "Assigned_Vendor": "SparkClean Services", "Date_Assigned": "2026-03-10",
        "Date_Completed": "", "Cost": 0, "Owner_Approved": "Yes",
        "Notes": "Target completion 3/14."
    },
    {
        "Date_Submitted": "2026-02-24", "Property_ID": CLARK_ID,
        "Address": "517 N Clark Street, Chicago, IL",
        "Tenant_Name": "DeShawn Williams",
        "Issue_Description": "Front entry door hinge broken, door difficult to fully close. Security concern.",
        "Category": "General Maintenance", "Priority": "High", "Status": "Completed",
        "Assigned_Vendor": "SparkClean Services", "Date_Assigned": "2026-02-25",
        "Date_Completed": "2026-02-26", "Cost": 95, "Owner_Approved": "Yes",
        "Notes": "Replaced hinges and adjusted door frame. Fully functional."
    },
]

for m in maint_fixes:
    if not m.get("Property_ID"):
        print(f"  ✗  SKIPPED (no property_id): {m['Issue_Description'][:50]}")
        continue
    r = post("/maintenance", m, TOKEN)
    ok(f"Maintenance: {m['Issue_Description'][:55]}…", r)

print()

# ── Rent ledger for Clark St tenants ─────────────────────────────────────────
if CLARK_ID:
    print("→ Rent ledger entries for Clark St multi-unit tenants …")
    months = months_back(6)
    clark_tenants = [
        ("Carlos Rivera",    1800, "late"),
        ("Amy Lin",          1800, "good"),
        ("DeShawn Williams", 2200, "good"),
    ]
    for tenant, rent, style in clark_tenants:
        for i, (mo, yr, dt) in enumerate(months):
            is_current = (i == len(months) - 1)
            if is_current:
                entry = {
                    "property_id": CLARK_ID, "tenant_name": tenant,
                    "month": mo, "year": yr,
                    "amount_due": rent, "amount_paid": 0, "status": "Unpaid"
                }
            elif style == "late" and i == 1:
                paid = datetime.date.fromisoformat(dt).replace(day=19).isoformat()
                entry = {
                    "property_id": CLARK_ID, "tenant_name": tenant,
                    "month": mo, "year": yr,
                    "amount_due": rent, "amount_paid": rent, "date_paid": paid,
                    "status": "Late", "late_fee": 75,
                    "notes": "Paid 19 days late. $75 late fee collected."
                }
            else:
                paid = datetime.date.fromisoformat(dt).replace(day=1).isoformat()
                entry = {
                    "property_id": CLARK_ID, "tenant_name": tenant,
                    "month": mo, "year": yr,
                    "amount_due": rent, "amount_paid": rent, "date_paid": paid, "status": "Paid"
                }
            r = post("/rent-roll", entry, TOKEN)
            ok(f"Rent: {tenant} – {mo} {yr} ({entry.get('status')})", r)

print()
print("=" * 55)
print("Patch complete.")
print("=" * 55)
