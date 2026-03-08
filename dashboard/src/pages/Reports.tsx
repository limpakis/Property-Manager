import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { useEffect, useState, Component, type ReactNode } from 'react';
import api from '@/lib/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import { EmptyState } from '@/components/EmptyState';
import { BarChart3, ChevronDown, ChevronUp, DollarSign, Home, User, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Error boundary to catch render crashes
class ReportsErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean; error: string}> {
  constructor(props: {children: ReactNode}) { super(props); this.state = { hasError: false, error: '' }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error: error.message }; }
  render() {
    if (this.state.hasError) {
      return <div className="p-6"><h1 className="text-2xl font-bold mb-4">Reports</h1><div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4"><p className="font-medium text-destructive">Something went wrong loading reports</p><p className="text-sm text-muted-foreground mt-1">{this.state.error}</p><button className="mt-3 text-sm underline" onClick={() => { this.setState({ hasError: false, error: '' }); window.location.reload(); }}>Try again</button></div></div>;
    }
    return this.props.children;
  }
}

interface Property {
  Property_ID: string;
  Address: string;
  Monthly_Rent: string;
  Status: string;
  Lease_Start: string;
  Lease_End: string;
  Tenant_Name: string;
  City: string;
  State: string;
}

interface MaintenanceRequest {
  Request_ID: string;
  Category: string;
  Cost?: string;
  Status: string;
}

interface RevenueData {
  Month: string;
  Year?: string;
  Total_Revenue: number;
  Maintenance_Costs: number;
  Net_Profit: number;
  Properties_Under_Management: number;
  Management_Fees?: number;
}

const COLORS = ['hsl(25, 95%, 53%)', 'hsl(142, 71%, 45%)', 'hsl(217, 91%, 60%)', 'hsl(262, 83%, 58%)', 'hsl(0, 84%, 60%)'];

