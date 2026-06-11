/**
 * ForgotPassword
 *
 * Public password-reset request page for the AIfacilitator application.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, MailCheck } from 'lucide-react';
import PageHead from '@/components/PageHead';
import { validateEmailAddress, sanitizeInput } from '@/utils/inputValidation';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSentResetLink, setHasSentResetLink] = useState(false);
  const { resetPassword, isAuthenticated, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedEmail = sanitizeInput(email).toLowerCase();
    if (!validateEmailAddress(trimmedEmail).isValid) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(trimmedEmail);
      setHasSentResetLink(true);
      toast({
        title: 'Check your email',
        description: 'If an account exists for that address, a reset link has been sent.',
      });
    } catch (error: unknown) {
      console.error('Password reset request failed:', error);
      toast({
        title: 'Reset request could not be completed',
        description: 'Please try again in a few minutes or contact support if the problem continues.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasExistingSession = typeof window !== 'undefined' && !!localStorage.getItem('mf_session');
  if (loading && hasExistingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 bg-indigo-600/10">
      <PageHead title="Forgot Password" description="Request a secure password reset link for your AIfacilitator account" />
      <div className="max-w-md mx-auto px-4 pt-24">
        <div className="bg-white rounded-3xl shadow-lg p-8">
          {hasSentResetLink ? (
            <div className="text-center space-y-5" role="status">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-700">
                <MailCheck className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-2">Check your email</h1>
                <p className="text-sm text-gray-600">
                  If an AIfacilitator account exists for <span className="font-medium text-gray-900">{sanitizeInput(email).toLowerCase()}</span>, we sent a secure link to reset your password.
                </p>
              </div>
              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link to="/login">Back to login</Link>
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => setHasSentResetLink(false)}>
                  Use a different email
                </Button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-center mb-2">Reset your password</h1>
              <p className="text-center text-gray-500 text-sm mb-6">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <Label htmlFor="reset-email" className="block text-sm font-medium mb-2 text-left">
                    Email
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    autoFocus
                    disabled={isSubmitting}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting || !email.trim()}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending reset link...
                    </>
                  ) : (
                    'Send reset link'
                  )}
                </Button>
              </form>
              <p className="text-center mt-4 text-sm text-gray-600">
                Remembered your password?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Log in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
