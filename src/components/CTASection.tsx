import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";

export function CTASection() {
  return (
    <section className="relative py-16 sm:py-24 overflow-hidden bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-300">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, #000 1px, transparent 0)", backgroundSize: "32px 32px" }} />
      </div>
      {/* Glow blobs */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-yellow-300/40 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-amber-600/30 rounded-full blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4 sm:mb-6 leading-tight">
          Ready to Experience<br className="hidden sm:block" /> Luxury?
        </h2>
        <p className="text-base sm:text-lg text-slate-800/80 max-w-xl mx-auto mb-8 sm:mb-10">
          Book your stay or order from our world-class menu today.
          Your extraordinary experience begins with a single click.
        </p>

        <div className="flex flex-col xs:flex-row gap-3 sm:gap-4 justify-center">
          <Button
            asChild
            size="lg"
            className="h-12 px-8 text-base bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/30 touch-button"
          >
            <Link to="/rooms">
              <Calendar className="mr-2 h-4 w-4" />
              Reserve a Room
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Link
            to="/menu"
            className="inline-flex items-center justify-center h-12 px-8 text-base font-medium rounded-md border-2 border-slate-900/40 text-slate-900 bg-transparent hover:bg-slate-900/10 transition-all duration-200 touch-button"
          >
            <UtensilsCrossed className="mr-2 h-4 w-4" />
            View Our Menu
          </Link>
        </div>
      </div>
    </section>
  );
}
