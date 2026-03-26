import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Amina Wanjiku",
    role: "Business Traveller",
    rating: 5,
    text: "Absolutely stunning hotel. The room service was prompt, the food was exceptional, and the staff made me feel like royalty. Will definitely be back!",
    initials: "AW",
    color: "from-violet-500 to-purple-600",
  },
  {
    name: "James Mwangi",
    role: "Honeymoon Guest",
    rating: 5,
    text: "Premier Hotel made our honeymoon perfect. The attention to detail, the luxurious suite, and the breathtaking views created memories we'll cherish forever.",
    initials: "JM",
    color: "from-amber-500 to-orange-600",
  },
  {
    name: "Sarah Otieno",
    role: "Corporate Client",
    rating: 5,
    text: "We host all our executive events here. The facilities are world-class, the catering is superb, and the team is incredibly professional and responsive.",
    initials: "SO",
    color: "from-teal-500 to-emerald-600",
  },
];

export function TestimonialsSection() {
  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-violet-950 to-indigo-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-16">
          <span className="inline-block text-xs sm:text-sm font-semibold tracking-widest uppercase text-violet-300 mb-3">
            Guest Reviews
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            What Our Guests Say
          </h2>
          <p className="text-base sm:text-lg text-white/60 max-w-xl mx-auto">
            Thousands of satisfied guests have made Premier Hotel their home away from home
          </p>
        </div>

        {/* Testimonial cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="relative flex flex-col p-5 sm:p-7 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/30 transition-all duration-300 hover:-translate-y-1"
            >
              {/* Quote icon */}
              <Quote className="absolute top-5 right-5 w-6 h-6 text-white/10" />

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              {/* Text */}
              <p className="text-sm sm:text-base text-white/70 leading-relaxed flex-1 mb-5 italic">
                "{t.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  <p className="text-xs text-white/50">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
