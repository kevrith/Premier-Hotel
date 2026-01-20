import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from "./contexts/AuthContext";
import { OfflineProvider } from "./contexts/OfflineContext";
import { SocketProvider } from "./contexts/SocketContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
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
import Dining from "./pages/Dining";
import Services from "./pages/Services";
import Contact from "./pages/Contact";
import FoodOrderingPage from "./pages/FoodOrderingPage";

// Housekeeping Enhancement Components
import { LostAndFound } from "./components/Housekeeping/LostAndFound";
import { DeepCleaningSchedule } from "./components/Housekeeping/DeepCleaningSchedule";
import { InventoryManagement } from "./components/Housekeeping/InventoryManagement";
import { PerformanceAnalytics } from "./components/Housekeeping/PerformanceAnalytics";

// Check-In/Check-Out Pages
import CheckIn from "./pages/CheckIn";
import ExpressCheckIn from "./pages/ExpressCheckIn";
import ExpressCheckOut from "./pages/ExpressCheckOut";
import StaffCheckInDashboard from "./pages/StaffCheckInDashboard";
import PreArrivalRegistration from "./pages/PreArrivalRegistration";

// Customer Payment Page (Public)
import CustomerPayment from "./pages/CustomerPayment";

// Initialize i18n
import "./i18n/config";

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

const App = () => {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Request notification permission on app load
  useEffect(() => {
    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
        if (permission === 'granted') {
          console.log('✅ Notifications enabled');
        }
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <GoogleOAuthProvider clientId={googleClientId || ''}>
          <BrowserRouter>
            <AuthProvider>
              <OfflineProvider>
                <SocketProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Public Customer Payment Page - No auth required */}
              <Route path="/pay/:billNumber" element={<CustomerPayment />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Public Menu and Rooms (accessible to all) */}
              <Route path="/menu" element={<EnhancedMenu />} />
              <Route path="/order-food" element={<FoodOrderingPage />} />
              <Route path="/rooms" element={<Rooms />} />
              <Route path="/rooms/:id" element={<RoomDetails />} />
              <Route path="/dining" element={<Dining />} />
              <Route path="/services" element={<Services />} />
              <Route path="/contact" element={<Contact />} />

              {/* Public Express Check-In (accessible to all guests with booking) */}
              <Route path="/express-check-in" element={<ExpressCheckIn />} />

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

                {/* Check-In/Check-Out Routes for Customers */}
                <Route path="/pre-arrival-registration/:bookingId" element={<PreArrivalRegistration />} />
                <Route path="/check-in/:bookingId" element={<CheckIn />} />
                <Route path="/express-check-out/:bookingId" element={<ExpressCheckOut />} />
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

                {/* Staff Check-In/Check-Out Dashboard */}
                <Route path="/staff/check-in-out" element={<StaffCheckInDashboard />} />
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
                <Route path="/housekeeping/lost-found" element={<LostAndFound />} />
                <Route path="/housekeeping/deep-cleaning" element={<DeepCleaningSchedule />} />
                <Route path="/housekeeping/inventory" element={<InventoryManagement />} />
                <Route path="/housekeeping/analytics" element={<PerformanceAnalytics />} />
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
        </GoogleOAuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
