import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Delete, ChevronLeft, User, ShieldAlert, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/lib/api/client';
import useAuthStore from '@/stores/authStore.secure';

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  profile_picture?: string;
}

const ROLE_COLORS: Record<string, string> = {
  waiter: 'bg-blue-100 text-blue-700',
  chef: 'bg-orange-100 text-orange-700',
  manager: 'bg-purple-100 text-purple-700',
  cleaner: 'bg-green-100 text-green-700',
  housekeeping: 'bg-teal-100 text-teal-700',
};

// Shift code is stored per-day in localStorage by the manager
const SHIFT_KEY = () => `staff:shift_code:${new Date().toISOString().slice(0, 10)}`;
const SESSION_UNLOCKED_KEY = 'staff:shift_unlocked';
const STAFF_CACHE_KEY = 'staff:list_cache';
const STAFF_CACHE_TTL_H = 24; // hours

// ── Offline PIN caching ───────────────────────────────────────────────────────
const PIN_HASH_PREFIX = 'staff:pin_hash:';
const STAFF_USER_PREFIX = 'staff:user:';
const DEVICE_SALT_KEY = 'staff:device_salt';
const PIN_CACHE_TTL_DAYS = 7;

/** Get or create a random per-device salt (prevents cross-device rainbow tables). */
function getDeviceSalt(): string {
  let salt = localStorage.getItem(DEVICE_SALT_KEY);
  if (!salt) {
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    salt = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(DEVICE_SALT_KEY, salt);
  }
  return salt;
}

/**
 * Hash a PIN with PBKDF2-SHA256 (100k iterations) so brute-forcing localStorage
 * is slow even if an attacker gets physical access to the device.
 */
async function hashPin(userId: string, pin: string): Promise<string> {
  const salt = getDeviceSalt();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt + userId), iterations: 100_000, hash: 'SHA-256' },
    key, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Store PIN hash after a successful online login (fire-and-forget). */
async function cachePinHash(userId: string, pin: string): Promise<void> {
  const hash = await hashPin(userId, pin);
  localStorage.setItem(PIN_HASH_PREFIX + userId, JSON.stringify({ hash, cachedAt: new Date().toISOString() }));
}

/** Verify an entered PIN against the cached hash. Returns false if no cache or expired. */
async function verifyOfflinePin(userId: string, pin: string): Promise<boolean> {
  try {
    const raw = localStorage.getItem(PIN_HASH_PREFIX + userId);
    if (!raw) return false;
    const { hash, cachedAt } = JSON.parse(raw);
    const ageDays = (Date.now() - new Date(cachedAt).getTime()) / 86_400_000;
    if (ageDays > PIN_CACHE_TTL_DAYS) return false;
    return (await hashPin(userId, pin)) === hash;
  } catch { return false; }
}

/** Cache the full user object after a successful online PIN login. */
function cacheStaffUser(userId: string, user: any): void {
  try {
    localStorage.setItem(STAFF_USER_PREFIX + userId, JSON.stringify({ user, cachedAt: new Date().toISOString() }));
    // Also write the shared offline-auth-backup so email/PIN session both survive logout
    localStorage.setItem('offline-auth-backup', JSON.stringify({
      id: user.id, email: user.email || '', full_name: user.full_name || '',
      role: user.role, savedAt: new Date().toISOString(),
    }));
  } catch { /* storage full — non-fatal */ }
}

/** Retrieve the cached user object for a staff member (up to 7 days old). */
function getCachedStaffUser(userId: string): any | null {
  try {
    const raw = localStorage.getItem(STAFF_USER_PREFIX + userId);
    if (!raw) return null;
    const { user, cachedAt } = JSON.parse(raw);
    const ageDays = (Date.now() - new Date(cachedAt).getTime()) / 86_400_000;
    return ageDays <= PIN_CACHE_TTL_DAYS ? user : null;
  } catch { return null; }
}

/** True if this device has a cached PIN hash for the given user. */
function hasCachedPin(userId: string): boolean {
  return !!localStorage.getItem(PIN_HASH_PREFIX + userId);
}

function getCachedStaff(): StaffMember[] | null {
  try {
    const raw = localStorage.getItem(STAFF_CACHE_KEY);
    if (!raw) return null;
    const { staff, cachedAt } = JSON.parse(raw);
    const ageH = (Date.now() - new Date(cachedAt).getTime()) / 3_600_000;
    return ageH < STAFF_CACHE_TTL_H ? staff : null;
  } catch { return null; }
}

