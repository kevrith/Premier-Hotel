import { Hotel, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-indigo-950 border-t border-white/5 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-6 sm:pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 mb-10 sm:mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-amber-400/20 flex items-center justify-center">
                <Hotel className="h-5 w-5 text-amber-400" />
              </div>
              <span className="text-lg font-bold text-white">Premier Hotel</span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs">
              Experience luxury redefined. Where exceptional service meets modern elegance in the heart of Meru.
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-amber-400/20 flex items-center justify-center text-white/50 hover:text-amber-400 transition-all duration-200">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 tracking-wide">Quick Links</h3>
            <ul className="space-y-2.5">
              {[
                { label: "Home", to: "/" },
                { label: "Rooms", to: "/rooms" },
                { label: "Menu", to: "/menu" },
                { label: "My Bookings", to: "/my-bookings" },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-white/50 hover:text-amber-400 transition-colors duration-200">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 tracking-wide">Services</h3>
            <ul className="space-y-2.5">
              {["Room Service", "Spa & Wellness", "Fine Dining", "Event Hosting", "Valet Parking"].map((s) => (
                <li key={s} className="text-sm text-white/50">{s}</li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 tracking-wide">Contact</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <MapPin className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-white/50">NKubu, Meru<br />Kenya 60200</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <a href="tel:+254718864578" className="text-sm text-white/50 hover:text-amber-400 transition-colors">+254 718 864 578</a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 text-amber-400 flex-shrink-0" />
                <a href="mailto:premierhotel2023@gmail.com" className="text-sm text-white/50 hover:text-amber-400 transition-colors break-all">premierhotel2023@gmail.com</a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-white/30 text-center sm:text-left">
            © {currentYear} Premier Hotel. All rights reserved.
          </p>
          <div className="flex gap-5">
            <Link to="/privacy" className="text-xs text-white/30 hover:text-amber-400 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="text-xs text-white/30 hover:text-amber-400 transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
