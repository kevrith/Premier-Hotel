import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import useAuthStore from '@/stores/authStore.secure';
import { GoogleLogin } from '@react-oauth/google';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Hotel, Lock, Mail, AlertCircle, Loader2, Phone, Eye, EyeOff, WifiOff, MapPin, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useOffline } from '@/contexts/OfflineContext';
import OTPVerification from '@/components/Auth/OTPVerification';
import StaffPinLogin from '@/components/Auth/StaffPinLogin';
import { useGeoGate } from '@/hooks/useGeoGate';

// Password validation constants
const MIN_PASSWORD_LENGTH = 6;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading: contextLoading } = useAuth();
  const { login, needsVerification, verificationType, user, isLoading: storeLoading } = useAuthStore();
  // Use store's isLoading so the button disables as soon as the login API call starts
  const isLoading = storeLoading || contextLoading;
  const [submitting, setSubmitting] = useState(false);
  const { isOnline: offlineStoreOnline } = useOffline();

  // navigator.onLine lies on desktop (returns true even when DNS fails).
  // Use offlineStore as primary signal; also treat ERR_NAME_NOT_RESOLVED as offline.
  const [reallyOnline, setReallyOnline] = useState(offlineStoreOnline && navigator.onLine);

  useEffect(() => {
    setReallyOnline(offlineStoreOnline && navigator.onLine);
  }, [offlineStoreOnline]);

  const isOnline = reallyOnline;

  const [loginType, setLoginType] = useState<'email' | 'phone' | 'pin'>('email');
  const [cachedUser, setCachedUser] = useState<any>(null);
  const { status: geoStatus, distance: geoDistance } = useGeoGate();
  // Allow PIN tab when: confirmed in range, geo disabled, OR location simply unavailable
  // (e.g. Google location API rate-limited 429, no GPS on desktop).
  // Only block when explicitly out_of_range or permission denied.
  const staffPinAllowed = geoStatus === 'allowed' || geoStatus === 'disabled' || geoStatus === 'unavailable';

  // If user was on Staff PIN tab but moves out of range, kick them back to email
  useEffect(() => {
    if (!staffPinAllowed && loginType === 'pin') {
      setLoginType('email');
    }
  }, [staffPinAllowed]); // eslint-disable-line react-hooks/exhaustive-deps
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

  // Recompute cached user on mount and whenever online status changes
  useEffect(() => {
    const cached = getCachedUserDirect();
    setCachedUser(!isOnline ? cached : null);

    // Auto-redirect when offline but valid session exists
    if (!isOnline && cached) {
      useAuthStore.setState({ user: cached, role: cached.role, isAuthenticated: true, isOfflineSession: true });
      redirectByRole(cached.role);
    }
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  // Also check on mount regardless of isOnline — handles desktop where
  // navigator.onLine stays true but network is actually down
  useEffect(() => {
    const cached = getCachedUserDirect();
    if (!cached) return;
    // Probe real connectivity with a tiny HEAD request
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const apiBase = (import.meta as any).env.VITE_API_BASE_URL || '';
    const healthUrl = apiBase.replace('/api/v1', '') + '/health';
    fetch(healthUrl, {
      method: 'HEAD', signal: controller.signal, cache: 'no-store'
    }).then(r => {
      // Any HTTP response means server is reachable — we are online
      clearTimeout(timer);
    }).catch(() => {
      // Network is actually down — go offline mode
      clearTimeout(timer);
      setReallyOnline(false);
      setCachedUser(cached);
      useAuthStore.setState({ user: cached, role: cached.role, isAuthenticated: true, isOfflineSession: true });
      redirectByRole(cached.role);
    }).finally(() => clearTimeout(timer));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const redirectByRole = (role: string) => {
    switch (role) {
      case 'admin': navigate('/admin'); break;
      case 'manager': navigate('/manager'); break;
      case 'chef': navigate('/chef'); break;
      case 'waiter': navigate('/waiter'); break;
      case 'owner': navigate('/owner'); break;
      case 'cleaner':
      case 'housekeeping': navigate('/cleaner'); break;
      default: navigate('/menu'); break;
    }
  };

  const getCachedUserDirect = () => {
    // 1. Primary: Zustand auth-storage (has lastAuthenticatedAt, cleared on logout)
    try {
      const stored = localStorage.getItem('auth-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        const cachedUser = parsed?.state?.user;
        const lastAuth = parsed?.state?.lastAuthenticatedAt;
        if (cachedUser && lastAuth) {
          const hoursSince = (Date.now() - new Date(lastAuth).getTime()) / (1000 * 60 * 60);
          if (hoursSince <= 168) return cachedUser; // within 7 days
        }
      }
    } catch { /* fall through */ }

    // 2. Fallback: offline-auth-backup — written on login, NOT cleared on logout
    //    Covers the case where user was logged out (session expired / manual logout)
    //    but needs to access the system offline on their own device.
    try {
      const backup = localStorage.getItem('offline-auth-backup');
      if (backup) {
        const parsed = JSON.parse(backup);
        if (parsed?.role && parsed?.savedAt) {
          const hoursSince = (Date.now() - new Date(parsed.savedAt).getTime()) / (1000 * 60 * 60);
          if (hoursSince <= 168) return parsed; // within 7 days
        }
      }
    } catch { /* ignore */ }

    return null;
  };

  // Check for cached session for offline login (alias of getCachedUserDirect)
  const getCachedUser = getCachedUserDirect;

  const canContinueOffline = !isOnline && cachedUser !== null;

  const handleContinueOffline = () => {
    if (!cachedUser) return;
    useAuthStore.setState({ user: cachedUser, role: cachedUser.role, isAuthenticated: true, isOfflineSession: true });
    toast.success('Continuing in offline mode with limited features');
    redirectByRole(cachedUser.role);
  };

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
    if (submitting || isLoading) return; // prevent double-submit
    setSubmitting(true);

    try {
      // Block network login when offline — show cached session option instead
      if (!isOnline) {
        if (cachedUser) {
          toast('You are offline. Use the "Continue Offline" button below.', { icon: '📶' });
        } else {
          toast.error('No internet connection. Please connect to login.');
        }
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

      const result = await login(identifier, password, loginType as 'email' | 'phone');

      if (result.success) {
        if (result.needsVerification) {
          setShowOTPVerification(true);
          toast.success('Please verify your account to continue');
          return;
        }
        toast.success('Login successful!');
        const userRole = result.user?.role;
        if (from !== '/') {
          navigate(from, { replace: true });
        } else {
          redirectByRole(userRole);
        }
      } else if ((result as any).isNetworkError) {
        // Network failed — fall back to cached session
        const cached = getCachedUserDirect();
        if (cached) {
          useAuthStore.setState({ user: cached, role: cached.role, isAuthenticated: true, isOfflineSession: true });
          toast('No internet connection. Continuing with your last session offline.', { icon: '📶', duration: 5000 });
          redirectByRole(cached.role);
        } else {
          toast.error('No internet connection and no cached session found. Please connect to log in.');
        }
      } else {
        toast.error(result.error || 'Login failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
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

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (!credentialResponse.credential) {
      toast.error('Google login failed: no credential received');
      return;
    }
    try {
      const result = await useAuthStore.getState().socialLogin('google', credentialResponse.credential);
      if (result.success) {
        toast.success('Google login successful!');
        const userRole = result.user?.role;
        switch (userRole) {
          case 'admin': navigate('/admin'); break;
          case 'manager': navigate('/manager'); break;
          case 'chef': navigate('/chef'); break;
          case 'waiter': navigate('/waiter'); break;
          case 'cleaner': navigate('/cleaner'); break;
          default: navigate('/menu'); break;
        }
      } else {
        toast.error(result.error || 'Google login failed');
      }
    } catch (error: any) {
      toast.error('Google login failed. Please try again.');
      console.error('Google login error:', error);
    }
  };


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
      case 'housekeeping':
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
            <div className="mb-4 p-3 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  {canContinueOffline
                    ? 'You are currently offline. You can continue with limited features using your previously saved session.'
                    : 'You are currently offline. Please connect to the internet to login.'}
                </div>
              </div>
              {canContinueOffline && (
                <Button
                  type="button"
                  onClick={handleContinueOffline}
                  className="w-full mt-3 bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <WifiOff className="mr-2 h-4 w-4" />
                  Continue Offline as {cachedUser?.full_name}
                </Button>
              )}
            </div>
          )}

          <Tabs
            value={loginType}
            onValueChange={(value) => setLoginType(value as 'email' | 'phone' | 'pin')}
            className="w-full"
          >
            <TabsList className={`grid w-full mb-4 ${staffPinAllowed ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
              {staffPinAllowed && <TabsTrigger value="pin">Staff PIN</TabsTrigger>}
            </TabsList>

            {/* Geo status banner — only show while checking or when out of range */}
            {geoStatus === 'checking' && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 px-1">
                <Loader className="h-3 w-3 animate-spin" />
                Checking location for Staff PIN access…
              </div>
            )}
            {geoStatus === 'out_of_range' && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 px-1 p-2 rounded-md bg-muted/50">
                <MapPin className="h-3 w-3 shrink-0" />
                Staff PIN login is only available on hotel premises
                {geoDistance != null && ` (${geoDistance} m away)`}.
              </div>
            )}
            {geoStatus === 'denied' && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 px-1 p-2 rounded-md bg-muted/50">
                <MapPin className="h-3 w-3 shrink-0" />
                Location access denied — Staff PIN login unavailable.
              </div>
            )}

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
                  disabled={isLoading}
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
                  disabled={isLoading}
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

            {/* Staff PIN Tab */}
            <TabsContent value="pin">
              <StaffPinLogin />
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

            <div className="mt-4 space-y-2">
              {/* Google Login — uses ID token flow, no redirect_uri required */}
              {isOnline && (
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => toast.error('Google login was cancelled or failed')}
                    theme="outline"
                    size="large"
                    text="continue_with"
                    shape="rectangular"
                    width="320"
                  />
                </div>
              )}

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
