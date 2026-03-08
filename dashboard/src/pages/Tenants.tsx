import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail, Phone, Calendar, Users as UsersIcon, Plus, Pencil, Trash2,
  Send, CreditCard, Link as LinkIcon, AlertTriangle, Home, Clock
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import api from '@/lib/api';

interface Tenant {
  tenant_id: string;
  tenant_name: string;
  email: string;
  phone: string;
  property_id: string;
  address?: string;
  city?: string;
  state?: string;
  lease_start: string;
  lease_end: string;
  monthly_rent: number;
  security_deposit: number;
  status: string;
  notes: string;
}

interface Property {
  property_id?: string;
  Property_ID?: string;
  address?: string;
  Address?: string;
  city?: string;
  City?: string;
}

const EMPTY_FORM = {
  tenant_name: '', email: '', phone: '', property_id: '',
  lease_start: '', lease_end: '', monthly_rent: '',
  security_deposit: '', status: 'Active', notes: '',
};

function daysUntil(d: string) { return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000); }
function leaseProgress(s: string, e: string) {
  const start = new Date(s).getTime(), end = new Date(e).getTime();
  return Math.max(0, Math.min(100, ((Date.now() - start) / (end - start)) * 100));
}
function lsLabel(end: string) {
  const d = daysUntil(end);
  if (d < 0) return { label: 'Expired', cls: 'bg-red-100 text-red-700' };
  if (d <= 30) return { label: `${d}d left`, cls: 'bg-red-100 text-red-700' };
  if (d <= 90) return { label: `${d}d left`, cls: 'bg-yellow-100 text-yellow-700' };
  return { label: `${d}d left`, cls: 'bg-green-100 text-green-700' };
}
function initials(name: string) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2); }

const COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];

