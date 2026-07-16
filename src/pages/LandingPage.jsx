// This is the LandingPage.jsx file
import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Users } from "lucide-react";

const LandingPage = ({ onGetStarted }) => {
  return (
    <main
      className="
        relative
        min-h-[100dvh]
        w-full
        overflow-x-hidden
        bg-[#050508]
        px-4 py-6
        font-sans text-white
        sm:px-6 sm:py-8
      "
    >
      {/* Fixed decorative background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute left-[-25%] top-[-10%] h-[22rem] w-[22rem] rounded-full bg-taylor-red/20 blur-[100px] sm:left-[-10%] sm:h-[30rem] sm:w-[30rem]" />

        <div className="absolute bottom-[-15%] right-[-25%] h-[22rem] w-[22rem] rounded-full bg-blue-600/20 blur-[100px] sm:right-[-10%] sm:h-[30rem] sm:w-[30rem]" />
      </div>

      {/* Scrollable page content */}
      <div
        className="
          relative z-10
          mx-auto
          flex min-h-[100dvh]
          w-full max-w-md
          flex-col items-center
          pb-8
          text-center
          touch-pan-y
        "
      >
        {/* Logo / Icon */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
          className="
            flex h-20 w-20
            flex-none items-center justify-center
            rounded-3xl
            bg-gradient-to-br from-taylor-red to-[#8a1525]
            shadow-glow-red
            sm:h-24 sm:w-24
          "
        >
          <span className="font-serif text-4xl font-bold text-white sm:text-5xl">
            T
          </span>
        </motion.div>

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.12 }}
          className="mt-3 font-outfit text-xl font-bold tracking-wide text-gray-100 sm:text-2xl"
        >
          T-Life
        </motion.p>

        {/* Hero Text */}
        <section className="mt-8 space-y-4">
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="
              text-3xl font-bold
              leading-tight tracking-tight
              sm:text-4xl
            "
          >
            Experience Taylor&apos;s
            <br />
            <span className="bg-gradient-to-r from-taylor-red to-orange-500 bg-clip-text text-transparent">
              Like Never Before
            </span>
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-base leading-7 text-gray-400 sm:text-lg"
          >
            Your all-in-one companion for campus life. Discover events and clubs
            that fit your schedule.
          </motion.p>
        </section>

        {/* Features Grid */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          aria-label="T-Life features"
          className="mt-8 grid w-full grid-cols-1 gap-4"
        >
          <FeatureCard
            icon={Calendar}
            title="Events"
            desc="Get matched with workshops, competitions, and social activities based on your free slots and interests."
            delay={0.5}
          />

          <FeatureCard
            icon={Users}
            title="Clubs & Societies"
            desc="Explore student communities, view meeting schedules, and join groups that match your goals."
            delay={0.6}
          />
        </motion.section>

        {/* CTA Button */}
        <motion.button
          type="button"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          onClick={onGetStarted}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="
            group relative
            mt-8 flex min-h-14 w-full
            items-center justify-center gap-2
            overflow-hidden rounded-xl
            bg-white px-6 py-4
            text-lg font-bold text-black
            focus:outline-none
            focus-visible:ring-2
            focus-visible:ring-white
            focus-visible:ring-offset-2
            focus-visible:ring-offset-[#050508]
          "
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
      </div>
    </main>
  );
};

const FeatureCard = ({ icon: Icon, title, desc, delay }) => (
  <motion.article
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay }}
    className="
      flex items-start gap-4
      rounded-2xl
      border border-white/10
      bg-white/5
      p-4
      transition-colors
      hover:bg-white/10
      sm:p-5
    "
  >
    <div
      className="
        flex h-11 w-11
        flex-none items-center justify-center
        rounded-xl
        border border-taylor-red/30
        bg-taylor-red/10
      "
    >
      <Icon className="text-taylor-red" size={22} aria-hidden="true" />
    </div>

    <div className="min-w-0 text-left">
      <h2 className="mb-1 text-base font-bold text-white">{title}</h2>

      <p className="text-sm leading-relaxed text-gray-400">{desc}</p>
    </div>
  </motion.article>
);

export default LandingPage;
