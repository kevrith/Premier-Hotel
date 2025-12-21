import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
// import { LazyImage } from "@/hooks/useLazyLoading";
// import heroImage from "@/assets/hero-hotel-lobby.jpg";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-blue-900 to-black">
      {/* Background Image with Overlay */}
      {/* <div className="absolute inset-0 z-0">
        <LazyImage
          src={heroImage}
          alt="Luxury hotel lobby"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-hero"></div>
      </div> */}

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-accent/20 text-accent border border-accent/30 mb-8">
            <Star className="w-4 h-4 mr-2" />
            <span className="text-sm font-medium">5-Star Luxury Experience</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Welcome to
            <span className="block text-transparent bg-gradient-gold bg-clip-text">
              Premier Hotel
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
            Experience unparalleled luxury and comfort in the heart of the city. 
            Where exceptional service meets modern elegance.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button asChild size="lg" className="text-lg px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">
              <Link to="/menu">
                Order Now
                <ArrowRight className="ml-2 h-5 w-5 inline" />
              </Link>
            </Button>
            <Button asChild size="lg" className="text-lg px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white">
              <Link to="/rooms">
                <Calendar className="mr-2 h-5 w-5 inline" />
                Book Now
              </Link>
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-accent mb-2">150+</div>
              <div className="text-white/80">Luxury Rooms</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent mb-2">24/7</div>
              <div className="text-white/80">Concierge Service</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent mb-2">5★</div>
              <div className="text-white/80">Guest Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* Location indicator */}
      <div className="absolute bottom-8 left-8 z-10 flex items-center text-white/80">
        <MapPin className="w-4 h-4 mr-2" />
        <span className="text-sm">Downtown Premium Locations</span>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-bounce"></div>
        </div>
      </div>
    </section>
  );
}