export default function Tenants() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [deleteConfirm, setDeleteConfirm] = useState<Tenant | null>(null);
  const [sendingLink, setSendingLink] = useState<string | null>(null);

  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ['tenants'], queryFn: () => api.getTenants(),
  });
  const { data: allProperties = [] } = useQuery<Property[]>({
    queryKey: ['properties'], queryFn: () => api.getProperties(),
  });

  const createMut = useMutation({
    mutationFn: (d: typeof EMPTY_FORM) => api.createTenant(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenants'] }); toast.success('Tenant added'); closeModal(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof EMPTY_FORM }) => api.updateTenant(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenants'] }); toast.success('Tenant updated'); closeModal(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteTenant(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenants'] }); toast.success('Tenant removed'); setDeleteConfirm(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  function openAdd() { setEditTenant(null); setForm({ ...EMPTY_FORM }); setModalOpen(true); }
  function openEdit(t: Tenant) {
    setEditTenant(t);
    setForm({ tenant_name: t.tenant_name||'', email: t.email||'', phone: t.phone||'', property_id: t.property_id||'', lease_start: t.lease_start||'', lease_end: t.lease_end||'', monthly_rent: t.monthly_rent?.toString()||'', security_deposit: t.security_deposit?.toString()||'', status: t.status||'Active', notes: t.notes||'' });
    setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setEditTenant(null); setForm({ ...EMPTY_FORM }); }
  function handleSubmit() {
    if (!form.tenant_name.trim()) { toast.error('Name is required'); return; }
    editTenant ? updateMut.mutate({ id: editTenant.tenant_id, data: form }) : createMut.mutate(form);
  }

  async function handlePortalLink(t: Tenant) {
    setSendingLink(t.tenant_id + '_portal');
    try {
      const res = await api.getTenantPortalLink(t.tenant_id);
      const token = res.token || res.url?.split('/tenant-portal/')[1];
      const url = `${window.location.origin}/tenant-portal/${token}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success('Portal link copied!', { description: url });
    } catch (e: any) { toast.error(e.message); } finally { setSendingLink(null); }
  }

  async function handlePayLink(t: Tenant) {
    setSendingLink(t.tenant_id + '_pay');
    try {
      const { url } = await api.createPaymentLink({ tenantId: t.tenant_id, propertyId: t.property_id, amount: t.monthly_rent, type: 'rent', description: `Rent${t.address ? ` — ${t.address}` : ''}` });
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success('Payment link copied!');
    } catch (e: any) { toast.error(e.message); } finally { setSendingLink(null); }
  }

  const filtered = tenants.filter(t => !search ||
    t.tenant_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase()) ||
    t.address?.toLowerCase().includes(search.toLowerCase())
  );

  const active = tenants.filter(t => t.status === 'Active');
  const expiring = tenants.filter(t => t.lease_end && daysUntil(t.lease_end) >= 0 && daysUntil(t.lease_end) <= 60).length;
  const expired = tenants.filter(t => t.lease_end && daysUntil(t.lease_end) < 0).length;
  const income = active.reduce((s, t) => s + (t.monthly_rent || 0), 0);

  if (isLoading) return <div className="flex items-center justify-center h-96"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage tenants and track leases</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="h-4 w-4" /> Add Tenant</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Active Tenants" value={active.length.toString()} icon={UsersIcon} />
        <StatCard title="Monthly Income" value={`$${income.toLocaleString()}`} icon={CreditCard} />
        <StatCard title="Expiring (60d)" value={expiring.toString()} icon={Clock} />
        <StatCard title="Expired Leases" value={expired.toString()} icon={AlertTriangle} />
      </div>

      <Input placeholder="Search by name, email, address…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />

      {filtered.length === 0 ? (
        <div className="space-y-4">
          <EmptyState icon={UsersIcon} title="No tenants yet" description="Add your first tenant to start tracking leases." />
          <div className="flex justify-center">
            <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Tenant</Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t, i) => {
            const ls = t.lease_end ? lsLabel(t.lease_end) : null;
            const prog = t.lease_start && t.lease_end ? leaseProgress(t.lease_start, t.lease_end) : null;
            return (
              <Card key={t.tenant_id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${COLORS[i % COLORS.length]}`}>
                      {initials(t.tenant_name || '?')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate">{t.tenant_name}</p>
                        <Badge variant={t.status === 'Active' ? 'default' : 'secondary'} className="text-[10px] py-0">{t.status}</Badge>
                      </div>
                      {t.address && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Home className="h-3 w-3" />{t.address}{t.city ? `, ${t.city}` : ''}</p>}
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    {t.email && <p className="flex items-center gap-2"><Mail className="h-3 w-3" />{t.email}</p>}
                    {t.phone && <p className="flex items-center gap-2"><Phone className="h-3 w-3" />{t.phone}</p>}
                  </div>

                  {t.monthly_rent > 0 && (
                    <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                      <span className="text-xs text-muted-foreground">Monthly Rent</span>
                      <span className="font-semibold text-sm">${t.monthly_rent.toLocaleString()}</span>
                    </div>
                  )}

                  {t.lease_start && t.lease_end && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(t.lease_start).toLocaleDateString('en-US',{month:'short',year:'numeric'})} → {new Date(t.lease_end).toLocaleDateString('en-US',{month:'short',year:'numeric'})}
                        </span>
                        {ls && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ls.cls}`}>{ls.label}</span>}
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${prog && prog > 90 ? 'bg-red-500' : prog && prog > 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${prog ?? 0}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1" onClick={() => handlePortalLink(t)} disabled={sendingLink === t.tenant_id + '_portal'}>
                      <LinkIcon className="h-3 w-3" />{sendingLink === t.tenant_id + '_portal' ? 'Copying…' : 'Portal Link'}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs h-7 gap-1" onClick={() => handlePayLink(t)} disabled={sendingLink === t.tenant_id + '_pay'}>
                      <Send className="h-3 w-3" />{sendingLink === t.tenant_id + '_pay' ? 'Copying…' : 'Pay Link'}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(t)}><Pencil className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(t)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {expiring > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800">{expiring} lease{expiring !== 1 ? 's' : ''} expiring within 60 days</p>
              <p className="text-xs text-yellow-700">Contact tenants about renewal before it's too late.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={v => { if (!v) closeModal(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editTenant ? 'Edit Tenant' : 'Add Tenant'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Full Name *</Label>
                <Input value={form.tenant_name} onChange={e => setForm(f => ({ ...f, tenant_name: e.target.value }))} placeholder="Jane Smith" />
              </div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@email.com" /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" /></div>
              <div className="col-span-2">
                <Label>Property</Label>
                <Select value={form.property_id} onValueChange={v => setForm(f => ({ ...f, property_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger>
                  <SelectContent>
                    {(allProperties as Property[]).map((p) => {
                      const id = (p.property_id || p.Property_ID || '') as string;
                      const addr = (p.address || p.Address || '') as string;
                      const city = (p.city || p.City || '') as string;
                      return <SelectItem key={id} value={id}>{addr}{city ? `, ${city}` : ''}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Lease Start</Label><Input type="date" value={form.lease_start} onChange={e => setForm(f => ({ ...f, lease_start: e.target.value }))} /></div>
              <div><Label>Lease End</Label><Input type="date" value={form.lease_end} onChange={e => setForm(f => ({ ...f, lease_end: e.target.value }))} /></div>
              <div><Label>Monthly Rent ($)</Label><Input type="number" value={form.monthly_rent} onChange={e => setForm(f => ({ ...f, monthly_rent: e.target.value }))} placeholder="2000" /></div>
              <div><Label>Security Deposit ($)</Label><Input type="number" value={form.security_deposit} onChange={e => setForm(f => ({ ...f, security_deposit: e.target.value }))} placeholder="2000" /></div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Eviction">Eviction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes…" rows={2} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
              {createMut.isPending || updateMut.isPending ? 'Saving…' : editTenant ? 'Save Changes' : 'Add Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => { if (!v) setDeleteConfirm(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remove Tenant</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Remove <strong>{deleteConfirm?.tenant_name}</strong>? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && deleteMut.mutate(deleteConfirm.tenant_id)} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
