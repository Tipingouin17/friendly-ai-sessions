/**
 * ResetPassword
 *
 * Handles the password reset flow. The user lands here from the email link
 * which includes a ?token=... query parameter. They enter a new password,
 * which is validated and sent to the backend /auth/v1/reset-password endpoint.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const API_URL: string = (import.meta.env.VITE_API_URL as string) || '';

function PasswordStrengthBar({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'Contains a number', pass: /\d/.test(password) },
    { label: 'Contains uppercase', pass: /[A-Z]/.test(password) },
    { label: 'Contains a symbol', pass: /[^a-zA-Z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-emerald-400'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < score ? colors[score - 1] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${score > 0 ? 'text-gray-600' : 'text-gray-400'}`}>
          {score > 0 ? labels[score - 1] : ''}
        </span>
        <div className="flex gap-3">
          {checks.map(c => (
            <span key={c.label} className={`text-xs flex items-center gap-1 ${c.pass ? 'text-emerald-600' : 'text-gray-400'}`}>
              <CheckCircle2 className={`w-3 h-3 ${c.pass ? 'text-emerald-500' : 'text-gray-300'}`} />
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState('');

  useEffect(() => {
    if (!token) {
      setTokenError('This reset link is invalid or has expired. Please request a new one.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    if (password.length < 8) {
      toast({ title: 'Password must be at least 8 characters', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/v1/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail?.message || data?.message || 'Failed to reset password');
      }
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      toast({ title: 'Reset failed', description: msg, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 flex items-center justify-center p-4">
      {/* Background decorative blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-40" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-100 rounded-full blur-3xl opacity-40" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl shadow-indigo-100/50 border border-white/60 overflow-hidden">
          {/* Header stripe */}
          <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

          <div className="p-8">
            {/* Back link */}
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to login
            </Link>

            {success ? (
              /* Success state */
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Password updated!</h1>
                <p className="text-gray-500 text-sm mb-6">
                  Your password has been successfully reset. Redirecting you to login…
                </p>
                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full animate-[progress_3s_linear_forwards]" style={{ width: '100%', animation: 'shrink 3s linear forwards' }} />
                </div>
                <Button
                  onClick={() => navigate('/login')}
                  className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
                >
                  Go to login
                </Button>
              </div>
            ) : tokenError ? (
              /* Invalid token state */
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Link expired</h1>
                <p className="text-gray-500 text-sm mb-6">{tokenError}</p>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
                >
                  Request a new link
                </Button>
              </div>
            ) : (
              /* Form state */
              <>
                {/* Icon + title */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                    <Lock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Set new password</h1>
                    <p className="text-sm text-gray-500">Choose a strong password for your account</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* New password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                      New password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="pr-10 border-gray-200 focus:border-indigo-400 focus:ring-indigo-400/20 rounded-xl"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <PasswordStrengthBar password={password} />
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm" className="text-sm font-medium text-gray-700">
                      Confirm password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirm"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirm}
                        onChange={e => setConfirm(e.target.value)}
                        placeholder="Repeat new password"
                        className={`pr-10 rounded-xl ${
                          confirm && confirm !== password
                            ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20'
                            : confirm && confirm === password
                            ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-400/20'
                            : 'border-gray-200 focus:border-indigo-400 focus:ring-indigo-400/20'
                        }`}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirm && confirm !== password && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Passwords do not match
                      </p>
                    )}
                    {confirm && confirm === password && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Passwords match
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !password || !confirm || password !== confirm || password.length < 8}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold rounded-xl h-11 shadow-lg shadow-indigo-200/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating password…
                      </span>
                    ) : (
                      'Update password'
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Need help?{' '}
          <Link to="/contact" className="text-indigo-500 hover:text-indigo-600">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
