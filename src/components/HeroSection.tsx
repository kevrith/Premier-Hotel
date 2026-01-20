import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

export function HeroSection() {
  // All images from the public/images folder
  const backgroundImages = [
    "/images/A1.jpeg",
    "/images/A2.jpeg",
    "/images/A3.jpeg",
    "/images/A4.jpeg",
    "/images/A5.jpeg",
    "/images/T1.jpeg",
    "/images/T2.jpeg",
    "/images/T3.jpeg",
    "/images/F1.jpeg",
  ];

  // Professional rotating taglines - Add more phrases here
  const taglines = [
    "Experience unparalleled luxury and comfort in the heart of the city. Where exceptional service meets modern elegance.",
    "Discover world-class hospitality with breathtaking views and premium amenities. Your perfect escape awaits.",
    "Indulge in sophisticated comfort where every detail is crafted for your pleasure. Excellence redefined.",
    "Where timeless elegance meets contemporary luxury. Creating unforgettable moments since day one.",
    "Elevate your stay with exquisite dining, spa services, and unmatched attention to detail.",
  ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentTaglineIndex, setCurrentTaglineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  // Professional timing: 8 seconds per image (industry standard for hero carousels)
  // Provides enough time to read content while maintaining engagement
  const SLIDE_DURATION = 8000; // 8 seconds - Change this value to adjust timing
  const TRANSITION_DURATION = 1000; // 1 second fade transition
  const TYPING_SPEED = 50; // milliseconds per character - adjust for faster/slower typing
  const PAUSE_BEFORE_NEXT = 4000; // 4 seconds pause after typing completes

  // Background image slideshow
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);

      setTimeout(() => {
        setCurrentImageIndex((prevIndex) =>
          (prevIndex + 1) % backgroundImages.length
        );
        setIsTransitioning(false);
      }, TRANSITION_DURATION / 2);
    }, SLIDE_DURATION);

    return () => clearInterval(interval);
  }, [backgroundImages.length]);

  // Auto-typing effect
  useEffect(() => {
    const currentTagline = taglines[currentTaglineIndex];

    if (isTyping) {
      if (displayedText.length < currentTagline.length) {
        const timeout = setTimeout(() => {
          setDisplayedText(currentTagline.slice(0, displayedText.length + 1));
        }, TYPING_SPEED);
        return () => clearTimeout(timeout);
      } else {
        // Finished typing, pause before next tagline
        const pauseTimeout = setTimeout(() => {
          setIsTyping(false);
          setDisplayedText("");
          setCurrentTaglineIndex((prev) => (prev + 1) % taglines.length);
        }, PAUSE_BEFORE_NEXT);
        return () => clearTimeout(pauseTimeout);
      }
    } else {
      // Start typing next tagline
      setIsTyping(true);
    }
  }, [displayedText, isTyping, currentTaglineIndex, taglines]);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-blue-900 to-black">
      {/* Background Image Slideshow with Overlay */}
      <div className="absolute inset-0 z-0">
        {/* Current Image */}
        <img
          src={backgroundImages[currentImageIndex]}
          alt="Luxury hotel"
          className={`w-full h-full object-cover transition-opacity duration-1000 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        />
        {/* 80% opacity overlay - Change opacity here: opacity-80 means 80% opacity (20% transparent) */}
        <div className="absolute inset-0 bg-black opacity-80"></div>
      </div>

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

          {/* Subtitle with Auto-Typing Effect */}
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed min-h-[4rem] flex items-center justify-center">
            <span>
              {displayedText}
              <span className="animate-pulse text-accent">|</span>
            </span>
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
