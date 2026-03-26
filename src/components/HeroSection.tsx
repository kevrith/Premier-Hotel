import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, ChevronDown, MapPin, Star, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { roomsAPI } from "@/lib/api/rooms";

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

const taglines = [
  "Experience unparalleled luxury and comfort in the heart of the city.",
  "Discover world-class hospitality with breathtaking views and premium amenities.",
  "Indulge in sophisticated comfort where every detail is crafted for your pleasure.",
  "Where timeless elegance meets contemporary luxury.",
  "Elevate your stay with exquisite dining, spa services, and unmatched attention.",
];

export function HeroSection() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentTaglineIndex, setCurrentTaglineIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [roomCount, setRoomCount] = useState<number | null>(null);

  // Fetch real room count from API
  useEffect(() => {
    roomsAPI.listRooms()
      .then((rooms) => setRoomCount(rooms.length))
      .catch(() => setRoomCount(null));
  }, []);

  // Background image slideshow — 8s per slide
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex((prev) => (prev + 1) % backgroundImages.length);
        setIsTransitioning(false);
      }, 600);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Auto-typing tagline
  useEffect(() => {
    const current = taglines[currentTaglineIndex];
    if (isTyping) {
      if (displayedText.length < current.length) {
        const t = setTimeout(() => setDisplayedText(current.slice(0, displayedText.length + 1)), 45);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => {
        setIsTyping(false);
        setDisplayedText("");
        setCurrentTaglineIndex((p) => (p + 1) % taglines.length);
      }, 3500);
      return () => clearTimeout(t);
    }
    setIsTyping(true);
  }, [displayedText, isTyping, currentTaglineIndex]);

  const stats = [
    { value: roomCount !== null ? String(roomCount) : "—", label: "Luxury Rooms" },
    { value: "24/7", label: "Concierge" },
    { value: "5★", label: "Guest Rating" },
  ];

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <img
          src={backgroundImages[currentImageIndex]}
          alt="Premier Hotel"
          className={`w-full h-full object-cover transition-opacity duration-700 ${isTransitioning ? "opacity-0" : "opacity-100"}`}
        />
        {/* Dark overlay — no green, clean dark gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/20" />
      </div>

      {/* Slide dots */}
      <div className="absolute top-24 right-4 sm:right-8 z-20 flex flex-col gap-1.5">
        {backgroundImages.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentImageIndex(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === currentImageIndex ? "bg-amber-400 scale-125" : "bg-white/40"}`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Main content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20 pb-8">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 mb-6 sm:mb-8 backdrop-blur-sm">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs sm:text-sm font-medium tracking-wide">5-Star Luxury Hotel · NKubu, Meru</span>
        </div>

        {/* Heading */}
        <h1 className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl font-bold text-white leading-[1.1] mb-4 sm:mb-6 tracking-tight">
          Welcome to
          <span className="block bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
            Premier Hotel
          </span>
        </h1>

        {/* Typing tagline */}
        <div className="min-h-[3rem] sm:min-h-[3.5rem] flex items-center justify-center mb-8 sm:mb-10 px-2">
          <p className="text-sm sm:text-lg md:text-xl text-white/80 max-w-2xl leading-relaxed">
            {displayedText}
            <span className="inline-block w-0.5 h-4 sm:h-5 bg-amber-400 ml-0.5 animate-pulse align-middle" />
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col xs:flex-row gap-3 justify-center mb-10 sm:mb-14">
          <Button
            asChild
            size="lg"
            className="h-12 px-7 text-base bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold shadow-lg shadow-amber-500/20 transition-all duration-200 touch-button"
          >
            <Link to="/rooms">
              <Calendar className="mr-2 h-4 w-4" />
              Book a Room
            </Link>
          </Button>
          <Link
            to="/menu"
            className="inline-flex items-center justify-center h-12 px-7 text-base font-medium rounded-md border border-white/40 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-200 touch-button"
          >
            <UtensilsCrossed className="mr-2 h-4 w-4" />
            Order Food
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </div>

        {/* Stats — always 3 cols, glass card */}
        <div className="grid grid-cols-3 gap-px bg-white/10 rounded-2xl overflow-hidden backdrop-blur-md border border-white/10 max-w-md sm:max-w-lg mx-auto">
          {stats.map((s, i) => (
            <div key={i} className="bg-black/40 py-4 px-2 sm:px-6 text-center">
              <div className="text-xl sm:text-3xl font-bold text-amber-400 leading-none mb-1">{s.value}</div>
              <div className="text-xs sm:text-sm text-white/70">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Location pill */}
      <div className="absolute bottom-8 left-4 sm:left-8 z-10">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/70 text-xs sm:text-sm">
          <MapPin className="w-3 h-3 text-amber-400" />
          Downtown, NKubu · Meru, Kenya
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 text-white/40">
        <span className="text-[10px] tracking-widest uppercase hidden sm:block">Scroll</span>
        <ChevronDown className="w-5 h-5 animate-bounce" />
      </div>
    </section>
  );
}
