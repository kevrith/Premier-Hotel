import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Sparkles, Utensils, Calendar, Bell, Wifi, Car, Coffee, Dumbbell } from 'lucide-react';

export default function Services() {
  const services = [
    {
      icon: Bell,
      title: 'Room Service',
      description: '24/7 room service available for all your needs. Order meals, request amenities, or ask for assistance any time.',
      link: '/service-requests'
    },
    {
      icon: Utensils,
      title: 'Fine Dining',
      description: 'Experience culinary excellence with our world-class chefs. Browse our extensive menu and order directly to your room.',
      link: '/menu'
    },
    {
      icon: Sparkles,
      title: 'Housekeeping',
      description: 'Daily housekeeping services to ensure your room is always pristine. Request additional cleaning any time.',
      link: '/service-requests'
    },
    {
      icon: Calendar,
      title: 'Event Hosting',
      description: 'Host your special events in our luxurious venues. From weddings to corporate meetings, we handle it all.',
      link: '/rooms'
    },
    {
      icon: Wifi,
      title: 'High-Speed WiFi',
      description: 'Complimentary high-speed internet throughout the hotel. Stay connected with our reliable network.',
      link: '/rooms'
    },
    {
      icon: Car,
      title: 'Valet Parking',
      description: 'Convenient valet parking service for all guests. Your vehicle is safe with our professional team.',
      link: '/service-requests'
    },
    {
      icon: Coffee,
      title: 'Concierge Service',
      description: '24/7 concierge available to assist with reservations, recommendations, and travel arrangements.',
      link: '/service-requests'
    },
    {
      icon: Dumbbell,
      title: 'Fitness & Spa',
      description: 'State-of-the-art fitness center and luxurious spa facilities. Wellness packages available.',
      link: '/service-requests'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-primary via-primary-glow to-primary py-20 text-primary-foreground">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Our Services</h1>
            <p className="text-xl text-primary-foreground/90 max-w-3xl mx-auto">
              Discover the exceptional services that make Premier Hotel your perfect choice for luxury and comfort
            </p>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {services.map((service, index) => {
                const Icon = service.icon;
                return (
                  <Card key={index} className="hover:shadow-elegant transition-all duration-300 hover:-translate-y-1">
                    <CardHeader>
                      <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-accent" />
                      </div>
                      <CardTitle className="text-xl">{service.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base mb-4">{service.description}</CardDescription>
                      <Button asChild variant="outline" className="w-full">
                        <Link to={service.link}>Learn More</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-muted py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Need Something Special?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Our staff is always ready to accommodate your unique requests. Contact us anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">
                <Link to="/service-requests">Request Service</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/contact">Contact Us</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