function cacheStaff(staff: StaffMember[]) {
  try {
    localStorage.setItem(STAFF_CACHE_KEY, JSON.stringify({ staff, cachedAt: new Date().toISOString() }));
  } catch { /* storage full — ignore */ }
}

export default function StaffPinLogin() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selected, setSelected] = useState<StaffMember | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(true);

  // Shift code gate
  const [shiftUnlocked, setShiftUnlocked] = useState(() =>
    sessionStorage.getItem(SESSION_UNLOCKED_KEY) === 'true'
  );
  const [shiftInput, setShiftInput] = useState('');
  const [shiftError, setShiftError] = useState('');

  // Check if a shift code has been set for today
  const todayShiftCode = localStorage.getItem(SHIFT_KEY());
  const shiftCodeRequired = !!todayShiftCode;

  useEffect(() => {
    if (!shiftCodeRequired || shiftUnlocked) {
      api
        .get<{ staff: StaffMember[] }>('/auth/staff-list')
        .then((r) => {
          const list: StaffMember[] = (r.data as any)?.staff ?? r.data;
          setStaff(list);
          cacheStaff(list); // persist for offline use
        })
        .catch(() => {
          // Offline fallback — use cached staff list if available
          const cached = getCachedStaff();
          if (cached && cached.length > 0) {
            setStaff(cached);
            toast('Offline — showing cached staff list', { icon: '📶' });
          } else {
            toast.error('Could not load staff list. Connect to internet first.');
          }
        })
        .finally(() => setLoadingStaff(false));
    } else {
      setLoadingStaff(false);
    }
  }, [shiftUnlocked, shiftCodeRequired]);

  const handleShiftCodeSubmit = () => {
    if (!shiftInput.trim()) return;
    if (shiftInput.trim() === todayShiftCode) {
      sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
      setShiftUnlocked(true);
      setShiftError('');
      setLoadingStaff(true);
      api
        .get<{ staff: StaffMember[] }>('/auth/staff-list')
        .then((r) => {
          const list: StaffMember[] = (r.data as any)?.staff ?? r.data;
          setStaff(list);
          cacheStaff(list);
        })
        .catch(() => {
          const cached = getCachedStaff();
          if (cached && cached.length > 0) {
            setStaff(cached);
            toast('Offline — showing cached staff list', { icon: '📶' });
          } else {
            toast.error('Could not load staff list');
          }
        })
        .finally(() => setLoadingStaff(false));
    } else {
      setShiftError('Incorrect shift code. Please check with your manager.');
      setShiftInput('');
    }
  };

  const handleDigit = (d: string) => {
    if (pin.length < 6) setPin((p) => p + d);
  };

  const handleDelete = () => setPin((p) => p.slice(0, -1));

  const handleSubmit = async () => {
    if (!selected) return;
    if (pin.length < 4) {
      toast.error('PIN must be at least 4 digits');
      return;
    }
    setLoading(true);
    try {
      const resp = await api.post<any>('/auth/pin-login', {
        user_id: selected.id,
        pin,
      });
      const data = resp.data as any;
      const user = data?.user;
      const accessToken = data?.access_token;
      const refreshToken = data?.refresh_token;

      if (user) {
        // Cache PIN hash + user object so this staff member can log in offline later
        cachePinHash(selected.id, pin).catch(() => {}); // fire-and-forget (PBKDF2 is async)
        cacheStaffUser(selected.id, user);

        useAuthStore.setState({
          user,
          role: user.role,
          isAuthenticated: true,
          token: accessToken,
          refreshToken,
          lastAuthenticatedAt: new Date().toISOString(),
        });
        toast.success(`Welcome, ${user.full_name}!`);
        redirectByRole(user.role);
      } else {
        toast.error('Invalid PIN. Please try again.');
        setPin('');
      }
    } catch (err: any) {
      const isNetworkError =
        !err?.response &&
        (!navigator.onLine ||
          err?.code === 'ERR_NETWORK' ||
          err?.code === 'ERR_NAME_NOT_RESOLVED' ||
          err?.message === 'Network Error');

      if (isNetworkError) {
        // ── Offline PIN verification ─────────────────────────────────────────
        const valid = await verifyOfflinePin(selected.id, pin);
        if (valid) {
          const cachedUser = getCachedStaffUser(selected.id);
          if (cachedUser) {
            useAuthStore.setState({
              user: cachedUser,
              role: cachedUser.role,
              isAuthenticated: true,
              token: null,
              refreshToken: null,
              lastAuthenticatedAt: new Date().toISOString(),
              isOfflineSession: true,
            });
            toast.success(`Welcome, ${cachedUser.full_name}! (Offline mode)`);
            redirectByRole(cachedUser.role);
            return;
          }
          toast.error('Offline PIN matched but user data not found. Please log in online once to set up offline access.');
        } else if (hasCachedPin(selected.id)) {
          toast.error('Incorrect PIN.');
        } else {
          toast.error('No offline PIN set up for this device yet. Please log in online once to enable offline access.', { duration: 6000 });
        }
        setPin('');
      } else {
        const msg = err?.response?.data?.detail || 'Invalid PIN';
        toast.error(msg);
        setPin('');
      }
    } finally {
      setLoading(false);
    }
  };

  const redirectByRole = (role: string) => {
    switch (role) {
      case 'admin': navigate('/admin'); break;
      case 'manager': navigate('/manager'); break;
      case 'chef': navigate('/chef'); break;
      case 'waiter': navigate('/waiter'); break;
      case 'cleaner':
      case 'housekeeping': navigate('/cleaner'); break;
      default: navigate('/menu'); break;
    }
  };

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (pin.length === 6 && selected && !loading) {
      handleSubmit();
    }
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  // Physical keyboard support for PIN entry
  useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent) => {
      if (loading) return;
      if (e.key >= '0' && e.key <= '9') {
        setPin(p => p.length < 6 ? p + e.key : p);
      } else if (e.key === 'Backspace') {
        setPin(p => p.slice(0, -1));
      } else if (e.key === 'Enter' && pin.length >= 4) {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, pin, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // — Shift code gate —
  if (shiftCodeRequired && !shiftUnlocked) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <Lock className="h-6 w-6 text-amber-600" />
          </div>
          <p className="text-sm font-medium">Enter Today's Shift Code</p>
          <p className="text-xs text-muted-foreground text-center">
            Ask your manager for the shift code to access staff login.
          </p>
        </div>
        <Input
          type="password"
          placeholder="Shift code"
          value={shiftInput}
          onChange={(e) => setShiftInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleShiftCodeSubmit()}
          autoFocus
        />
        {shiftError && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <ShieldAlert className="h-3 w-3" /> {shiftError}
          </p>
        )}
        <Button className="w-full" onClick={handleShiftCodeSubmit} disabled={!shiftInput.trim()}>
          Continue
        </Button>
      </div>
    );
  }

  if (loadingStaff) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
        Loading staff…
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
        <User className="h-8 w-8" />
        <p>No staff accounts found.</p>
      </div>
    );
  }

  // — Staff picker —
  if (!selected) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground text-center">Select your name to continue</p>
        <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
          {staff.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary hover:bg-muted/50 transition-colors text-left"
            >
              {s.profile_picture ? (
                <img src={s.profile_picture} alt={s.full_name} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground">
                  {s.full_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-center">
                <p className="text-sm font-medium leading-tight">{s.full_name}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full capitalize ${ROLE_COLORS[s.role] ?? 'bg-gray-100 text-gray-600'}`}>
                  {s.role}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // — PIN pad —
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => { setSelected(null); setPin(''); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          {selected.profile_picture ? (
            <img src={selected.profile_picture} alt={selected.full_name} className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
              {selected.full_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-medium">{selected.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{selected.role}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center gap-3 py-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`h-3 w-3 rounded-full border-2 transition-colors ${i < pin.length ? 'bg-primary border-primary' : 'border-muted-foreground/40'}`} />
        ))}
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Enter your {pin.length > 0 ? `${pin.length}/6` : '4–6 digit'} PIN
      </p>

      <div className="grid grid-cols-3 gap-2">
        {['1','2','3','4','5','6','7','8','9'].map((d) => (
          <button key={d} onClick={() => handleDigit(d)} disabled={loading}
            className="h-14 rounded-xl border border-border text-xl font-medium hover:bg-muted active:scale-95 transition-all disabled:opacity-50">
            {d}
          </button>
        ))}
        <div />
        <button onClick={() => handleDigit('0')} disabled={loading}
          className="h-14 rounded-xl border border-border text-xl font-medium hover:bg-muted active:scale-95 transition-all disabled:opacity-50">
          0
        </button>
        <button onClick={handleDelete} disabled={loading || pin.length === 0}
          className="h-14 rounded-xl border border-border flex items-center justify-center hover:bg-muted active:scale-95 transition-all disabled:opacity-50">
          <Delete className="h-5 w-5" />
        </button>
      </div>

      <Button className="w-full" onClick={handleSubmit} disabled={loading || pin.length < 4}>
        {loading ? 'Signing in…' : 'Sign In'}
      </Button>
    </div>
  );
}
