import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./contexts/AuthContext";
import { OfflineProvider } from "./contexts/OfflineContext";
import { SocketProvider } from "./contexts/SocketContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import EnhancedMenu from "./pages/EnhancedMenu";
import Rooms from "./pages/Rooms";
import RoomDetails from "./pages/RoomDetails";
import RoomBooking from "./pages/RoomBooking";
import MyBookings from "./pages/MyBookings";
import UserProfile from "./pages/UserProfile";

// Create QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <OfflineProvider>
          <SocketProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* Public Menu and Rooms (accessible to all) */}
              <Route path="/menu" element={<EnhancedMenu />} />
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/rooms/:id" element={<RoomDetails />} />

              {/* Protected Customer Routes */}
              <Route element={<ProtectedRoute requiredRoles={['customer', 'admin']} />}>
                <Route path="/profile" element={<UserProfile />} />
                <Route path="/my-bookings" element={<MyBookings />} />
                <Route path="/booking" element={<RoomBooking />} />
              </Route>

              {/* Protected Staff Routes */}
              <Route element={<ProtectedRoute requiredRoles={['admin']} />}>
                {/* Admin routes will be added here */}
              </Route>

              <Route element={<ProtectedRoute requiredRoles={['manager', 'admin']} />}>
                {/* Manager routes will be added here */}
              </Route>

              <Route element={<ProtectedRoute requiredRoles={['chef']} />}>
                {/* Chef routes will be added here */}
              </Route>

              <Route element={<ProtectedRoute requiredRoles={['waiter']} />}>
                {/* Waiter routes will be added here */}
              </Route>

              <Route element={<ProtectedRoute requiredRoles={['cleaner']} />}>
                {/* Cleaner routes will be added here */}
              </Route>

              {/* Error Routes */}
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route path="*" element={<NotFound />} />
            </Routes>

            {/* Global Toast Notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </SocketProvider>
        </OfflineProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
