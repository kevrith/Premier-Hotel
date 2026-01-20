import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Hotel, Mail, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useOffline } from '@/contexts/OfflineContext';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const { forgotPassword, isLoading } = useAuthStore();
  const { isOnline } = useOffline();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateEmail = () => {
    if (!email) {
      setError('Email is required');
      return false;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail()) {
      return;
    }

    if (!isOnline) {
      toast.error('You must be online to reset your password');
      return;
    }

    const result = await forgotPassword(email);

    if (result.success) {
      setSuccess(true);
      toast.success('Password reset email sent!');
    } else {
      toast.error(result.error || 'Failed to send reset email. Please try again.');
      setError(result.error || 'Failed to send reset email');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) {
      setError('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gold-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-gradient-gold">
              <Hotel className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
          <CardDescription>
            {success
              ? 'Check your email for reset instructions'
              : 'Enter your email address and we\'ll send you a password reset link'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!isOnline && (
            <div className="mb-4 p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                You are currently offline. Please connect to the internet to reset your password.
              </div>
            </div>
          )}

          {success ? (
            <div className="space-y-4">
              {/* Success Message */}
              <div className="p-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Password reset email sent!
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      We've sent a password reset link to <span className="font-semibold">{email}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-2">Next steps:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Check your email inbox for the reset link</li>
                      <li>Click the link in the email (it's valid for 1 hour)</li>
                      <li>Enter your new password</li>
                      <li>Sign in with your new password</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Didn't receive email */}
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">Didn't receive the email?</p>
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSuccess(false)}
                    className="w-full"
                  >
                    Try a different email
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full text-sm"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Resending...
                      </>
                    ) : (
                      'Resend reset email'
                    )}
                  </Button>
                </div>
              </div>

              {/* Back to Login */}
              <Button
                type="button"
                variant="default"
                onClick={() => navigate('/login')}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={handleChange}
                    className={`pl-10 ${error ? 'border-red-500' : ''}`}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-1 text-red-500 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                disabled={isLoading || !isOnline}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Reset Link
                  </>
                )}
              </Button>

              {/* Additional Info */}
              <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">Security Note</p>
                    <p>The reset link will be valid for 1 hour. For security, you'll need to request a new link if it expires.</p>
                  </div>
                </div>
              </div>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          {!success && (
            <>
              <div className="text-sm text-center text-muted-foreground">
                Remember your password?{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </div>
              <div className="text-sm text-center">
                <Link to="/" className="text-muted-foreground hover:text-primary">
                  ← Back to home
                </Link>
              </div>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
