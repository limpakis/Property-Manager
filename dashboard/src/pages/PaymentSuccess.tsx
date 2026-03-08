import { CheckCircle, ArrowLeft, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Here you could fetch payment details using the session_id
    // and display them to the user
    console.log('Payment session:', sessionId);
  }, [sessionId]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Payment Successful!</CardTitle>
          <CardDescription>
            Your payment has been processed successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm">
            <p className="text-muted-foreground mb-2">
              A confirmation email has been sent to your registered email address.
              You can view your payment history in your account dashboard.
            </p>
            {sessionId && (
              <p className="text-xs text-muted-foreground font-mono mt-2">
                Session ID: {sessionId}
              </p>
            )}
          </div>
          
          <div className="flex flex-col gap-2">
            <Button onClick={() => navigate('/payments')} className="w-full">
              <Receipt className="mr-2 h-4 w-4" />
              View Payment History
            </Button>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
