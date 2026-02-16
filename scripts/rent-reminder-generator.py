#!/usr/bin/env python3
"""
Rent Reminder Email Generator
Generates email reminders for upcoming and overdue rent payments
"""

import csv
from datetime import datetime, timedelta
from pathlib import Path

# Email templates
TEMPLATES = {
    "reminder_3_days": """
Subject: Rent Payment Reminder - Due in 3 Days

Dear {tenant_name},

This is a friendly reminder that your rent payment is due in 3 days.

Property: {address}
Amount Due: ${rent}
Due Date: {due_date}

Payment Methods:
- Online: [Payment Portal URL]
- Check payable to: [Your Company Name]
- Bank Transfer: [Account Details]

If you have already paid, please disregard this message.

Thank you,
{company_name}
{company_phone}
""",

    "reminder_due_today": """
Subject: Rent Payment Due Today

Dear {tenant_name},

Your rent payment is due today.

Property: {address}
Amount Due: ${rent}
Due Date: {due_date}

Please submit payment immediately to avoid late fees.

Payment Methods:
- Online: [Payment Portal URL]
- Check payable to: [Your Company Name]
- Bank Transfer: [Account Details]

Thank you,
{company_name}
{company_phone}
""",

    "reminder_overdue": """
Subject: URGENT - Rent Payment Overdue

Dear {tenant_name},

Your rent payment is now overdue.

Property: {address}
Base Rent: ${rent}
Days Overdue: {days_overdue}
Late Fee: ${late_fee}
Total Amount Due: ${total_due}

Late fees of $50 + $10/day are being applied per your lease agreement.

Please contact us immediately to arrange payment and avoid further action.

Payment Methods:
- Online: [Payment Portal URL]
- Check payable to: [Your Company Name]
- Bank Transfer: [Account Details]

If payment is not received within 5 days, formal eviction proceedings may begin.

{company_name}
{company_phone}
{company_email}
""",
}

def calculate_late_fee(days_overdue):
    """Calculate late fee: $50 base + $10/day"""
    if days_overdue <= 0:
        return 0
    return 50 + (10 * days_overdue)

def generate_reminders():
    """Generate rent reminders based on properties.csv"""
    
    project_root = Path(__file__).parent.parent
    properties_file = project_root / "tracking" / "properties.csv"
    output_dir = project_root / "output" / "rent-reminders"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    today = datetime.now()
    due_date = datetime(today.year, today.month, 1)  # Rent due on 1st
    
    # Calculate next due date if we're past the 1st
    if today.day > 1:
        if today.month == 12:
            due_date = datetime(today.year + 1, 1, 1)
        else:
            due_date = datetime(today.year, today.month + 1, 1)
    
    days_until_due = (due_date - today).days
    
    reminders = []
    
    try:
        with open(properties_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['Status'].lower() != 'occupied':
                    continue
                
                tenant_name = row.get('Tenant_Name', 'Tenant')
                address = row.get('Address', 'N/A')
                rent = row.get('Monthly_Rent', '0')
                
                if not tenant_name or tenant_name == 'Tenant_Name':
                    continue
                
                # Determine which reminder to send
                template_key = None
                days_overdue = 0
                
                if days_until_due == 3:
                    template_key = "reminder_3_days"
                elif days_until_due == 0:
                    template_key = "reminder_due_today"
                elif days_until_due < 0:
                    days_overdue = abs(days_until_due)
                    template_key = "reminder_overdue"
                
                if template_key:
                    late_fee = calculate_late_fee(days_overdue)
                    total_due = float(rent) + late_fee if rent.replace('.','').isdigit() else 0
                    
                    email_content = TEMPLATES[template_key].format(
                        tenant_name=tenant_name,
                        address=address,
                        rent=rent,
                        due_date=due_date.strftime("%B 1, %Y"),
                        days_overdue=days_overdue,
                        late_fee=late_fee,
                        total_due=total_due,
                        company_name="[Your Company Name]",
                        company_phone="[Your Phone]",
                        company_email="[Your Email]"
                    )
                    
                    reminders.append({
                        'tenant': tenant_name,
                        'address': address,
                        'type': template_key,
                        'content': email_content
                    })
                    
                    # Save individual email file
                    filename = f"{today.strftime('%Y-%m-%d')}_{tenant_name.replace(' ', '_')}_{template_key}.txt"
                    with open(output_dir / filename, 'w') as email_file:
                        email_file.write(email_content)
        
        # Generate summary report
        summary_file = output_dir / f"reminder_summary_{today.strftime('%Y-%m-%d')}.txt"
        with open(summary_file, 'w') as f:
            f.write(f"RENT REMINDER SUMMARY\n")
            f.write(f"Generated: {today.strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Next Rent Due: {due_date.strftime('%B 1, %Y')}\n")
            f.write(f"="*60 + "\n\n")
            
            if reminders:
                f.write(f"Total Reminders Generated: {len(reminders)}\n\n")
                for r in reminders:
                    f.write(f"- {r['tenant']} ({r['address']}) - {r['type']}\n")
            else:
                f.write("No reminders to send today.\n")
        
        print(f"✓ Generated {len(reminders)} rent reminders")
        print(f"✓ Files saved to: {output_dir}")
        print(f"\nNext steps:")
        print("1. Review reminder files")
        print("2. Send via email or postal mail")
        print("3. Log sends in activity tracker")
        
    except FileNotFoundError:
        print(f"Error: Could not find {properties_file}")
        print("Please ensure properties.csv exists in tracking/ directory")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    generate_reminders()