const Reports = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [propertiesData, maintenanceData, revenue] = await Promise.all([
          api.getProperties(),
          api.getMaintenance(),
          api.getRevenue()
        ]);
        
        setProperties(propertiesData);
        setMaintenance(maintenanceData);
        setRevenueData(revenue);
      } catch (error) {
        console.error('Error fetching reports:', error);
        setError('Failed to load reports data. Please ensure the backend server is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  if (loading) {
    return <LoadingSpinner size="lg" text="Loading reports..." />;
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">Financial analysis and performance overview</p>
        </div>
        <ErrorMessage message={error} />
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">Financial analysis and performance overview</p>
        </div>
        <EmptyState 
          icon={BarChart3} 
          title="No Data Available" 
          description="Not enough data to generate reports. Add properties and track expenses to see insights." 
        />
      </div>
    );
  }

  // Generate property revenue data
  const propertyRevenue = properties
    .filter(p => p.Status === 'Active' || p.Status === 'Occupied')
    .map(p => ({
      name: p.Address.length > 30 ? p.Address.substring(0, 30) + '...' : p.Address,
      revenue: parseFloat(p.Monthly_Rent || '0'),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Generate expense by category data from maintenance
  const expenseByCategory = Object.entries(
    maintenance.reduce<Record<string, number>>((acc, m) => {
      const cost = m.Cost != null ? Number(m.Cost) : 0;
      if (cost > 0) {
        acc[m.Category] = (acc[m.Category] || 0) + cost;
      }
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Generate cash flow data from revenue entries
  const cashFlow = revenueData.map(d => ({
    month: d.Month,
    year: d.Year || '2025',
    income: Number(d.Total_Revenue) || 0,
    expenses: Number(d.Maintenance_Costs) || 0,
    profit: Number(d.Net_Profit) || 0,
    rentCollected: Number(d.Total_Revenue) || 0,
    managementFees: Number(d.Management_Fees) || 0,
  }));

  // Function to check if a property was active in a given month
  const wasPropertyActiveInMonth = (property: Property, monthStr: string, yearStr: string): boolean => {
    if (!property.Lease_Start || !property.Lease_End) return false;
    
    const leaseStart = new Date(property.Lease_Start);
    const leaseEnd = new Date(property.Lease_End);
    
    // Create date for the month we're checking (use 15th to avoid timezone issues)
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const monthIndex = monthNames.indexOf(monthStr);
    if (monthIndex === -1) return false;
    
    const monthDate = new Date(parseInt(yearStr), monthIndex, 15);
    
    return monthDate >= leaseStart && monthDate <= leaseEnd;
  };

  // Get properties active in a specific month with payment details
  const getMonthlyPaymentDetails = (monthStr: string, yearStr: string) => {
    return properties
      .filter(p => wasPropertyActiveInMonth(p, monthStr, yearStr))
      .map(p => ({
        propertyId: p.Property_ID,
        address: p.Address,
        city: p.City,
        state: p.State,
        tenant: p.Tenant_Name,
        rent: parseFloat(p.Monthly_Rent || '0'),
        leaseStart: p.Lease_Start,
        leaseEnd: p.Lease_End,
      }))
      .sort((a, b) => b.rent - a.rent);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold font-display tracking-tight">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">Financial analysis and performance overview</p>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {cashFlow.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Cash Flow Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={cashFlow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Area type="monotone" dataKey="profit" name="Net Profit" stroke="hsl(142, 71%, 45%)" fill="hsl(142, 71%, 45%)" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="income" name="Income" stroke="hsl(25, 95%, 53%)" fill="hsl(25, 95%, 53%)" fillOpacity={0.08} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {expenseByCategory.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Expenses by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie 
                    data={expenseByCategory} 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={100} 
                    innerRadius={50} 
                    paddingAngle={4} 
                    dataKey="value" 
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {expenseByCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {propertyRevenue.length > 0 && (
          <Card className="shadow-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-display text-lg">Revenue by Property</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={propertyRevenue} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(220, 9%, 46%)" tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(220, 9%, 46%)" width={140} />
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Bar dataKey="revenue" name="Monthly Revenue" fill="hsl(25, 95%, 53%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Monthly Revenue Breakdown Section */}
      {cashFlow.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Monthly Revenue Breakdowns
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Detailed payment analytics for each month with property and tenant information
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {cashFlow.slice().reverse().map((month) => {
              const isExpanded = expandedMonth === `${month.month}-${month.year}`;
              const paymentDetails = getMonthlyPaymentDetails(month.month, month.year);
              const totalRent = paymentDetails.reduce((sum, p) => sum + p.rent, 0);
              
              return (
                <Collapsible 
                  key={`${month.month}-${month.year}`}
                  open={isExpanded}
                  onOpenChange={(open) => setExpandedMonth(open ? `${month.month}-${month.year}` : null)}
                >
                  <Card className={`border-l-4 ${month.profit > 0 ? 'border-l-success' : 'border-l-destructive'}`}>
                    <CollapsibleTrigger asChild>
                      <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div>
                              <h3 className="font-semibold text-lg">{month.month} {month.year}</h3>
                              <p className="text-sm text-muted-foreground">
                                {paymentDetails.length} {paymentDetails.length === 1 ? 'property' : 'properties'} under management
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="text-right hidden sm:block">
                              <p className="text-xs text-muted-foreground">Rent Collected</p>
                              <p className="font-semibold text-success">${month.rentCollected.toLocaleString()}</p>
                            </div>
                            <div className="text-right hidden md:block">
                              <p className="text-xs text-muted-foreground">Management Fees</p>
                              <p className="font-semibold text-primary">${month.managementFees.toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">Net Profit</p>
                              <p className={`font-bold ${month.profit > 0 ? 'text-success' : 'text-destructive'}`}>
                                ${month.profit.toLocaleString()}
                              </p>
                            </div>
                            {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                          </div>
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t px-4 py-4 bg-muted/30">
                        <div className="space-y-3">
                          {paymentDetails.length > 0 ? (
                            <>
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-semibold text-sm">Property Payment Details</h4>
                                <Badge variant="outline">
                                  Total: ${totalRent.toLocaleString()}
                                </Badge>
                              </div>
                              {paymentDetails.map((payment) => (
                                <Card key={payment.propertyId} className="bg-background">
                                  <CardContent className="p-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                      <div className="flex items-start gap-3">
                                        <Home className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                          <p className="text-sm font-medium">Property</p>
                                          <p className="text-sm text-muted-foreground">{payment.address}</p>
                                          <p className="text-xs text-muted-foreground">{payment.city}, {payment.state}</p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-start gap-3">
                                        <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                          <p className="text-sm font-medium">Tenant</p>
                                          <p className="text-sm text-muted-foreground">{payment.tenant || 'N/A'}</p>
                                          <p className="text-xs text-muted-foreground">
                                            Lease: {payment.leaseStart ? new Date(payment.leaseStart).toLocaleDateString() : 'N/A'} - {payment.leaseEnd ? new Date(payment.leaseEnd).toLocaleDateString() : 'N/A'}
                                          </p>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-start gap-3">
                                        <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                                        <div>
                                          <p className="text-sm font-medium">Monthly Rent</p>
                                          <p className="text-lg font-bold text-success">${payment.rent.toLocaleString()}</p>
                                          <p className="text-xs text-muted-foreground">
                                            Management Fee: ${(payment.rent * 0.1).toLocaleString()}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No active properties for this month
                            </p>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default function ReportsPage() {
  return <ReportsErrorBoundary><Reports /></ReportsErrorBoundary>;
}
