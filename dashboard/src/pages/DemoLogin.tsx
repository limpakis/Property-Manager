import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const DEMO_CREDENTIALS = [
  {
    email: 'demo@truenorthpm.com',
    password: 'DemoAccess@2026',
  },
  {
    email: 'admin@truenorthpm.com',
    password: 'admin123',
  },
];

export default function DemoLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login, logout, register } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const runDemoLogin = async () => {
      try {
        logout();
        let lastError: unknown = null;

        for (const credentials of DEMO_CREDENTIALS) {
          try {
            await login(credentials.email, credentials.password);
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
          }
        }

        if (lastError) {
          try {
            await register({
              email: DEMO_CREDENTIALS[0].email,
              password: DEMO_CREDENTIALS[0].password,
              full_name: 'Demo User',
              company_name: 'TrueNorth PM Demo',
            });
            lastError = null;
          } catch (registerError: any) {
            const registrationFailedBecauseExists =
              typeof registerError?.message === 'string' &&
              registerError.message.toLowerCase().includes('already exists');

            if (registrationFailedBecauseExists) {
              await login(DEMO_CREDENTIALS[0].email, DEMO_CREDENTIALS[0].password);
              lastError = null;
            } else {
              throw registerError;
            }
          }
        }

        if (lastError) {
          throw lastError;
        }

        if (!cancelled) {
          toast({
            title: 'Demo ready',
            description: 'You are now exploring the live demo workspace.',
          });
          navigate('/', { replace: true });
        }
      } catch (error: any) {
        if (!cancelled) {
          toast({
            title: 'Demo unavailable',
            description: error?.message || 'Unable to open the demo account right now.',
            variant: 'destructive',
          });
          navigate('/login', { replace: true });
        }
      }
    };

    runDemoLogin();

    return () => {
      cancelled = true;
    };
  }, [login, logout, navigate, register, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="mx-auto gradient-primary shadow-glow-primary flex h-14 w-14 items-center justify-center rounded-2xl text-white">
          <Building2 className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-display tracking-tight">Opening live demo…</h1>
          <p className="text-sm text-muted-foreground">
            Signing you into the public portfolio so you can explore the product instantly.
          </p>
        </div>
        <div className="flex justify-center">
          <span className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
}
