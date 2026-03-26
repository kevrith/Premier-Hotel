import { Utensils, Wifi, Coffee } from "lucide-react";

const services = [
  {
    icon: Utensils,
    title: "Fine Dining",
    description: "Exquisite culinary experiences crafted by world-class chefs using the finest local and international ingredients.",
    color: "from-orange-500/20 to-rose-500/10",
    iconColor: "text-orange-400",
    border: "hover:border-orange-500/40",
  },
  {
    icon: Wifi,
    title: "High-Speed WiFi",
    description: "Complimentary ultra-fast internet throughout the entire property — rooms, restaurant, and lounges.",
    color: "from-cyan-500/20 to-blue-500/10",
    iconColor: "text-cyan-400",
    border: "hover:border-cyan-500/40",
  },
  {
    icon: Coffee,
    title: "Room Service",
    description: "Round-the-clock premium in-room dining service — enjoy chef-prepared meals from the comfort of your suite.",
    color: "from-amber-500/20 to-yellow-500/10",
    iconColor: "text-amber-400",
    border: "hover:border-amber-500/40",
  },
];

export function ServicesSection() {
  return (
    <section className="relative py-16 sm:py-24 overflow-hidden bg-gradient-to-br from-indigo-950 via-violet-900 to-indigo-950">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }}
      />
      {/* Glow accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-16">
          <span className="inline-block text-xs sm:text-sm font-semibold tracking-widest uppercase text-violet-300 mb-3">
            What We Offer
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Premium Services
          </h2>
          <p className="text-base sm:text-lg text-white/60 max-w-2xl mx-auto">
            Every detail designed for your comfort and convenience
          </p>
        </div>

        {/* Grid — 3 cards, always equal width */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {services.map((service, index) => (
            <div
              key={index}
              className={`group p-6 sm:p-8 rounded-2xl border border-white/10 bg-gradient-to-br ${service.color} backdrop-blur-sm transition-all duration-300 hover:shadow-xl ${service.border} hover:-translate-y-1 cursor-default`}
            >
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                <service.icon className={`h-6 w-6 ${service.iconColor}`} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-white mb-2">{service.title}</h3>
              <p className="text-sm text-white/55 leading-relaxed">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
