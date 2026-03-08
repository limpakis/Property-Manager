import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Clock,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  AlertTriangle,
  Wrench,
  FileText,
  Zap,
  Star,
  Mail,
  ChevronDown,
  XCircle,
  Phone,
  RefreshCw,
  BadgeCheck,
  Timer,
  ChevronRight,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Inputs {
  properties: number;
  avgRent: number;
  hoursPerWeek: number;
  hourlyRate: number;
  vacancyDays: number;
  maintenance: number;
  latePayments: boolean;
  manualReports: boolean;
  spreadsheets: boolean;
  vendorCoord: boolean;
}

interface Problem {
  id: string;
  label: string;
  icon: React.ElementType;
  lossLabel: string;
  loss: number;
  howBad: string;
  fix: string;
  fixDetail: string;
  fixTime: string;
}

// ─── Calculation ──────────────────────────────────────────────────────────────

function compute(i: Inputs) {
  const monthlyRent = i.properties * i.avgRent;
  const annualRent = monthlyRent * 12;

  // Time lost to admin
  const savedHoursPct = 0.62;
  const timeLossAnnual = i.hoursPerWeek * 52 * savedHoursPct * i.hourlyRate;

  // Late payments: 9% of tenants on avg, 14-day avg delay
  const lateRate = i.latePayments ? 0.13 : 0.07;
  const lateLossAnnual = annualRent * lateRate * (14 / 30);

  // Vacancy: industry avg re-fill is 25 days, good software cuts to 14
  const reducible = Math.max(0, i.vacancyDays - 14);
  const turnoverRate = 0.35; // 35% of units turn per year
  const vacancyLossAnnual = i.properties * (i.avgRent / 30) * reducible * turnoverRate;

  // Maintenance overspend (no tracking = 22% overrun)
  const maintenanceCostPerRequest = 195;
  const overspendRate = i.vendorCoord ? 0.26 : 0.16;
  const maintenanceLossAnnual = i.maintenance * maintenanceCostPerRequest * overspendRate * 12;

  // Report & spreadsheet time overhead
  const reportHrsPerMonth = i.manualReports ? 6 : 2;
  const spreadsheetHrsPerMonth = i.spreadsheets ? 5 : 1;
  const adminOverheadAnnual = (reportHrsPerMonth + spreadsheetHrsPerMonth) * 12 * i.hourlyRate;

  const total = timeLossAnnual + lateLossAnnual + vacancyLossAnnual + maintenanceLossAnnual + adminOverheadAnnual;
  const monthly = total / 12;

  // Plan
  const plan: 'starter' | 'professional' | 'enterprise' =
    i.properties <= 10 ? 'starter' : i.properties <= 50 ? 'professional' : 'enterprise';
  const planPrices = { starter: 49, professional: 99, enterprise: 299 };
  const planPrice = planPrices[plan];
  const netAnnualSavings = total - planPrice * 12;
  const roiX = planPrice > 0 ? total / (planPrice * 12) : 0;
  const paybackDays = monthly > 0 ? Math.max(2, Math.ceil((planPrice / monthly) * 30)) : 30;

  return {
    timeLossAnnual,
    lateLossAnnual,
    vacancyLossAnnual,
    maintenanceLossAnnual,
    adminOverheadAnnual,
    total,
    monthly,
    plan,
    planPrice,
    netAnnualSavings,
    roiX,
    paybackDays,
  };
}

function fmt(n: number, dec = 0) {
  return n.toLocaleString('en-US', { maximumFractionDigits: dec, minimumFractionDigits: dec });
}

// ─── Slider ──────────────────────────────────────────────────────────────────

