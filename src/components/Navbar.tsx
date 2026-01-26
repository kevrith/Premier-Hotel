import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Hotel, Menu, X, User, LogOut, Calendar, Bell, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import NotificationBell from "./NotificationBell";

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Rooms", href: "/rooms" },
    { name: "Menu", href: "/menu" },
  ];

  // Get dashboard route based on user role
  const getDashboardRoute = () => {
    if (!user?.role) return "/menu";

    switch (user.role) {
      case 'admin':
        return '/admin';
      case 'manager':
        return '/manager';
      case 'chef':
        return '/chef';
      case 'waiter':
        return '/waiter';
      case 'cleaner':
        return '/cleaner';
      case 'customer':
      default:
        return '/menu';
    }
  };

  const dashboardRoute = getDashboardRoute();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b border-border safe-area-top">
      <div className="mobile-container">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="p-1.5 sm:p-2 rounded-full bg-gradient-gold group-hover:shadow-glow transition-all duration-300">
              <Hotel className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-foreground truncate">Premier Hotel</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            {navigation.map((item) => (
              <Link key={item.name} to={item.href} className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                {item.name}
              </Link>
            ))}
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-1 sm:space-x-3">
            <ThemeToggle />

            {isAuthenticated && user ? (
              <>
                <NotificationBell />

                {/* Desktop Buttons */}
                <Button variant="outline" size="sm" asChild className="hidden lg:flex">
                  <Link to={dashboardRoute}><LayoutDashboard className="h-4 w-4 mr-2" />Dashboard</Link>
                </Button>

                <Button variant="outline" size="sm" asChild className="hidden lg:flex">
                  <Link to="/my-bookings"><Calendar className="h-4 w-4 mr-2" />My Bookings</Link>
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="gap-1 sm:gap-2 touch-button">
                      <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-gradient-gold flex items-center justify-center">
                        <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                      </div>
                      <span className="hidden sm:inline text-sm">{user.full_name?.split(' ')[0] || 'User'}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium truncate">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer"><User className="mr-2 h-4 w-4" />Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="lg:hidden">
                      <Link to={dashboardRoute} className="cursor-pointer"><LayoutDashboard className="mr-2 h-4 w-4" />Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/my-bookings" className="cursor-pointer"><Calendar className="mr-2 h-4 w-4" />My Bookings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/notifications" className="cursor-pointer"><Bell className="mr-2 h-4 w-4" />Notifications</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="cursor-pointer text-red-600">
                      <LogOut className="mr-2 h-4 w-4" />Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                  <Link to="/register">Sign Up</Link>
                </Button>
                <Button size="sm" asChild className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white touch-button">
                  <Link to="/login">Login</Link>
                </Button>
              </>
            )}

            {/* Mobile Menu Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden touch-button" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-background/95 backdrop-blur-lg">
            <div className="px-2 pt-2 pb-3 space-y-1 safe-area-bottom">
              {navigation.map((item) => (
                <Link 
                  key={item.name} 
                  to={item.href} 
                  className="block px-3 py-3 text-base font-medium text-muted-foreground hover:text-foreground transition-colors touch-button" 
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              {isAuthenticated && user && (
                <>
                  <Link 
                    to={dashboardRoute} 
                    className="block px-3 py-3 text-base font-medium text-muted-foreground hover:text-foreground transition-colors touch-button" 
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  <Link 
                    to="/my-bookings" 
                    className="block px-3 py-3 text-base font-medium text-muted-foreground hover:text-foreground transition-colors touch-button" 
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    My Bookings
                  </Link>
                  <Link 
                    to="/notifications" 
                    className="block px-3 py-3 text-base font-medium text-muted-foreground hover:text-foreground transition-colors touch-button" 
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Notifications
                  </Link>
                  <Link 
                    to="/profile" 
                    className="block px-3 py-3 text-base font-medium text-muted-foreground hover:text-foreground transition-colors touch-button" 
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button 
                    onClick={() => { logout(); setIsMobileMenuOpen(false); }} 
                    className="block w-full text-left px-3 py-3 text-base font-medium text-red-600 hover:text-red-700 transition-colors touch-button"
                  >
                    Logout
                  </button>
                </>
              )}
              {!isAuthenticated && (
                <Link 
                  to="/register" 
                  className="block px-3 py-3 text-base font-medium text-muted-foreground hover:text-foreground transition-colors touch-button" 
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
