import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { StatCard } from '@/components/StatCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Receipt, DollarSign, Plus, Pencil, Trash2, TrendingDown, CalendarCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useState } from 'react';
import api from '@/lib/api';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorMessage } from '@/components/ErrorMessage';
import { EmptyState } from '@/components/EmptyState';
import { useToast } from '@/hooks/use-toast';
import {
  useExpenses,
  useMaintenance,
  useProperties,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from '@/hooks/usePropertyQueries';

const CATEGORIES = [
  'Insurance', 'Property Tax', 'Utilities', 'Repairs', 'Mortgage',
  'HOA Fees', 'Legal', 'Marketing', 'Management Fee', 'Landscaping', 'Cleaning', 'Other'
];

interface Expense {
  expense_id: string;
  property_id?: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  recurring: number;
  recurring_frequency?: string;
  vendor_name?: string;
  tax_deductible: number;
  notes?: string;
}

interface Property {
  Property_ID: string;
  Address: string;
}

const emptyExpense = {
  property_id: '',
  category: 'Other',
  description: '',
  amount: 0,
  date: new Date().toISOString().split('T')[0],
  recurring: false,
  recurring_frequency: '',
  vendor_name: '',
  tax_deductible: true,
  notes: '',
};

const Expenses = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [form, setForm] = useState(emptyExpense);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const { toast } = useToast();

  // ─── Server state via React Query ─────────────────────────────────────────
  const { data: expenses = [], isLoading: expensesLoading, error: expensesError } = useExpenses();
  const { data: maintenanceCosts = [] } = useMaintenance();
  const { data: properties = [] } = useProperties();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const loading = expensesLoading;
  const error = expensesError ? 'Failed to load expenses.' : null;

  const handleSave = async () => {
    if (!form.description || !form.amount || !form.date) {
      toast({ title: 'Missing fields', description: 'Please fill in description, amount, and date.', variant: 'destructive' });
      return;
    }
    try {
      if (editingExpense) {
        await updateExpense.mutateAsync({ id: editingExpense.expense_id, data: form });
        toast({ title: 'Expense updated' });
      } else {
        await createExpense.mutateAsync(form);
        toast({ title: 'Expense added' });
      }
      setDialogOpen(false);
      setEditingExpense(null);
      setForm(emptyExpense);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense.mutateAsync(id);
      toast({ title: 'Expense deleted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setForm({
      property_id: expense.property_id || '',
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      date: expense.date,
      recurring: !!expense.recurring,
      recurring_frequency: expense.recurring_frequency || '',
      vendor_name: expense.vendor_name || '',
      tax_deductible: !!expense.tax_deductible,
      notes: expense.notes || '',
    });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditingExpense(null);
    setForm(emptyExpense);
    setDialogOpen(true);
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading expenses..." />;

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Expenses</h1>
          <p className="text-muted-foreground text-sm mt-1">Track all property-related expenses for tax deductions</p>
        </div>
        <ErrorMessage message={error} />
      </div>
    );
  }

  // Combine standalone expenses + maintenance costs
  const maintenanceExpenses = maintenanceCosts
    .filter(m => m.Cost && parseFloat(m.Cost) > 0)
    .map(m => ({
      expense_id: `maint-${m.Request_ID}`,
      category: 'Repairs',
      description: m.Issue_Description,
      amount: parseFloat(m.Cost),
      date: m.Date_Completed || m.Date_Submitted,
      vendor_name: m.Assigned_Vendor,
      tax_deductible: 1,
      isMaintenance: true,
      status: m.Status,
    }));

  const allExpenses = [
    ...expenses.map(e => ({ ...e, isMaintenance: false })),
    ...maintenanceExpenses,
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredExpenses = filterCategory === 'all' 
    ? allExpenses 
    : allExpenses.filter(e => e.category === filterCategory);

  const totalExpenses = allExpenses.reduce((s, e) => s + e.amount, 0);
  const totalDeductible = allExpenses.filter(e => e.tax_deductible).reduce((s, e) => s + e.amount, 0);
  const thisMonth = allExpenses.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + e.amount, 0);
  const recurringTotal = expenses.filter(e => e.recurring).reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display tracking-tight">Expenses</h1>
          <p className="text-muted-foreground text-sm mt-1">Track all property expenses & maximize tax deductions</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gradient-primary text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount *</Label>
                  <Input type="number" min="0" step="0.01" value={form.amount || ''} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
                </div>
              </div>
              <div>
                <Label>Description *</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was this expense for?" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date *</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <Label>Property (optional)</Label>
                  <Select value={form.property_id || 'none'} onValueChange={(v) => setForm({ ...form, property_id: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="All properties" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All properties</SelectItem>
                      {properties.map(p => <SelectItem key={p.Property_ID} value={p.Property_ID}>{p.Address}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Vendor / Payee</Label>
                <Input value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} placeholder="Company or person paid" />
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.tax_deductible} onCheckedChange={(v) => setForm({ ...form, tax_deductible: v })} />
                  <Label className="text-sm">Tax Deductible</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.recurring} onCheckedChange={(v) => setForm({ ...form, recurring: v })} />
                  <Label className="text-sm">Recurring</Label>
                </div>
              </div>
              {form.recurring && (
                <div>
                  <Label>Frequency</Label>
                  <Select value={form.recurring_frequency || 'monthly'} onValueChange={(v) => setForm({ ...form, recurring_frequency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional details..." rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={createExpense.isPending || updateExpense.isPending} className="gradient-primary text-white">
                {createExpense.isPending || updateExpense.isPending ? 'Saving...' : editingExpense ? 'Update' : 'Add Expense'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Expenses" value={`$${totalExpenses.toLocaleString()}`} icon={Receipt} variant="default" />
        <StatCard title="Tax Deductible" value={`$${totalDeductible.toLocaleString()}`} subtitle="Potential savings" icon={DollarSign} variant="success" />
        <StatCard title="This Month" value={`$${thisMonth.toLocaleString()}`} icon={TrendingDown} variant="warning" />
        <StatCard title="Recurring" value={`$${recurringTotal.toLocaleString()}/mo`} subtitle={`${expenses.filter(e => e.recurring).length} recurring items`} icon={CalendarCheck} variant="primary" />
      </div>

      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg">All Expenses</CardTitle>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          {filteredExpenses.length === 0 ? (
            <EmptyState icon={Receipt} title="No Expenses" description="Click 'Add Expense' to start tracking your property expenses for tax deductions." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Tax Ded.</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense: any) => (
                    <TableRow key={expense.expense_id}>
                      <TableCell className="font-medium">
                        <div>
                          {expense.description}
                          {expense.isMaintenance && <Badge variant="outline" className="ml-2 text-xs">Maintenance</Badge>}
                          {expense.recurring ? <Badge variant="secondary" className="ml-2 text-xs">Recurring</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{expense.category}</Badge></TableCell>
                      <TableCell className="font-semibold">${expense.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-sm">{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{expense.vendor_name || '—'}</TableCell>
                      <TableCell>{expense.tax_deductible ? '✓' : '—'}</TableCell>
                      <TableCell className="text-right">
                        {!expense.isMaintenance && (
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(expense)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.expense_id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Expenses;
