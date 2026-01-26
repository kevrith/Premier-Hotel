import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Home, UtensilsCrossed, Bed, User, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MobileNavigation() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

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

  const navigationItems = [
    {
      name: 'Home',
      href: '/',
      icon: Home,
      show: true
    },
    {
      name: 'Menu',
      href: '/menu',
      icon: UtensilsCrossed,
      show: true
    },
    {
      name: 'Rooms',
      href: '/rooms',
      icon: Bed,
      show: true
    },
    {
      name: 'Dashboard',
      href: dashboardRoute,
      icon: LayoutDashboard,
      show: isAuthenticated && user
    },
    {
      name: 'Profile',
      href: isAuthenticated ? '/profile' : '/login',
      icon: User,
      show: true
    }
  ];

  const visibleItems = navigationItems.filter(item => item.show);

  return (
    <nav className="mobile-nav safe-area-bottom">
      <div className="flex items-center justify-around py-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-colors touch-button min-w-[60px]",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}