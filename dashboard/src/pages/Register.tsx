import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Mail, Lock, User, Briefcase, ArrowRight, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const trialFeatures = [
  'Up to 10 properties managed',
  'Tenant & payment tracking',
  'Maintenance request logging',
  'Revenue & expense reports',
  'No credit card required',
];

const testimonials = [
  { name: 'Sarah K.', role: 'Landlord, 8 properties', text: 'Saved me 12 hours a week on admin work.' },
  { name: 'Marcus T.', role: 'Property Manager, 45 units', text: 'Rent collection went from 67% on-time to 94%.' },
];

export default function Register() {
  const [formData, setFormData] = useState({
    company_name: '',
    full_name: '',
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await register(formData);
      toast({ title: 'Welcome!', description: 'Your 14-day free trial has started.' });
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Registration Failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - social proof */}
      <div className="hidden lg:flex lg:w-5/12 gradient-primary relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute bottom-0 -left-16 w-64 h-64 rounded-full bg-white/5" />
        </div>

        <div className="relative z-10">
          <div className="mb-12">
            <img src="/branding/logo-horizontal.svg" alt="TrueNorth PM" className="h-10 w-auto" />
          </div>

          <div>
            <h2 className="text-3xl font-bold text-white leading-tight">
              Start managing smarter today
            </h2>
            <p className="text-white/70 mt-3 text-base leading-relaxed">
              Join thousands of property managers who save hours every week.
            </p>
          </div>

          <div className="mt-8 space-y-3">
            {trialFeatures.map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="bg-white/25 rounded-full p-0.5 shrink-0">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
                <p className="text-white/85 text-sm">{f}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="relative z-10 space-y-3">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex gap-0.5 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-3 w-3 text-yellow-300 fill-yellow-300" />
                ))}
              </div>
              <p className="text-white/90 text-sm italic">"{t.text}"</p>
              <p className="text-white/60 text-xs mt-1.5 font-medium">{t.name} · {t.role}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-7 animate-fade-in">
          <div className="flex lg:hidden flex-col items-center mb-6">
            <div className="gradient-primary shadow-glow-primary flex h-12 w-12 items-center justify-center rounded-xl mb-3 overflow-hidden p-1.5">
              <img src="/branding/logo-icon.svg" alt="TrueNorth PM" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-xl font-bold font-display">TrueNorth PM</h1>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-semibold mb-3 border border-success/20">
              <Check className="h-3 w-3" />
              14-day free trial · No credit card needed
            </div>
            <h2 className="text-2xl font-bold font-display tracking-tight">Create your account</h2>
            <p className="text-muted-foreground text-sm mt-1">Set up your workspace in under 30 seconds</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="company_name" className="text-sm font-medium">Company Name</Label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="company_name"
                    placeholder="Acme Properties"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-sm font-medium">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="full_name"
                    placeholder="John Smith"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="pl-10 h-11"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Work Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 h-11"
                  minLength={8}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 gradient-primary text-white border-0 shadow-glow-primary font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By signing up you agree to our{' '}
              <span className="text-primary cursor-pointer hover:underline">Terms of Service</span>
              {' '}and{' '}
              <span className="text-primary cursor-pointer hover:underline">Privacy Policy</span>
            </p>
          </form>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Sign in →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
