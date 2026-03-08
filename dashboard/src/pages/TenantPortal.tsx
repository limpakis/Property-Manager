import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  Calendar, DollarSign, Home, Clock, AlertTriangle, CheckCircle2,
  Wrench, FileText, ChevronRight, Send, Phone, Mail, Building2,
  BedDouble, Bath, Ruler, Plus, X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function fetchPortal(token: string) {
  const res = await fetch(`${BASE}/api/tenant-portal/${token}`);
  if (!res.ok) throw new Error('Portal not found');
  return res.json();
}

async function postRequest(token: string, body: object) {
  const res = await fetch(`${BASE}/api/tenant-portal/${token}/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed to submit'); }
  return res.json();
}

async function postPay(token: string, amount?: number) {
  const res = await fetch(`${BASE}/api/tenant-portal/${token}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Payment setup failed'); }
  return res.json();
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}
function leaseProgress(s: string, e: string) {
  const start = new Date(s).getTime(), end = new Date(e).getTime();
  return Math.max(0, Math.min(100, ((Date.now() - start) / (end - start)) * 100));
}
function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type Tab = 'overview' | 'payments' | 'requests' | 'lease';

export default function TenantPortal() {
  const { token } = useParams<{ token: string }>();
  const [tab, setTab] = useState<Tab>('overview');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [reqForm, setReqForm] = useState({ issue_description: '', category: 'General', priority: 'Medium' });
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [paying, setPaying] = useState(false);
  const qc = useQueryClient();

  async function handlePay() {
    setPaying(true);
    try {
      const { url } = await postPay(token!, monthly_rent);
      window.location.href = url;
    } catch (e: any) {
      alert(e.message);
    } finally {
      setPaying(false);
    }
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['portal', token],
    queryFn: () => fetchPortal(token!),
    enabled: !!token,
    retry: false,
  });

  const submitMut = useMutation({
    mutationFn: (body: object) => postRequest(token!, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal', token] });
      setSubmitSuccess(true);
      setShowRequestForm(false);
      setReqForm({ issue_description: '', category: 'General', priority: 'Medium' });
      setTimeout(() => setSubmitSuccess(false), 4000);
    },
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50"><LoadingSpinner /></div>
  );

  if (error || !data) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 px-4">
      <AlertTriangle className="h-12 w-12 text-yellow-500" />
      <h1 className="text-xl font-semibold">Portal Link Not Found</h1>
      <p className="text-slate-500 text-sm text-center">This link may be invalid or expired. Contact your property manager.</p>
    </div>
  );

  const { tenant, payments = [], requests = [] } = data;
  const {
    tenant_name, lease_start, lease_end, monthly_rent, security_deposit, status, notes,
    address, city, state, zip, bedrooms, bathrooms, square_feet, property_type,
    owner_name, owner_phone, owner_email,
  } = tenant;

  const days = lease_end ? daysUntil(lease_end) : null;
  const prog = lease_start && lease_end ? leaseProgress(lease_start, lease_end) : null;
  const isExpired = days !== null && days < 0;
  const isExpiringSoon = days !== null && days >= 0 && days <= 60;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <Home className="h-4 w-4" /> },
    { id: 'payments', label: 'Payments', icon: <DollarSign className="h-4 w-4" />, count: payments.length },
    { id: 'requests', label: 'Requests', icon: <Wrench className="h-4 w-4" />, count: requests.length },
    { id: 'lease', label: 'Lease', icon: <FileText className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-[hsl(207,18%,52%)] text-white px-4 py-4">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/branding/extracted-1.jpg" alt="TrueNorth PM" className="h-9 w-9 rounded-full object-cover" />
              <div>
                <p className="font-bold leading-none">TrueNorth PM</p>
                <p className="text-xs opacity-75 mt-0.5">Tenant Portal</p>
              </div>
            </div>
            <Badge variant="secondary" className="gap-1 bg-white/20 text-white border-0">
              {status === 'Active' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
              {status}
            </Badge>
          </div>
          <div className="mt-4">
            <p className="text-white/70 text-xs">Welcome back,</p>
            <p className="text-xl font-bold">{tenant_name}</p>
            {address && <p className="text-sm opacity-80 mt-0.5 flex items-center gap-1"><Home className="h-3 w-3" />{address}{city ? `, ${city}` : ''}</p>}
          </div>
          {monthly_rent > 0 && (
            <div className="mt-4 bg-white/15 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm opacity-80">Monthly Rent</span>
              <span className="text-2xl font-bold">${Number(monthly_rent).toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-xl mx-auto flex overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-[hsl(207,18%,52%)] text-[hsl(207,18%,42%)]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.icon}{t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="bg-slate-100 text-slate-600 text-xs rounded-full px-1.5 py-0.5 leading-none">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-4">

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <>
            {lease_start && lease_end && (
              <Card className={isExpired ? 'border-red-200' : isExpiringSoon ? 'border-yellow-200' : ''}>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Lease Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                  <div className="flex justify-between text-sm">
                    <div><p className="text-xs text-muted-foreground">Start</p><p className="font-medium">{fmt(lease_start)}</p></div>
                    <div className="text-right"><p className="text-xs text-muted-foreground">End</p><p className="font-medium">{fmt(lease_end)}</p></div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isExpired ? 'bg-red-500' : isExpiringSoon ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${prog ?? 0}%` }} />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {isExpired
                      ? <span className="text-red-600 font-medium">Expired {Math.abs(days!)} days ago</span>
                      : <span className={isExpiringSoon ? 'text-yellow-700 font-medium' : 'text-muted-foreground'}>{days} days remaining</span>}
                  </div>
                  {isExpiringSoon && !isExpired && (
                    <div className="text-xs text-yellow-700 bg-yellow-50 rounded px-3 py-2 border border-yellow-100">
                      Lease expiring soon — contact your property manager about renewal.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {isExpired && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Rent overdue</p>
                  <p className="text-xs text-red-600 mt-0.5">Your lease expired {Math.abs(days!)} days ago. Please contact your property manager to arrange payment or renewal.</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border p-3 text-center">
                <p className={`text-lg font-bold ${isExpired ? 'text-red-600' : ''}`}>
                  ${monthly_rent > 0 ? Number(monthly_rent).toLocaleString() : '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Monthly Due</p>
              </div>
              <div className="bg-white rounded-xl border p-3 text-center">
                <p className="text-lg font-bold">
                  {lease_start
                    ? Math.max(1, Math.round((Math.min(Date.now(), lease_end ? new Date(lease_end).getTime() : Date.now()) - new Date(lease_start).getTime()) / (1000 * 60 * 60 * 24 * 30)))
                    : '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Months Tenanted</p>
              </div>
              <div className="bg-white rounded-xl border p-3 text-center">
                <p className="text-lg font-bold">
                  {security_deposit > 0 ? `$${Number(security_deposit).toLocaleString()}` : '—'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Deposit Held</p>
              </div>
            </div>

            {(owner_name || owner_phone || owner_email) && (
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Property Manager</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pb-4">
                  {owner_name && <p className="font-semibold text-sm">{owner_name}</p>}
                  {owner_phone && (
                    <a href={`tel:${owner_phone}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                      <Phone className="h-3.5 w-3.5" />{owner_phone}
                    </a>
                  )}
                  {owner_email && (
                    <a href={`mailto:${owner_email}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                      <Mail className="h-3.5 w-3.5" />{owner_email}
                    </a>
                  )}
                </CardContent>
              </Card>
            )}

            {monthly_rent > 0 && (
              <button
                onClick={handlePay}
                disabled={paying}
                className="w-full flex items-center justify-between bg-blue-600 hover:bg-blue-700 disabled:opacity-60 border-0 rounded-xl px-4 py-3 transition-colors text-left text-white"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-blue-500 flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{paying ? 'Redirecting to payment…' : `Pay $${Number(monthly_rent).toLocaleString()} Now`}</p>
                    <p className="text-xs text-blue-100">Secure payment via Stripe</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-blue-200" />
              </button>
            )}

            <button
              onClick={() => { setTab('requests'); setShowRequestForm(true); }}
              className="w-full flex items-center justify-between bg-white border rounded-xl px-4 py-3 hover:bg-slate-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center">
                  <Wrench className="h-4 w-4 text-orange-600" />
                </div>
                <div><p className="font-medium text-sm">Submit a Maintenance Request</p><p className="text-xs text-muted-foreground">Report an issue with your unit</p></div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </>
        )}

        {/* PAYMENTS */}
        {tab === 'payments' && (
          <>
            {payments.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No payments on record yet</p>
                <p className="text-sm mt-1">Your payment history will appear here.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((p: any) => (
                  <Card key={p.payment_id}>
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">${Number(p.amount).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.date_completed ? fmt(p.date_completed) : fmt(p.date_created)}
                          {p.payment_method ? ` · ${p.payment_method}` : ''}
                        </p>
                        {p.notes && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{p.notes}</p>}
                      </div>
                      <Badge
                        variant={p.status === 'completed' ? 'default' : p.status === 'pending' ? 'secondary' : 'destructive'}
                        className="capitalize text-xs"
                      >
                        {p.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
                <div className="bg-white border rounded-xl p-3 flex justify-between text-sm font-medium">
                  <span className="text-muted-foreground">Total paid</span>
                  <span>${payments.filter((p: any) => p.status === 'completed').reduce((s: number, p: any) => s + Number(p.amount), 0).toLocaleString()}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* REQUESTS */}
        {tab === 'requests' && (
          <>
            {submitSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4" /> Request submitted! We will be in touch soon.
              </div>
            )}

            {showRequestForm ? (
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">New Maintenance Request</CardTitle>
                    <button onClick={() => setShowRequestForm(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pb-5">
                  <div>
                    <Label>Describe the issue *</Label>
                    <Textarea
                      value={reqForm.issue_description}
                      onChange={e => setReqForm(f => ({ ...f, issue_description: e.target.value }))}
                      placeholder="e.g. Bathroom faucet is leaking, no hot water in kitchen..."
                      rows={4}
                      className="mt-1"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Category</Label>
                      <Select value={reqForm.category} onValueChange={v => setReqForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Plumbing">Plumbing</SelectItem>
                          <SelectItem value="Electrical">Electrical</SelectItem>
                          <SelectItem value="HVAC">HVAC</SelectItem>
                          <SelectItem value="Appliance">Appliance</SelectItem>
                          <SelectItem value="Structural">Structural</SelectItem>
                          <SelectItem value="Pest Control">Pest Control</SelectItem>
                          <SelectItem value="General">General</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select value={reqForm.priority} onValueChange={v => setReqForm(f => ({ ...f, priority: v }))}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {submitMut.isError && (
                    <p className="text-sm text-red-600">{(submitMut.error as Error).message}</p>
                  )}
                  <Button
                    className="w-full gap-2"
                    onClick={() => submitMut.mutate(reqForm)}
                    disabled={!reqForm.issue_description.trim() || submitMut.isPending}
                  >
                    <Send className="h-4 w-4" />
                    {submitMut.isPending ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Button onClick={() => setShowRequestForm(true)} className="w-full gap-2">
                <Plus className="h-4 w-4" /> New Request
              </Button>
            )}

            {requests.length === 0 && !showRequestForm ? (
              <div className="text-center py-12 text-slate-400">
                <Wrench className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No maintenance requests yet</p>
                <p className="text-sm mt-1">Use the button above to report an issue.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {requests.map((r: any) => (
                  <Card key={r.request_id}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{r.issue_description}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-muted-foreground">{r.category}</span>
                            {r.date_submitted && <span className="text-xs text-muted-foreground">· {fmt(r.date_submitted)}</span>}
                            {r.date_completed && <span className="text-xs text-green-600">· Completed {fmt(r.date_completed)}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge
                            variant={r.status === 'Completed' ? 'default' : r.status === 'In Progress' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {r.status}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-xs ${r.priority === 'Emergency' ? 'border-red-400 text-red-600' : r.priority === 'High' ? 'border-orange-400 text-orange-600' : ''}`}
                          >
                            {r.priority}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* LEASE */}
        {tab === 'lease' && (
          <>
            <Card>
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Lease Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <div className="grid grid-cols-2 gap-y-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Tenant</p><p className="font-medium">{tenant_name}</p></div>
                  <div><p className="text-xs text-muted-foreground">Status</p><p className="font-medium">{status}</p></div>
                  {lease_start && <div><p className="text-xs text-muted-foreground">Start Date</p><p className="font-medium">{fmt(lease_start)}</p></div>}
                  {lease_end && <div><p className="text-xs text-muted-foreground">End Date</p><p className="font-medium">{fmt(lease_end)}</p></div>}
                  {monthly_rent > 0 && <div><p className="text-xs text-muted-foreground">Monthly Rent</p><p className="font-medium">${Number(monthly_rent).toLocaleString()}</p></div>}
                  {security_deposit > 0 && <div><p className="text-xs text-muted-foreground">Security Deposit</p><p className="font-medium">${Number(security_deposit).toLocaleString()}</p></div>}
                </div>
                {notes && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {address && (
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                    <Building2 className="h-4 w-4" /> Property Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                  <div>
                    <p className="font-semibold">{address}</p>
                    <p className="text-sm text-muted-foreground">{city}{state ? `, ${state}` : ''}{zip ? ` ${zip}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    {bedrooms && <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{bedrooms} bed</span>}
                    {bathrooms && <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{bathrooms} bath</span>}
                    {square_feet && <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" />{Number(square_feet).toLocaleString()} sqft</span>}
                    {property_type && <span>{property_type}</span>}
                  </div>
                </CardContent>
              </Card>
            )}

            {(owner_name || owner_phone || owner_email) && (
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Property Manager Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pb-4">
                  {owner_name && <p className="font-semibold text-sm">{owner_name}</p>}
                  {owner_phone && (
                    <a href={`tel:${owner_phone}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                      <Phone className="h-3.5 w-3.5" />{owner_phone}
                    </a>
                  )}
                  {owner_email && (
                    <a href={`mailto:${owner_email}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                      <Mail className="h-3.5 w-3.5" />{owner_email}
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}

        <p className="text-center text-xs text-muted-foreground pt-2 pb-6">Powered by TrueNorth PM</p>
      </div>
    </div>
  );
}
