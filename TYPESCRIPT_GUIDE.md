# TypeScript Quick Reference Guide

## Using Types in Your Components

### Importing Types

```typescript
// Import common types
import type {
  User,
  Room,
  Booking,
  MenuItem,
  Order
} from '@/types';

// or import all types
import type * as Types from '@/types';
```

### React Component with Props

```typescript
import React from 'react';
import type { Room } from '@/types';

interface RoomCardProps {
  room: Room;
  onSelect: (roomId: string) => void;
  className?: string;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, onSelect, className }) => {
  return (
    <div className={className} onClick={() => onSelect(room.id)}>
      <h3>{room.number}</h3>
      <p>${room.price_per_night}/night</p>
    </div>
  );
};

export default RoomCard;
```

### useState with Types

```typescript
import { useState } from 'react';
import type { User, Booking } from '@/types';

function MyComponent() {
  // Explicit type annotation
  const [user, setUser] = useState<User | null>(null);

  // Array type
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Type inference (TypeScript figures it out)
  const [count, setCount] = useState(0); // inferred as number
  const [name, setName] = useState(''); // inferred as string
}
```

### API Responses

```typescript
import type { ApiResponse, Room } from '@/types';

async function fetchRooms(): Promise<Room[]> {
  const response = await fetch('/api/rooms');
  const data: ApiResponse<Room[]> = await response.json();

  if (data.success && data.data) {
    return data.data;
  }

  throw new Error(data.error || 'Failed to fetch rooms');
}
```

### Event Handlers

```typescript
import React from 'react';

function MyForm() {
  // Form submit handler
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // ...
  };

  // Input change handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value);
  };

  // Button click handler
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log('Clicked');
  };

  return (
    <form onSubmit={handleSubmit}>
      <input onChange={handleChange} />
      <button onClick={handleClick}>Submit</button>
    </form>
  );
}
```

### Custom Hooks

```typescript
import { useState, useEffect } from 'react';
import type { User } from '@/types';

function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Fetch user
    fetchUser().then(setUser).finally(() => setLoading(false));
  }, []);

  return { user, loading };
}
```

### Zustand Store with Types

```typescript
import { create } from 'zustand';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: (user, token) => set({ user, token, isAuthenticated: true }),
  logout: () => set({ user: null, token: null, isAuthenticated: false }),
}));
```

### Context with Types

```typescript
import React, { createContext, useContext, useState } from 'react';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (user: User) => setUser(user);
  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### Axios with Types

```typescript
import axios from 'axios';
import type { ApiResponse, Room } from '@/types';

const api = axios.create({
  baseURL: '/api/v1',
});

// Typed API call
export async function getRooms(): Promise<Room[]> {
  const response = await api.get<ApiResponse<Room[]>>('/rooms');
  return response.data.data || [];
}

// With error handling
export async function createBooking(data: BookingFormData): Promise<Booking> {
  try {
    const response = await api.post<ApiResponse<Booking>>('/bookings', data);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error);
  } catch (error) {
    console.error('Failed to create booking:', error);
    throw error;
  }
}
```

### Type Utilities

```typescript
// Pick specific properties
type RoomPreview = Pick<Room, 'id' | 'number' | 'type' | 'price_per_night'>;

// Omit properties
type RoomWithoutDates = Omit<Room, 'created_at' | 'updated_at'>;

// Partial (all properties optional)
type PartialRoom = Partial<Room>;

// Required (all properties required)
type RequiredRoom = Required<Room>;

// Make specific properties optional
type RoomFormData = Omit<Room, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};
```

### Union Types

```typescript
// From existing types
type Status = 'pending' | 'confirmed' | 'cancelled';

// Combined types
type Result = { success: true; data: User } | { success: false; error: string };

// Type guards
function isUser(obj: any): obj is User {
  return obj && typeof obj.email === 'string' && typeof obj.role === 'string';
}
```

### Generic Components

```typescript
interface DataTableProps<T> {
  data: T[];
  columns: Array<keyof T>;
  onRowClick: (item: T) => void;
}

function DataTable<T>({ data, columns, onRowClick }: DataTableProps<T>) {
  return (
    <table>
      <tbody>
        {data.map((item, index) => (
          <tr key={index} onClick={() => onRowClick(item)}>
            {columns.map((col) => (
              <td key={String(col)}>{String(item[col])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Usage
<DataTable<Room>
  data={rooms}
  columns={['number', 'type', 'price_per_night']}
  onRowClick={(room) => console.log(room.id)}
/>
```

## Common Patterns

### Loading States

```typescript
interface DataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function useData<T>(fetcher: () => Promise<T>) {
  const [state, setState] = useState<DataState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    fetcher()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => setState({ data: null, loading: false, error: error.message }));
  }, []);

  return state;
}
```

### Form Handling

```typescript
interface LoginForm {
  email: string;
  password: string;
}

function LoginPage() {
  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof LoginForm, string>>>({});

  const handleChange = (field: keyof LoginForm) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate and submit
  };

  return (
    <form onSubmit={handleSubmit}>
      <input value={form.email} onChange={handleChange('email')} />
      {errors.email && <span>{errors.email}</span>}

      <input value={form.password} onChange={handleChange('password')} type="password" />
      {errors.password && <span>{errors.password}</span>}

      <button type="submit">Login</button>
    </form>
  );
}
```

## TypeScript Commands

### Type Checking

```bash
# Check types without emitting files
npx tsc --noEmit

# Check types in strict mode
npx tsc --noEmit --strict

# Watch mode
npx tsc --noEmit --watch
```

### Build

```bash
# Production build with type checking
npm run build

# Development server (with type checking)
npm run dev
```

## Tips

1. **Use Type Inference**: Let TypeScript infer types when obvious
2. **Avoid `any`**: Use `unknown` if you don't know the type
3. **Type Guards**: Use type narrowing for safer code
4. **Strict Mode**: Gradually enable strict mode features
5. **IDE Support**: Use VSCode for best TypeScript experience

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)

## Project-Specific Types

All project types are located in `src/types/index.ts`:

- User & Auth types
- Room & Booking types
- Menu & Order types
- Payment types
- Staff types
- Housekeeping types
- And more...

Import them as needed:
```typescript
import type { User, Room, Booking, Order } from '@/types';
```
