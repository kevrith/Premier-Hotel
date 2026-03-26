import { ShieldCheck, Clock, CreditCard, Headphones } from "lucide-react";

const features = [
  { icon: ShieldCheck, title: "Safe & Secure", desc: "100% verified & trusted" },
  { icon: Clock, title: "24/7 Support", desc: "Always here for you" },
  { icon: CreditCard, title: "Easy Payment", desc: "M-Pesa & card accepted" },
  { icon: Headphones, title: "Concierge", desc: "Personal assistance" },
];

export function FeaturesStrip() {
  return (
    <div className="bg-gradient-to-r from-black via-indigo-950 to-black border-y border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/5">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-3 py-4 sm:py-5 px-3 sm:px-6">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-amber-400/10 flex items-center justify-center flex-shrink-0">
                <f.icon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-white truncate">{f.title}</p>
                <p className="text-xs text-white/50 truncate hidden sm:block">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
