import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import useAuthStore from '@/stores/authStore.secure';
import { useGoogleLogin } from '@react-oauth/google';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Hotel, Lock, Mail, AlertCircle, Loader2, Phone, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useOffline } from '@/contexts/OfflineContext';
import OTPVerification from '@/components/Auth/OTPVerification';

// Password validation constants
const MIN_PASSWORD_LENGTH = 6;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading } = useAuth();
  const { login, needsVerification, verificationType, user } = useAuthStore();
  const { isOnline } = useOffline();

  const [loginType, setLoginType] = useState<'email' | 'phone'>('email');
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [showPhonePassword, setShowPhonePassword] = useState(false);

  const [emailForm, setEmailForm] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

  const [phoneForm, setPhoneForm] = useState({
    phone: '',
    password: '',
    rememberMe: false
  });

  const [errors, setErrors] = useState<any>({});

  const from = location.state?.from?.pathname || '/';

  const validateEmailForm = () => {
    const newErrors: any = {};

    if (!emailForm.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(emailForm.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!emailForm.password) {
      newErrors.password = 'Password is required';
    } else if (emailForm.password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePhoneForm = () => {
    const newErrors: any = {};

    if (!phoneForm.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^(\+?254|0)?[17]\d{8}$/.test(phoneForm.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid Kenyan phone number';
    }

    if (!phoneForm.password) {
      newErrors.password = 'Password is required';
    } else if (phoneForm.password.length < MIN_PASSWORD_LENGTH) {
      newErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatPhoneNumber = (phone: string) => {
    // Convert to international format +254...
    let formatted = phone.replace(/\s/g, '');

    if (formatted.startsWith('0')) {
      formatted = '+254' + formatted.substring(1);
    } else if (formatted.startsWith('254')) {
      formatted = '+' + formatted;
    } else if (!formatted.startsWith('+')) {
      formatted = '+254' + formatted;
    }

    return formatted;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isOnline) {
      toast.error('You must be online to login');
      return;
    }

    // Validate based on login type
    if (loginType === 'email') {
      if (!validateEmailForm()) return;
    } else {
      if (!validatePhoneForm()) return;
    }

    // Get credentials based on type
    const identifier = loginType === 'email'
      ? emailForm.email
      : formatPhoneNumber(phoneForm.phone);

    const password = loginType === 'email'
      ? emailForm.password
      : phoneForm.password;

    const result = await login(identifier, password, loginType);

    if (result.success) {
      // Check if needs verification
      if (result.needsVerification) {
        setShowOTPVerification(true);
        toast.success('Please verify your account to continue');
        return;
      }

      toast.success('Login successful!');

      // Redirect based on role
      const userRole = result.user?.role;

      if (from !== '/') {
        navigate(from, { replace: true });
      } else {
        switch (userRole) {
          case 'admin':
            navigate('/admin');
            break;
          case 'manager':
            navigate('/manager');
            break;
          case 'chef':
            navigate('/chef');
            break;
          case 'waiter':
            navigate('/waiter');
            break;
          case 'cleaner':
            navigate('/cleaner');
            break;
          case 'customer':
          default:
            navigate('/menu');
            break;
        }
      }
    } else {
      toast.error(result.error || 'Login failed. Please try again.');
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setEmailForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors((prev: any) => ({ ...prev, [name]: '' }));
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setPhoneForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) {
      setErrors((prev: any) => ({ ...prev, [name]: '' }));
    }
  };

  const handleGuestCheckout = () => {
    navigate('/menu');
  };

  // Google OAuth Login
  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const result = await useAuthStore.getState().socialLogin('google', tokenResponse.access_token);

        if (result.success) {
          toast.success('Google login successful!');

          // Redirect based on role
          const userRole = result.user?.role;
          switch (userRole) {
            case 'admin':
              navigate('/admin');
              break;
            case 'manager':
              navigate('/manager');
              break;
            case 'chef':
              navigate('/chef');
              break;
            case 'waiter':
              navigate('/waiter');
              break;
            case 'cleaner':
              navigate('/cleaner');
              break;
            default:
              navigate('/menu');
              break;
          }
        } else {
          toast.error(result.error || 'Google login failed');
        }
      } catch (error: any) {
        toast.error('Google login failed. Please try again.');
        console.error('Google login error:', error);
      }
    },
    onError: () => {
      toast.error('Google login was cancelled or failed');
    },
  });


  const handleOTPSuccess = () => {
    toast.success('Verification successful!');
    const userRole = user?.role;

    // Redirect based on role
    switch (userRole) {
      case 'admin':
        navigate('/admin');
        break;
      case 'manager':
        navigate('/manager');
        break;
      case 'chef':
        navigate('/chef');
        break;
      case 'waiter':
        navigate('/waiter');
        break;
      case 'cleaner':
        navigate('/cleaner');
        break;
      default:
        navigate('/menu');
        break;
    }
  };

  // Show OTP verification if needed
  if (showOTPVerification && needsVerification && verificationType) {
    return (
      <OTPVerification
        type={verificationType}
        identifier={verificationType === 'email' ? user?.email! : user?.phone!}
        onSuccess={handleOTPSuccess}
        onBack={() => setShowOTPVerification(false)}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-gold-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-gradient-gold">
              <Hotel className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to your Premier Hotel account
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!isOnline && (
            <div className="mb-4 p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                You are currently offline. Please connect to the internet to login.
              </div>
            </div>
          )}

          <Tabs value={loginType} onValueChange={(value) => setLoginType(value as 'email' | 'phone')} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
            </TabsList>

            {/* Email Login Tab */}
            <TabsContent value="email">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      value={emailForm.email}
                      onChange={handleEmailChange}
                      className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email-password"
                      name="password"
                      type={showEmailPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={emailForm.password}
                      onChange={handleEmailChange}
                      className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmailPassword(!showEmailPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showEmailPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="email-remember"
                      name="rememberMe"
                      checked={emailForm.rememberMe}
                      onCheckedChange={(checked) =>
                        setEmailForm((prev) => ({ ...prev, rememberMe: checked as boolean }))
                      }
                    />
                    <Label
                      htmlFor="email-remember"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Remember me
                    </Label>
                  </div>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                  disabled={isLoading || !isOnline}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In with Email'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Phone Login Tab */}
            <TabsContent value="phone">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="0712345678 or 254712345678"
                      value={phoneForm.phone}
                      onChange={handlePhoneChange}
                      className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-red-500">{errors.phone}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Enter your Kenyan phone number
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone-password"
                      name="password"
                      type={showPhonePassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={phoneForm.password}
                      onChange={handlePhoneChange}
                      className={`pl-10 pr-10 ${errors.password ? 'border-red-500' : ''}`}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPhonePassword(!showPhonePassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPhonePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-500">{errors.password}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="phone-remember"
                      name="rememberMe"
                      checked={phoneForm.rememberMe}
                      onCheckedChange={(checked) =>
                        setPhoneForm((prev) => ({ ...prev, rememberMe: checked as boolean }))
                      }
                    />
                    <Label
                      htmlFor="phone-remember"
                      className="text-sm font-normal cursor-pointer"
                    >
                      Remember me
                    </Label>
                  </div>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
                  disabled={isLoading || !isOnline}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In with Phone'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {/* Google Login */}
              <Button
                type="button"
                variant="outline"
                onClick={() => handleGoogleLogin()}
                disabled={!isOnline}
                className="w-full"
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>

              {/* Guest Checkout */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGuestCheckout}
              >
                Guest
              </Button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-center text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </div>
          <div className="text-sm text-center">
            <Link to="/" className="text-muted-foreground hover:text-primary">
              ← Back to home
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
