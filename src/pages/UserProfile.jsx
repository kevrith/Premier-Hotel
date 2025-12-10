import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import {
  User,
  Heart,
  Award,
  Star,
  Settings,
  LayoutDashboard
} from 'lucide-react';
import ProfileOverview from '@/components/Profile/ProfileOverview';
import PersonalInfo from '@/components/Profile/PersonalInfo';
import FavouritesManager from '@/components/Profile/FavouritesManager';
import LoyaltyProgram from '@/components/Profile/LoyaltyProgram';
import ReviewsManager from '@/components/Profile/ReviewsManager';
import SettingsPage from '@/components/Profile/SettingsPage';
import { toast } from 'react-hot-toast';
import { useEffect } from 'react';

export default function UserProfile() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      toast.error('Please login to view your profile');
      navigate('/login', { state: { from: '/profile' } });
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-8 mt-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <div className="h-20 w-20 rounded-full bg-gradient-gold flex items-center justify-center">
              <User className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden md:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="personal" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden md:inline">Personal</span>
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <span className="hidden md:inline">Favorites</span>
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span className="hidden md:inline">Loyalty</span>
            </TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span className="hidden md:inline">Reviews</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden md:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ProfileOverview />
          </TabsContent>

          <TabsContent value="personal">
            <PersonalInfo />
          </TabsContent>

          <TabsContent value="favorites">
            <FavouritesManager />
          </TabsContent>

          <TabsContent value="loyalty">
            <LoyaltyProgram />
          </TabsContent>

          <TabsContent value="reviews">
            <ReviewsManager />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsPage />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