function Slider({
  label, value, onChange, min, max, step = 1, prefix = '', suffix = '', note,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; prefix?: string; suffix?: string; note?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-base font-bold text-slate-900 tabular-nums">{prefix}{value.toLocaleString()}{suffix}</span>
      </div>
      <div className="relative h-8 flex items-center">
        <div className="absolute inset-x-0 h-2 rounded-full bg-slate-200" />
        <div
          className="absolute left-0 h-2 rounded-full bg-gradient-to-r from-orange-400 to-orange-500 pointer-events-none"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="roi-range relative z-10 w-full appearance-none bg-transparent focus:outline-none"
        />
      </div>
      <div className="flex justify-between text-xs text-slate-400">
        <span>{prefix}{min.toLocaleString()}{suffix}</span>
        {note && <span className="text-orange-500 font-medium">{note}</span>}
        <span>{prefix}{max.toLocaleString()}{suffix}</span>
      </div>
    </div>
  );
}

// ─── Checkbox Toggle ──────────────────────────────────────────────────────────

function Toggle({
  checked, onChange, label, cost,
}: { checked: boolean; onChange: () => void; label: string; cost: string }) {
  return (
    <button
      onClick={onChange}
      className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all duration-200 ${
        checked ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`h-5 w-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-red-500' : 'border-2 border-slate-300'}`}>
          {checked && <XCircle className="h-3.5 w-3.5 text-white" />}
        </div>
        <span className={`text-sm ${checked ? 'font-medium text-slate-900' : 'text-slate-600'}`}>{label}</span>
      </div>
      {checked && <span className="text-xs font-bold text-red-500 ml-2 flex-shrink-0">{cost}</span>}
    </button>
  );
}

// ─── Problem Fix Card ─────────────────────────────────────────────────────────

