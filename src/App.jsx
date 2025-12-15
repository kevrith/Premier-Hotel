import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import AdminDashboard from "./pages/AdminDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import ChefDashboard from "./pages/ChefDashboard";
import WaiterDashboard from "./pages/WaiterDashboard";
import CleanerDashboard from "./pages/CleanerDashboard";
import MyOrders from "./pages/MyOrders";
import ReportsDashboard from "./pages/ReportsDashboard";
import StaffManagement from "./pages/StaffManagement";
import HousekeepingDashboard from "./pages/HousekeepingDashboard";
import ServiceRequests from "./pages/ServiceRequests";
import ExpenseTracking from "./pages/ExpenseTracking";
import InventoryDashboard from "./pages/InventoryDashboard";
import LoyaltyProgram from "./pages/LoyaltyProgram";
import NotificationsPage from "./pages/NotificationsPage";
import MessagesPage from "./pages/MessagesPage";

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
    <TooltipProvider>
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
                <Route path="/my-orders" element={<MyOrders />} />
                <Route path="/booking" element={<RoomBooking />} />
                <Route path="/service-requests" element={<ServiceRequests />} />
                <Route path="/loyalty" element={<LoyaltyProgram />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/messages" element={<MessagesPage />} />
              </Route>

              {/* Protected Staff Routes */}
              <Route element={<ProtectedRoute requiredRoles={['admin']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
              </Route>

              <Route element={<ProtectedRoute requiredRoles={['manager', 'admin']} />}>
                <Route path="/manager" element={<ManagerDashboard />} />
              </Route>

              {/* Staff Management & Reports - Admin and Manager only */}
              <Route element={<ProtectedRoute requiredRoles={['admin', 'manager', 'staff']} />}>
                <Route path="/reports" element={<ReportsDashboard />} />
              </Route>

              <Route element={<ProtectedRoute requiredRoles={['admin', 'manager']} />}>
                <Route path="/staff" element={<StaffManagement />} />
              </Route>

              {/* Expense Tracking - Admin, Manager, Staff */}
              <Route element={<ProtectedRoute requiredRoles={['admin', 'manager', 'staff']} />}>
                <Route path="/expenses" element={<ExpenseTracking />} />
              </Route>

              {/* Inventory Management - Admin, Manager, Staff */}
              <Route element={<ProtectedRoute requiredRoles={['admin', 'manager', 'staff']} />}>
                <Route path="/inventory" element={<InventoryDashboard />} />
              </Route>

              {/* Housekeeping - Admin, Manager, Cleaner, Staff */}
              <Route element={<ProtectedRoute requiredRoles={['admin', 'manager', 'cleaner', 'staff']} />}>
                <Route path="/housekeeping" element={<HousekeepingDashboard />} />
              </Route>

              {/* Service Requests - Available to Staff and Customers */}
              <Route element={<ProtectedRoute requiredRoles={['admin', 'manager', 'staff']} />}>
                <Route path="/staff/service-requests" element={<ServiceRequests />} />
              </Route>

              <Route element={<ProtectedRoute requiredRoles={['chef', 'admin']} />}>
                <Route path="/chef" element={<ChefDashboard />} />
              </Route>

              <Route element={<ProtectedRoute requiredRoles={['waiter', 'admin']} />}>
                <Route path="/waiter" element={<WaiterDashboard />} />
              </Route>

              <Route element={<ProtectedRoute requiredRoles={['cleaner', 'admin']} />}>
                <Route path="/cleaner" element={<CleanerDashboard />} />
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
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
