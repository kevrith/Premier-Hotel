// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
// import { AuthProvider } from "./contexts/AuthContext";
// import { OfflineProvider } from "./contexts/OfflineContext";
// import ProtectedRoute from "./components/ProtectedRoute";
import Index from "./pages/Index";
// import Login from "./pages/Login";
// import Register from "./pages/Register";
// import EnhancedMenu from "./pages/EnhancedMenu";
// import Rooms from "./pages/Rooms";
// import RoomDetails from "./pages/RoomDetails";
// import BookRooms from "./pages/BookRooms";
// import RoomBooking from "./pages/RoomBooking";
// import BookingConfirmation from "./pages/BookingConfirmation";
// import MyBookings from "./pages/MyBookings";
// import UserProfile from "./pages/UserProfile";
// import ManagerInterface from "./pages/ManagerInterface";
// import WaiterInterface from "./pages/WaiterInterface";
// import ChefInterface from "./pages/ChefInterface";
// import CleanerInterface from "./pages/CleanerInterface";
// import AdminInterface from "./pages/AdminInterface";
// import Dashboard from "./pages/Dashboard";
// import Profile from "./pages/Profile";
// import GuestCheckout from "./pages/GuestCheckout";
// import Unauthorized from "./pages/Unauthorized";
// import NotFound from "./pages/NotFound";
import { Footer } from "./components/Footer";
import { HeroSection } from "./components/HeroSection";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/hero" element={<HeroSection />} />
      <Route path="/footer" element={<Footer />} />
    </Routes>
  </BrowserRouter>
);

export default App;