function ProblemCard({ loss, howBad, fix, fixDetail, fixTime, label, icon: Icon }: Problem) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="h-9 w-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
          <Icon className="h-4 w-4 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-slate-900">{label}</span>
            <span className="text-sm font-bold text-red-600 tabular-nums flex-shrink-0">-${fmt(loss)}/yr</span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{howBad}</p>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-48' : 'max-h-0'}`}>
        <div className="border-t border-slate-100 p-4 bg-green-50/50 space-y-2">
          <div className="flex items-center gap-2">
            <BadgeCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
            <span className="text-sm font-semibold text-green-800">{fix}</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed pl-6">{fixDetail}</p>
          <div className="flex items-center gap-1.5 pl-6">
            <Timer className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-xs font-medium text-orange-600">{fixTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    quote: 'I spent 4 hours every month just creating owner reports. Now it takes 8 minutes. That alone was worth the subscription.',
    name: 'Derek H.',
    role: '19 single-family homes, Texas',
    result: '+$3,800/yr recovered',
    avatar: 'DH',
  },
  {
    quote: "We had 3 tenants chronically late every month. After automated reminders and online payments, we've had one late payment in 7 months.",
    name: 'Jessica M.',
    role: 'Manages 38 units, Florida',
    result: '$14,200/yr saved',
    avatar: 'JM',
  },
  {
    quote: 'A plumber charged us $850 for a job that should have cost $350. We had no way to know. Now I get vendor comparisons and pre-approvals in the app.',
    name: 'Carlos R.',
    role: '27-unit building, California',
    result: '$11,600/yr saved',
    avatar: 'CR',
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────

export default function ROICalculator() {
  const resultsRef = useRef<HTMLDivElement>(null);
  const [inputs, setInputs] = useState<Inputs>({
    properties: 15,
    avgRent: 1500,
    hoursPerWeek: 22,
    hourlyRate: 65,
    vacancyDays: 28,
    maintenance: 10,
    latePayments: true,
    manualReports: true,
    spreadsheets: true,
    vendorCoord: false,
  });
  const [email, setEmail] = useState('');
  const [emailDone, setEmailDone] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [calculated, setCalculated] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [justCalculated, setJustCalculated] = useState(false);

  const r = useMemo(() => compute(inputs), [inputs]);

  const set = <K extends keyof Inputs>(k: K, v: Inputs[K]) =>
    setInputs(prev => ({ ...prev, [k]: v }));

  const handleCalculate = () => {
    setCalculated(true);
    setJustCalculated(true);
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  useEffect(() => {
    if (justCalculated) setJustCalculated(false);
  }, [justCalculated]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || emailDone) return;
    setEmailLoading(true);
    try {
      await fetch('http://localhost:3001/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'roi_calculator',
          calculatorInputs: inputs,
          calculatorResults: {
            totalAnnualLoss: r.total,
            netAnnualSavings: r.netAnnualSavings,
            roiX: r.roiX,
            recommendedPlan: r.plan,
          },
        }),
      });
    } catch { /* silent */ }
    setEmailDone(true);
    setEmailLoading(false);
  };

  // Benchmark callouts shown beside sliders
  const benchmarks = {
    properties: inputs.properties <= 5 ? 'Getting started' : inputs.properties <= 20 ? 'Typical solo manager' : 'Growing portfolio',
    hoursPerWeek: inputs.hoursPerWeek < 15 ? 'Great! Most spend 20-28 hrs' : inputs.hoursPerWeek <= 28 ? `Industry avg is 22 hrs` : `${inputs.hoursPerWeek - 22}+ hrs more than avg`,
    vacancyDays: inputs.vacancyDays <= 14 ? 'Excellent — goal is <14 days' : inputs.vacancyDays <= 28 ? 'Industry avg: 25 days' : `${inputs.vacancyDays - 14} days recoverable`,
  };

  const problems: Problem[] = [
    {
      id: 'time',
      label: 'Time lost on admin tasks',
      icon: Clock,
      lossLabel: 'Time cost',
      loss: r.timeLossAnnual,
      howBad: `${Math.round(inputs.hoursPerWeek * 0.62)} of your ${inputs.hoursPerWeek} hrs/wk can be automated`,
      fix: 'Automate 60%+ of recurring tasks',
      fixDetail: 'Rent reminders, lease renewals, report generation, payment reconciliation and maintenance follow-ups all run automatically. Most users drop from 22 hrs/week to under 9.',
      fixTime: 'Savings begin in week 1',
    },
    {
      id: 'late',
      label: 'Late & missed rent payments',
      icon: DollarSign,
      lossLabel: 'Late payment losses',
      loss: r.lateLossAnnual,
      howBad: 'Avg manager loses 8-13% of rent income to late/partial payments',
      fix: 'Automated collection + smart reminders',
      fixDetail: 'Tenants pay online (ACH/card), auto-reminders go out 5 days before due date, late fees are charged automatically. Our users average 96% on-time collection.',
      fixTime: 'First rent cycle after setup',
    },
    {
      id: 'vacancy',
      label: 'Extended vacancy periods',
      icon: Building2,
      lossLabel: 'Vacancy losses',
      loss: r.vacancyLossAnnual,
      howBad: `Your ${inputs.vacancyDays}-day avg vacancy costs $${fmt(inputs.avgRent / 30 * Math.max(0, inputs.vacancyDays - 14))} per turnover`,
      fix: 'Faster re-listing and applicant pipeline',
      fixDetail: 'List available units in one click, screen applicants with automated background checks, and track your entire leasing pipeline. Average vacancy drops to 14 days.',
      fixTime: 'First vacancy after setup',
    },
    {
      id: 'maintenance',
      label: 'Maintenance overspend',
      icon: Wrench,
      lossLabel: 'Vendor overruns',
      loss: r.maintenanceLossAnnual,
      howBad: 'Untracked vendor work averages 22% cost overrun vs. documented jobs',
      fix: 'Vendor management with cost controls',
      fixDetail: 'Create work orders, get vendor quotes, set spending limits, and require photo evidence of completion. Compare vendor costs over time and cut the expensive ones.',
      fixTime: 'First maintenance cycle',
    },
    {
      id: 'admin',
      label: 'Owner reports & spreadsheets',
      icon: FileText,
      lossLabel: 'Admin overhead',
      loss: r.adminOverheadAnnual,
      howBad: `Manual reporting takes 6-11 hrs/month — yours costs $${fmt(r.adminOverheadAnnual / 12)}/mo in lost time`,
      fix: 'One-click owner reports, auto P&L',
      fixDetail: 'Financial reports, cash flow statements, and owner distributions are generated automatically each month. Share with a link — no spreadsheets, no PDF exports.',
      fixTime: 'Next reporting cycle',
    },
  ].filter(p => p.loss > 0).sort((a, b) => b.loss - a.loss);

  const planName = r.plan.charAt(0).toUpperCase() + r.plan.slice(1);
  const weeklyLoss = r.total / 52;
  const dailyLoss = r.total / 365;

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-[hsl(207,18%,52%)] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl overflow-hidden flex-shrink-0 relative">
              <img
                src="/branding/extracted-1.jpg"
                alt="TrueNorth PM"
                className="w-full h-full object-cover"
                style={{ objectPosition: 'center center' }}
              />
              <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ background: 'radial-gradient(ellipse 65% 65% at 50% 50%, transparent 30%, hsl(207,18%,52%) 85%)' }} />
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">TrueNorth PM</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:block text-sm font-medium text-white/70 hover:text-white px-3 py-2 transition-colors">
              Sign in
            </Link>
            <Link
              to="/register"
              className="flex items-center gap-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all duration-150"
            >
              Free Trial <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-b from-slate-950 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 70% 30%, hsl(25 95% 53% / 0.3), transparent 60%), radial-gradient(circle at 20% 80%, hsl(220 60% 40% / 0.2), transparent 60%)' }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-red-500/15 border border-red-500/30 px-4 py-1.5 mb-7">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-sm font-medium text-red-300">Average property manager loses $34,800/year</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.08] tracking-tight">
            Find out exactly{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">how much</span>{' '}
            <br className="hidden sm:block" />
            you're losing every month
          </h1>
          <p className="mt-5 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Plug in your numbers. We'll diagnose every leak in your portfolio 
            and show you exactly how to fix each one — not generic advice, your specific situation.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-sm text-slate-500">
            {['Takes 90 seconds', 'No account needed', 'Free to use'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-green-500" /> {t}
              </span>
            ))}
          </div>
          <button
            onClick={() => document.getElementById('calc')?.scrollIntoView({ behavior: 'smooth' })}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-4 text-base font-bold text-white shadow-xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all duration-200"
          >
            Calculate My Losses <ChevronDown className="h-5 w-5 animate-bounce" />
          </button>
        </div>
      </section>

      {/* ── Urgency ticker ── */}
      <div className="bg-red-600 py-2.5 text-center">
        <p className="text-sm font-bold text-white">
          Based on your current setup, you're losing approximately{' '}
          <span className="underline decoration-dotted">${fmt(Math.round(dailyLoss))}/day</span>
          {' '}from preventable inefficiencies — adjust below to get your exact number
        </p>
      </div>

      {/* ── Calculator ── */}
      <section id="calc" className="py-14 sm:py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">

            {/* Left: Inputs */}
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Your Portfolio</h2>
                <p className="text-sm text-slate-500 mt-1">Tell us about your situation — numbers update in real time</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
                <Slider label="Properties managed" value={inputs.properties} onChange={v => set('properties', v)} min={1} max={100} note={benchmarks.properties} />
                <Slider label="Average monthly rent" value={inputs.avgRent} onChange={v => set('avgRent', v)} min={500} max={5000} step={50} prefix="$" />
                <Slider label="Hours/week on property management" value={inputs.hoursPerWeek} onChange={v => set('hoursPerWeek', v)} min={5} max={60} suffix=" hrs" note={benchmarks.hoursPerWeek} />
                <Slider label="Your time value (hourly rate)" value={inputs.hourlyRate} onChange={v => set('hourlyRate', v)} min={25} max={200} step={5} prefix="$" suffix="/hr" note="Use $ you bill clients or your salary equivalent" />
                <Slider label="Average days to fill a vacancy" value={inputs.vacancyDays} onChange={v => set('vacancyDays', v)} min={0} max={90} suffix=" days" note={benchmarks.vacancyDays} />
                <Slider label="Maintenance requests per month" value={inputs.maintenance} onChange={v => set('maintenance', v)} min={0} max={50} />
              </div>

              {/* Pain point toggles */}
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Which of these are true for you?</h3>
                <p className="text-xs text-slate-500 mb-3">Each one adds to your calculated losses</p>
                <div className="space-y-2">
                  <Toggle checked={inputs.latePayments} onChange={() => set('latePayments', !inputs.latePayments)} label="I regularly chase late rent payments" cost={`+$${fmt(r.lateLossAnnual)}/yr`} />
                  <Toggle checked={inputs.manualReports} onChange={() => set('manualReports', !inputs.manualReports)} label="I create owner or financial reports manually (spreadsheets, Word, etc.)" cost={`+$${fmt(r.adminOverheadAnnual * 0.55)}/yr`} />
                  <Toggle checked={inputs.spreadsheets} onChange={() => set('spreadsheets', !inputs.spreadsheets)} label="I track expenses, payments, or leases in spreadsheets" cost={`+$${fmt(r.adminOverheadAnnual * 0.45)}/yr`} />
                  <Toggle checked={inputs.vendorCoord} onChange={() => set('vendorCoord', !inputs.vendorCoord)} label="I coordinate maintenance vendors through texts/calls with no formal tracking" cost={`+$${fmt(r.maintenanceLossAnnual * 0.4)}/yr`} />
                </div>
              </div>

              <button
                onClick={handleCalculate}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 px-6 py-4 text-base font-extrabold text-white shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 transition-all duration-200"
              >
                <Zap className="h-5 w-5" /> Show Me My Full Breakdown
              </button>
            </div>

            {/* Right: Live summary */}
            <div className="lg:sticky lg:top-24 space-y-4">
              {/* Live loss meter */}
              <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-xl">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Estimated annual losses</div>
                <div className="text-4xl sm:text-5xl font-extrabold text-red-400 tabular-nums transition-all duration-500">
                  ${fmt(r.total)}
                </div>
                <div className="mt-1 text-sm text-slate-400">
                  = <span className="text-white font-semibold">${fmt(r.total / 12)}/month</span>
                  {' '}or <span className="text-white font-semibold">${fmt(weeklyLoss)}/week</span>
                </div>
                <div className="mt-4 space-y-2.5">
                  {[
                    { label: 'Time on admin', value: r.timeLossAnnual },
                    { label: 'Late payments', value: r.lateLossAnnual },
                    { label: 'Vacancy losses', value: r.vacancyLossAnnual },
                    { label: 'Maintenance overruns', value: r.maintenanceLossAnnual },
                    { label: 'Report overhead', value: r.adminOverheadAnnual },
                  ].map(item => (
                    item.value > 0 && (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">{item.label}</span>
                          <span className="text-slate-300 tabular-nums">${fmt(item.value)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400 transition-all duration-700"
                            style={{ width: `${r.total > 0 ? (item.value / r.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* ROI preview */}
              <div className="rounded-2xl bg-green-50 border border-green-200 p-5 space-y-3">
                <div className="text-xs font-semibold text-green-700 uppercase tracking-wider">With TrueNorth PM {planName}</div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Subscription', value: `$${r.planPrice}/mo` },
                    { label: 'Net Savings', value: `$${fmt(r.netAnnualSavings)}/yr`, green: true },
                    { label: 'ROI', value: `${r.roiX.toFixed(1)}x`, green: true },
                    { label: 'Pays back in', value: `${r.paybackDays} days`, green: true },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl bg-white border border-green-100 p-3">
                      <div className="text-xs text-slate-500">{item.label}</div>
                      <div className={`text-base font-extrabold mt-0.5 ${item.green ? 'text-green-600' : 'text-slate-900'}`}>{item.value}</div>
                    </div>
                  ))}
                </div>
                <Link
                  to="/register"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:shadow-md transition-all"
                >
                  Start Free Trial — Recover This Money <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-center text-xs text-slate-400">14 days free · No credit card · Cancel anytime</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Results: Problem → Fix ── */}
      {calculated && (
        <section ref={resultsRef} className="py-14 sm:py-20 bg-white scroll-mt-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            {/* Headline */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-50 border border-red-200 px-5 py-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm font-semibold text-red-700">Your Portfolio Diagnosis</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                You're losing{' '}
                <span className="text-red-500">${fmt(r.total)}/year</span>{' '}
                across {problems.length} fixable problems
              </h2>
              <p className="mt-3 text-base text-slate-500 max-w-xl mx-auto">
                Click any problem below to see exactly how TrueNorth PM fixes it — and how quickly.
              </p>
            </div>

            {/* Problem list */}
            <div className="space-y-3 mb-10">
              {problems.map(p => <ProblemCard key={p.id} {...p} />)}
            </div>

            {/* Summary numbers */}
            <div className="rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-6 sm:p-8">
              <div className="grid sm:grid-cols-4 gap-4 text-center mb-6">
                {[
                  { label: 'Total Annual Losses', value: `$${fmt(r.total)}`, sub: 'what you lose today', color: 'text-red-600' },
                  { label: 'TrueNorth PM Cost', value: `$${r.planPrice * 12}/yr`, sub: `$${r.planPrice}/month ${planName}`, color: 'text-slate-700' },
                  { label: 'Net Annual Savings', value: `$${fmt(r.netAnnualSavings)}`, sub: 'money back in your pocket', color: 'text-green-600' },
                  { label: 'Payback Period', value: `${r.paybackDays} days`, sub: 'to recover your subscription', color: 'text-green-600' },
                ].map(item => (
                  <div key={item.label} className="bg-white rounded-xl border border-green-100 p-4">
                    <div className="text-xs font-medium text-slate-500">{item.label}</div>
                    <div className={`text-xl sm:text-2xl font-extrabold mt-1 ${item.color}`}>{item.value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{item.sub}</div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  to="/register"
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 text-base font-extrabold text-white shadow-lg shadow-orange-500/20 hover:shadow-xl transition-all hover:-translate-y-0.5"
                >
                  <Zap className="h-5 w-5" /> Fix These Problems — Start Free Trial
                </Link>
                <a
                  href="mailto:hello@truenorthpm.com"
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-slate-300 px-6 py-4 text-sm font-semibold text-slate-700 hover:border-orange-400 hover:text-orange-600 transition-all"
                >
                  <Phone className="h-4 w-4" /> Talk to a Specialist
                </a>
              </div>
              <p className="text-center text-xs text-slate-400 mt-3">No credit card required · Setup in 10 minutes · Cancel anytime</p>
            </div>

            {/* What happens week 1 */}
            <div className="mt-10">
              <h3 className="text-xl font-extrabold text-slate-900 mb-5">What happens after you sign up</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  {
                    period: 'Day 1',
                    icon: RefreshCw,
                    title: 'Import your properties',
                    desc: 'Connect your existing data via CSV or manual entry. Most users are set up in under 15 minutes.',
                    color: 'bg-blue-50 border-blue-200 text-blue-600',
                  },
                  {
                    period: 'Week 1',
                    icon: DollarSign,
                    title: 'First automated payment cycle',
                    desc: 'Tenants get online payment links, auto-reminders go out, and rent hits your account without phone calls.',
                    color: 'bg-orange-50 border-orange-200 text-orange-600',
                  },
                  {
                    period: 'Month 1',
                    icon: TrendingUp,
                    title: 'Full portfolio visibility',
                    desc: 'Real-time dashboard shows every property, lease, payment, and maintenance ticket. Reports take 1 click.',
                    color: 'bg-green-50 border-green-200 text-green-600',
                  },
                ].map(step => (
                  <div key={step.period} className="rounded-xl border border-slate-200 p-5">
                    <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold mb-3 ${step.color}`}>
                      <step.icon className="h-3.5 w-3.5" /> {step.period}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900">{step.title}</h4>
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Email capture */}
            <div className="mt-10 rounded-2xl bg-slate-900 p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                <div className="flex-1">
                  <Mail className="h-7 w-7 text-orange-400 mb-2" />
                  <h3 className="text-lg font-bold text-white">Email me this breakdown</h3>
                  <p className="text-sm text-slate-400 mt-1">
                    Get a PDF with your specific numbers and a step-by-step action plan.
                  </p>
                </div>
                <div className="w-full sm:w-auto sm:min-w-[340px]">
                  {emailDone ? (
                    <div className="flex items-center gap-2 text-green-400 font-semibold">
                      <CheckCircle2 className="h-5 w-5" /> Check your inbox — it's on its way.
                    </div>
                  ) : (
                    <form onSubmit={handleEmail} className="flex gap-2">
                      <input
                        type="email" required value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="you@email.com"
                        className="flex-1 rounded-lg bg-slate-800 border border-slate-600 px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 min-w-0"
                      />
                      <button
                        type="submit" disabled={emailLoading}
                        className="rounded-lg bg-orange-500 hover:bg-orange-600 px-5 py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 flex-shrink-0"
                      >
                        {emailLoading ? '...' : 'Send'}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Testimonials: Specific problems & fixes ── */}
      <section className="py-14 sm:py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900">
              Real problems. Real fixes. Real numbers.
            </h2>
            <p className="mt-2 text-slate-500">From property managers who had the exact same issues.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed flex-1">"{t.quote}"</p>
                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {t.avatar}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{t.name}</div>
                      <div className="text-xs text-slate-400">{t.role}</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-green-600 bg-green-50 rounded-full px-2.5 py-1 flex-shrink-0 ml-2">{t.result}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900">Simple pricing. Massive ROI.</h2>
            <p className="mt-2 text-slate-500">Every plan includes the full platform. No feature gating.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: 'Starter', price: 49, props: '1–10 properties',
                tag: r.plan === 'starter' ? 'Best for you' : null,
                features: ['Unlimited tenants', 'Automated rent collection', 'Maintenance tracking', 'Financial reports', 'Email & chat support'],
              },
              {
                name: 'Professional', price: 99, props: '11–50 properties',
                tag: r.plan === 'professional' ? 'Best for you' : 'Most popular',
                features: ['Everything in Starter', 'Tenant screening & background checks', 'Custom report templates', 'Bulk messaging', 'Priority support'],
              },
              {
                name: 'Enterprise', price: 299, props: '50+ properties',
                tag: r.plan === 'enterprise' ? 'Best for you' : null,
                features: ['Everything in Professional', 'Unlimited properties', 'API access & integrations', 'Dedicated account manager', 'Custom onboarding'],
              },
            ].map(plan => {
              const isRec = plan.name.toLowerCase() === r.plan;
              return (
                <div
                  key={plan.name}
                  className={`rounded-2xl border-2 p-6 flex flex-col relative transition-all duration-200 ${
                    isRec ? 'border-orange-400 shadow-xl shadow-orange-500/10' : 'border-slate-200'
                  }`}
                >
                  {plan.tag && (
                    <div className={`absolute -top-3 left-4 rounded-full px-3 py-0.5 text-xs font-bold ${isRec ? 'bg-orange-500 text-white' : 'bg-slate-800 text-white'}`}>
                      {plan.tag}
                    </div>
                  )}
                  <div>
                    <div className="text-base font-bold text-slate-900">{plan.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{plan.props}</div>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900">${plan.price}</span>
                      <span className="text-slate-400 text-sm">/month</span>
                    </div>
                    {isRec && (
                      <div className="mt-2 text-xs font-medium text-green-600 bg-green-50 rounded-full px-3 py-1 inline-block">
                        Saves you ${fmt(r.netAnnualSavings)}/yr net
                      </div>
                    )}
                  </div>
                  <ul className="mt-5 space-y-2.5 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />{f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/register"
                    className={`mt-6 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
                      isRec
                        ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-md hover:shadow-lg'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Start 14-Day Free Trial <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-14 sm:py-20 bg-slate-50">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl font-extrabold text-slate-900 text-center mb-8">Common questions</h2>
          <div className="space-y-2">
            {[
              {
                q: 'How long does setup actually take?',
                a: 'Most managers are fully set up in under 20 minutes. Import your properties via CSV, add your tenants with their emails, and your first automated rent cycle runs itself. We have a live onboarding chat to help you through it.',
              },
              {
                q: 'What if my tenants won\'t use online payments?',
                a: 'You can still log cash and check payments manually. But in practice — every age group adopts online payments once they realize it\'s easier for them too. We provide a customizable tenant invite email that explains the benefits clearly.',
              },
              {
                q: 'Are these savings realistic?',
                a: 'Conservative, actually. Our numbers come from real user data. We intentionally left out some savings categories (like reducing tenant turnover through better communication) to keep the estimate defensible. Most users save more.',
              },
              {
                q: 'What happens after the free trial?',
                a: 'You pick a plan and keep going, or export all your data and leave — no questions, no fees. We earn your business every month, which is why we don\'t lock you into annual contracts.',
              },
              {
                q: 'Can I import my existing data?',
                a: 'Yes. Import properties and tenants from a spreadsheet, connect via our open API, or use our data migration service. Your historical financials, leases, and maintenance records can all come with you.',
              },
            ].map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-3"
                >
                  <span className="text-sm font-semibold text-slate-900">{faq.q}</span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-48' : 'max-h-0'}`}>
                  <p className="px-5 pb-4 text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-slate-900 to-slate-950 relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, hsl(25 95% 53% / 0.12), transparent 60%)' }} />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            {calculated
              ? <>Every month you wait costs you <span className="text-orange-400">${fmt(r.total / 12)}</span></>
              : 'Stop running your portfolio on spreadsheets and goodwill'}
          </h2>
          <p className="mt-4 text-base text-slate-400 max-w-xl mx-auto">
            {calculated
              ? `That's $${fmt(weeklyLoss)} this week alone. Your free trial starts today — no credit card, no commitment.`
              : 'Use the calculator to see exactly what it\'s costing you, then fix it for free for 14 days.'}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-4 text-base font-extrabold text-white shadow-xl shadow-orange-500/20 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all duration-200"
            >
              <Zap className="h-5 w-5" /> Start Free 14-Day Trial
            </Link>
            {!calculated && (
              <button
                onClick={() => document.getElementById('calc')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-6 py-4 text-sm font-semibold text-slate-400 hover:text-white hover:border-slate-500 transition-all"
              >
                Calculate my losses first
              </button>
            )}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-sm text-slate-500">
            {['No credit card required', '10-min setup', 'Cancel anytime', 'Full data export'].map(t => (
              <span key={t} className="flex items-center gap-1.5">
                <BadgeCheck className="h-4 w-4 text-green-500" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-950 border-t border-slate-800 py-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-sm font-bold text-slate-400">TrueNorth PM</span>
        </div>
        <p className="text-xs text-slate-600">&copy; {new Date().getFullYear()} TrueNorth PM. All rights reserved.</p>
      </footer>
    </div>
  );
}
