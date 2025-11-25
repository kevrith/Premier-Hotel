import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./ThemeToggle";
import { Hotel, Menu, X } from "lucide-react";
import { useState } from "react";
import RoleBasedContent from "./RoleBasedContent";

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Rooms", href: "/rooms" },
    { name: "Dining", href: "/dining" },
    { name: "Services", href: "/services" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="p-2 rounded-full bg-gradient-gold group-hover:shadow-glow transition-all duration-300">
              <Hotel className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold text-foreground">Premier Hotel</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {item.name}
              </Link>
            ))}
            
            {/* Role-based navigation */}
            <RoleBasedContent allowedRoles={['admin']}>
              <Link
                to="/admin"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                Admin Panel
              </Link>
            </RoleBasedContent>
            
            <RoleBasedContent allowedRoles={['admin', 'manager']}>
              <Link
                to="/manager"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                Management
              </Link>
            </RoleBasedContent>
            
            <RoleBasedContent allowedRoles={['waiter']}>
              <Link
                to="/waiter"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                Waiter Panel
              </Link>
            </RoleBasedContent>
            
            <RoleBasedContent allowedRoles={['chef']}>
              <Link
                to="/chef"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                Kitchen
              </Link>
            </RoleBasedContent>
            
            <RoleBasedContent allowedRoles={['cleaner']}>
              <Link
                to="/cleaner"
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                Housekeeping
              </Link>
            </RoleBasedContent>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <Button variant="outline" size="sm" asChild>
              <Link to="/menu">Order Now</Link>
            </Button>
            <Button variant="hero" size="sm" asChild>
              <Link to="/login">Login</Link>
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-lg">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="block px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}