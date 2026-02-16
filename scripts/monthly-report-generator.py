#!/usr/bin/env python3
"""
Monthly Financial Report Generator
Generates comprehensive monthly reports for property owners
"""

import csv
from datetime import datetime
from pathlib import Path
from collections import defaultdict

def generate_owner_report(owner_name, month, year):
    """Generate monthly financial report for a specific owner"""
    
    project_root = Path(__file__).parent.parent
    properties_file = project_root / "tracking" / "properties.csv"
    maintenance_file = project_root / "tracking" / "maintenance-requests.csv"
    output_dir = project_root / "output" / "monthly-reports" / f"{year}-{month:02d}"
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Collect property data
    owner_properties = []
    total_rent = 0
    occupied_count = 0
    
    try:
        with open(properties_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get('Owner_Name') == owner_name:
                    owner_properties.append(row)
                    if row.get('Status', '').lower() == 'occupied':
                        occupied_count += 1
                        rent = row.get('Monthly_Rent', '0')
                        if rent.replace('.','').replace(',','').isdigit():
                            total_rent += float(rent.replace(',',''))
        
        if not owner_properties:
            print(f"No properties found for owner: {owner_name}")
            return
        
        # Collect maintenance data
        maintenance_costs = 0
        maintenance_items = []
        
        try:
            with open(maintenance_file, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # Match by property address
                    for prop in owner_properties:
                        if row.get('Address') == prop.get('Address'):
                            # Check if completed this month
                            date_completed = row.get('Date_Completed', '')
                            if date_completed:
                                try:
                                    completed = datetime.strptime(date_completed, '%Y-%m-%d')
                                    if completed.year == year and completed.month == month:
                                        cost = row.get('Cost', '0')
                                        if cost.replace('.','').replace(',','').isdigit():
                                            cost_value = float(cost.replace(',',''))
                                            maintenance_costs += cost_value
                                            maintenance_items.append({
                                                'address': row.get('Address'),
                                                'description': row.get('Issue_Description'),
                                                'date': date_completed,
                                                'cost': cost_value
                                            })
                                except ValueError:
                                    pass
        except FileNotFoundError:
            pass
        
        # Calculate fees
        management_fee_percent = float(owner_properties[0].get('Management_Fee_Percent', '10')) / 100
        management_fee = total_rent * management_fee_percent
        maintenance_markup = maintenance_costs * 0.15  # 15% markup
        
        # Calculate net to owner
        gross_income = total_rent
        total_expenses = management_fee + maintenance_costs + maintenance_markup
        net_to_owner = gross_income - total_expenses
        
        # Generate report
        report_file = output_dir / f"{owner_name.replace(' ', '_')}_monthly_report.txt"
        
        with open(report_file, 'w') as f:
            f.write("="*70 + "\n")
            f.write("MONTHLY PROPERTY MANAGEMENT REPORT\n")
            f.write("="*70 + "\n\n")
            f.write(f"Owner: {owner_name}\n")
            f.write(f"Period: {datetime(year, month, 1).strftime('%B %Y')}\n")
            f.write(f"Report Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Properties Under Management: {len(owner_properties)}\n")
            f.write(f"Occupied Units: {occupied_count}\n")
            f.write(f"Vacancy Rate: {((len(owner_properties) - occupied_count) / len(owner_properties) * 100):.1f}%\n")
            f.write("\n" + "="*70 + "\n")
            f.write("PROPERTY DETAILS\n")
            f.write("="*70 + "\n\n")
            
            for i, prop in enumerate(owner_properties, 1):
                f.write(f"{i}. {prop.get('Address', 'N/A')}\n")
                f.write(f"   Status: {prop.get('Status', 'N/A')}\n")
                f.write(f"   Tenant: {prop.get('Tenant_Name', 'Vacant')}\n")
                f.write(f"   Monthly Rent: ${prop.get('Monthly_Rent', '0')}\n")
                if prop.get('Lease_End'):
                    f.write(f"   Lease Expires: {prop.get('Lease_End')}\n")
                f.write("\n")
            
            f.write("="*70 + "\n")
            f.write("INCOME & EXPENSES\n")
            f.write("="*70 + "\n\n")
            f.write(f"Gross Rental Income:              ${gross_income:,.2f}\n")
            f.write(f"\nExpenses:\n")
            f.write(f"  Management Fee ({management_fee_percent*100:.0f}%):       ${management_fee:,.2f}\n")
            f.write(f"  Maintenance Costs:                ${maintenance_costs:,.2f}\n")
            f.write(f"  Maintenance Coordination (15%):   ${maintenance_markup:,.2f}\n")
            f.write(f"                                    " + "-"*15 + "\n")
            f.write(f"  Total Expenses:                   ${total_expenses:,.2f}\n")
            f.write(f"\n{'='*70}\n")
            f.write(f"NET INCOME TO OWNER:              ${net_to_owner:,.2f}\n")
            f.write(f"{'='*70}\n\n")
            
            if maintenance_items:
                f.write("="*70 + "\n")
                f.write("MAINTENANCE ACTIVITY\n")
                f.write("="*70 + "\n\n")
                for item in maintenance_items:
                    f.write(f"Date: {item['date']}\n")
                    f.write(f"Property: {item['address']}\n")
                    f.write(f"Issue: {item['description']}\n")
                    f.write(f"Cost: ${item['cost']:,.2f}\n")
                    f.write("\n")
            
            f.write("="*70 + "\n")
            f.write("PAYMENT INFORMATION\n")
            f.write("="*70 + "\n\n")
            f.write(f"Amount Due to Owner: ${net_to_owner:,.2f}\n")
            f.write(f"Payment Method: Direct Deposit / Check\n")
            f.write(f"Expected Payment Date: Within 5 business days\n")
            f.write("\n")
            f.write("Questions? Contact us at:\n")
            f.write("[Your Company Name]\n")
            f.write("[Your Phone]\n")
            f.write("[Your Email]\n")
        
        print(f"✓ Generated report for {owner_name}")
        print(f"  Properties: {len(owner_properties)}")
        print(f"  Gross Income: ${gross_income:,.2f}")
        print(f"  Net to Owner: ${net_to_owner:,.2f}")
        print(f"  File: {report_file}")
        
    except FileNotFoundError:
        print(f"Error: Could not find {properties_file}")
    except Exception as e:
        print(f"Error generating report: {e}")

def generate_all_reports(month=None, year=None):
    """Generate reports for all owners"""
    
    if month is None:
        today = datetime.now()
        # Default to previous month
        if today.month == 1:
            month = 12
            year = today.year - 1
        else:
            month = today.month - 1
            year = today.year
    
    project_root = Path(__file__).parent.parent
    properties_file = project_root / "tracking" / "properties.csv"
    
    # Get unique owners
    owners = set()
    
    try:
        with open(properties_file, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                owner = row.get('Owner_Name')
                if owner and owner != 'Owner_Name':
                    owners.add(owner)
        
        if not owners:
            print("No owners found in properties.csv")
            return
        
        print(f"\nGenerating reports for {datetime(year, month, 1).strftime('%B %Y')}")
        print(f"Found {len(owners)} owner(s)\n")
        
        for owner in sorted(owners):
            generate_owner_report(owner, month, year)
            print()
        
        print(f"✓ All reports generated successfully")
        print(f"✓ Check output/monthly-reports/{year}-{month:02d}/ directory")
        
    except FileNotFoundError:
        print(f"Error: Could not find {properties_file}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        owner_name = sys.argv[1]
        month = int(sys.argv[2]) if len(sys.argv) > 2 else None
        year = int(sys.argv[3]) if len(sys.argv) > 3 else None
        
        if month is None:
            today = datetime.now()
            month = today.month - 1 if today.month > 1 else 12
            year = today.year if today.month > 1 else today.year - 1
        
        generate_owner_report(owner_name, month, year)
    else:
        generate_all_reports()
