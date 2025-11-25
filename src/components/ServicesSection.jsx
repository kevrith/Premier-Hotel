import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Utensils, Wifi, Car, Wind, Coffee, Dumbbell } from "lucide-react";

const services = [
  { icon: Utensils, title: "Fine Dining", description: "Exquisite culinary experiences curated by world-class chefs" },
  { icon: Wifi, title: "High-Speed WiFi", description: "Complimentary ultra-fast internet throughout the property" },
  { icon: Car, title: "Valet Parking", description: "Professional valet service available 24/7" },
  { icon: Wind, title: "Climate Control", description: "Individual room climate control for optimal comfort" },
  { icon: Coffee, title: "Room Service", description: "Round-the-clock premium room service" },
  { icon: Dumbbell, title: "Fitness Center", description: "State-of-the-art gym with modern equipment" },
];

export function ServicesSection() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Premium Services
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Every detail designed for your comfort and convenience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <Card key={index} className="group hover:shadow-elegant transition-all duration-300 border-0 bg-gradient-card">
              <CardHeader>
                <div className="w-14 h-14 rounded-full bg-gradient-gold flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <service.icon className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl">{service.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}