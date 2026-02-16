# Property Manager - Usage Guide

## Getting Started

### 1. Open Admin Dashboard
Double-click `dashboard/admin-dashboard.html` to view your management overview

### 2. Add Your First Property
1. Open `tracking/properties.csv` in Excel or Numbers
2. Add property details:
   - Property_ID: P001, P002, etc.
   - Owner information
   - Address and property details
   - Tenant information (if occupied)
   - Monthly rent and management fee percentage

### 3. Set Up Vendor Network
1. Open `tracking/vendor-database.csv`
2. Add contractors:
   - Plumber
   - Electrician
   - HVAC technician
   - Locksmith
   - Cleaning service
   - Handyman

### 4. Customize Documents
Replace placeholders in:
- `documents/management-agreement-template.md` → Your company details
- `documents/lease-template.md` → Your company details
- `marketing/landlord-outreach-letter.md` → Your contact info

### 5. Review Legal Requirements
- Have attorney review `lease-template.md` for your state
- Complete LLC registration
- Obtain property management license if required
- Set up business bank account + trust account
- Purchase E&O insurance

## Daily Operations

### Morning Routine
1. Check `maintenance-requests.csv` for new requests
2. Review `admin-dashboard.html` for alerts
3. Follow up on overdue rent (use `properties.csv`)

### Weekly Tasks
- Run `scripts/rent-reminder-generator.py` (3 days before due date)
- Update maintenance request statuses
- Log vendor invoices
- Schedule property inspections

### Monthly Tasks
1. Run `scripts/monthly-report-generator.py` on 5th of month
2. Send reports to owners via email
3. Update `financials/monthly-revenue-tracker.csv`
4. Process owner distributions
5. Send rent reminders on 28th

## Using the Scripts

### Rent Reminders
```bash
cd scripts
python3 rent-reminder-generator.py
```
- Automatically detects which tenants need reminders
- Generates emails in `output/rent-reminders/`
- Review and send manually via email

### Monthly Reports
```bash
# Generate all owner reports
python3 monthly-report-generator.py

# Generate specific owner report
python3 monthly-report-generator.py "John Smith" 1 2026
```
- Creates detailed financial reports
- Saved to `output/monthly-reports/YYYY-MM/`
- Send to owners as PDF or text

## Portals

### Owner Portal
- Share `dashboard/owner-portal.html` with property owners
- They can view properties, transactions, maintenance
- Update with their specific data

### Tenant Portal
- Share `dashboard/tenant-portal.html` with tenants
- Submit maintenance requests
- View lease information
- Make rent payments (when payment system added)

## File Organization

### documents/
Lease templates, agreements, procedures, checklists

### tracking/
CSV databases for properties, maintenance, vendors, leads

### financials/
Revenue tracking and financial reports

### marketing/
Client acquisition materials

### dashboard/
Web-based dashboards and portals

### scripts/
Python automation tools

### output/
Generated reports and reminders

## Scaling Up

### 10-20 Properties
Continue using current CSV system with scripts

### 20-50 Properties
Consider:
- Google Sheets (shared access, automatic sync)
- Zapier automation for emails
- QuickBooks for accounting

### 50+ Properties
Time to build cloud platform:
- Custom web application
- Automated payment processing
- Real-time owner/tenant portals
- Mobile app for maintenance requests

## Support Checklist

**Legal Setup:**
- [ ] LLC registered
- [ ] Property management license obtained
- [ ] E&O insurance purchased
- [ ] Business bank account opened
- [ ] Trust account opened
- [ ] Lease template attorney-reviewed

**Operations:**
- [ ] Vendor network established (5+ vendors)
- [ ] Phone system set up (business line + emergency)
- [ ] Email set up (professional domain)
- [ ] Document storage organized
- [ ] Inspection camera/phone
- [ ] Vehicle reliable

**Marketing:**
- [ ] Direct mail list (100 landlords)
- [ ] Business cards printed
- [ ] Simple website or Facebook page
- [ ] Join local landlord association

## Next Steps

1. Complete legal setup (Week 1-2)
2. Build vendor network (Week 2-3)
3. Send first batch of direct mail (Week 3)
4. Close first 3-5 properties (Month 1-2)
5. Prove service quality with first clients
6. Ask for referrals
7. Scale to 20 properties (Month 6)
8. Consider cloud platform (Month 12+)

Start today. Execute systematically. Adjust based on what works in your market.
