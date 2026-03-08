import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Building2, Mail, Lock, ArrowRight, CheckCircle, TrendingUp, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const features = [
  { icon: TrendingUp, text: 'Real-time portfolio analytics & cash flow tracking' },
  { icon: Zap, text: 'Automated rent reminders & payment collection' },
  { icon: Shield, text: 'Maintenance tracking with priority alerts' },
  { icon: CheckCircle, text: 'Tax-ready financial reports in one click' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Marketing */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden flex-col justify-between p-12">
        {/* Background decorative circles */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/5" />
          <div className="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 left-1/4 w-64 h-64 rounded-full bg-white/5" />
        </div>

        <div className="relative z-10">
          <div className="mb-16">
            <img src="/branding/logo-horizontal.svg" alt="TrueNorth PM" className="h-10 w-auto" />
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-4xl font-bold text-white leading-tight">
                Manage your properties<br />like a pro
              </h2>
              <p className="text-white/70 mt-4 text-lg leading-relaxed">
                The all-in-one platform for landlords and property managers to grow their portfolio confidently.
              </p>
            </div>

            <div className="space-y-4 mt-8">
              {features.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="bg-white/20 rounded-lg p-1.5 shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-white/85 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats band */}
        <div className="relative z-10 grid grid-cols-3 gap-4">
          {[
            { value: '10,000+', label: 'Properties managed' },
            { value: '$2.4M+', label: 'Rent collected/mo' },
            { value: '98%', label: 'Customer satisfaction' },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
              <p className="text-white text-xl font-bold">{value}</p>
              <p className="text-white/60 text-xs mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Mobile logo */}
          <div className="flex lg:hidden flex-col items-center space-y-2 mb-4">
            <div className="gradient-primary shadow-glow-primary flex h-12 w-12 items-center justify-center rounded-xl overflow-hidden p-1.5">
              <img src="/branding/logo-icon.svg" alt="TrueNorth PM" className="h-full w-full object-contain" />
            </div>
            <h1 className="text-xl font-bold font-display">TrueNorth PM</h1>
          </div>

          <div>
            <h2 className="text-2xl font-bold font-display tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground text-sm mt-1">Sign in to access your property dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-11"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 gradient-primary text-white border-0 shadow-glow-primary font-semibold text-sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Sign In
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-background text-muted-foreground">New to TrueNorth PM?</span>
              </div>
            </div>

            <Button variant="outline" className="w-full h-11 font-medium" asChild>
              <Link to="/register">
                Create a free account
              </Link>
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Or explore our{' '}
              <Link to="/roi-calculator" className="text-primary hover:underline font-medium">
                ROI Calculator
              </Link>
              {' '}to see your potential savings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
