import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Users } from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Events",
    description:
      "Get matched with workshops, competitions, and social activities based on your free slots and interests.",
  },
  {
    icon: Users,
    title: "Clubs & Societies",
    description:
      "Explore student communities, view meeting schedules, and join groups that match your goals.",
  },
];

const LandingPage = ({ onGetStarted }) => {
  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-[#050508] text-white font-sans">
      {/* Decorative background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-taylor-red/20 blur-[90px] sm:h-96 sm:w-96 lg:-left-32 lg:-top-32 lg:h-[34rem] lg:w-[34rem]" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-blue-600/20 blur-[90px] sm:h-96 sm:w-96 lg:-bottom-32 lg:-right-32 lg:h-[34rem] lg:w-[34rem]" />
        <div className="absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/10 blur-[100px] sm:h-80 sm:w-80" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-7xl items-center px-4 py-8 sm:px-6 sm:py-12 lg:px-10 lg:py-16">
        <div className="grid w-full items-center gap-9 lg:grid-cols-[0.92fr_1.08fr] lg:gap-16 xl:gap-24">
          {/* Hero section */}
          <section className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <motion.div
              initial={{ scale: 0.75, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 20 }}
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-taylor-red to-[#8a1525] shadow-glow-red sm:h-20 sm:w-20 sm:rounded-3xl lg:h-24 lg:w-24"
            >
              <span className="font-serif text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
                T
              </span>
            </motion.div>

            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.12 }}
              className="mt-3 font-outfit text-lg font-bold tracking-wide text-gray-100 sm:text-xl lg:text-2xl"
            >
              T-Life
            </motion.p>

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-5 max-w-3xl text-[2rem] font-bold leading-[1.08] tracking-tight sm:mt-7 sm:text-5xl lg:text-6xl xl:text-7xl"
            >
              Experience Taylor&apos;s{" "}
              <span className="block bg-gradient-to-r from-taylor-red to-orange-500 bg-clip-text text-transparent sm:inline lg:block">
                Like Never Before
              </span>
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4 max-w-xl text-sm leading-6 text-gray-400 sm:mt-5 sm:text-base sm:leading-7 lg:text-lg"
            >
              Your all-in-one companion for campus life. Discover events and
              clubs that fit your interests, goals, and schedule.
            </motion.p>

            <motion.button
              type="button"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.7 }}
              onClick={onGetStarted}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="group relative mt-7 flex min-h-12 w-full max-w-sm items-center justify-center gap-2 overflow-hidden rounded-xl bg-white px-6 py-3.5 text-base font-bold text-black shadow-lg shadow-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#050508] sm:mt-8 sm:w-auto sm:min-w-52 sm:text-lg"
            >
              <span className="relative z-10 flex items-center gap-2">
                Get Started
                <ArrowRight
                  size={20}
                  className="transition-transform group-hover:translate-x-1"
                />
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-gray-200 to-white opacity-0 transition-opacity group-hover:opacity-100" />
            </motion.button>
          </section>

          {/* Feature cards */}
          <motion.section
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.38 }}
            aria-label="T-Life features"
            className="grid w-full gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-1 lg:gap-5"
          >
            {features.map((feature, index) => (
              <FeatureCard
                key={feature.title}
                {...feature}
                delay={0.45 + index * 0.1}
              />
            ))}
          </motion.section>
        </div>
      </div>
    </main>
  );
};

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
  <motion.article
    initial={{ scale: 0.95, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay }}
    whileHover={{ y: -3 }}
    className="flex min-w-0 items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4 backdrop-blur-sm transition-colors hover:bg-white/[0.09] sm:gap-4 sm:p-5 lg:p-6"
  >
    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl border border-taylor-red/30 bg-taylor-red/10 sm:h-11 sm:w-11 lg:h-12 lg:w-12">
      <Icon className="text-taylor-red" size={22} aria-hidden="true" />
    </div>

    <div className="min-w-0 text-left">
      <h2 className="text-sm font-bold text-white sm:text-base lg:text-lg">
        {title}
      </h2>
      <p className="mt-1 text-xs leading-5 text-gray-400 sm:text-sm sm:leading-6">
        {description}
      </p>
    </div>
  </motion.article>
);

export default LandingPage;