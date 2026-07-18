// This is the LandingPage.jsx file
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Users,
  Brain,
  Compass,
  Sparkles,
} from "lucide-react";

const FEATURE_MODULES = [
  {
    id: "events",
    icon: Calendar,
    title: "Events",
    tagline: "Matched to your free slots",
    desc: "Workshops, competitions, and socials that fit your timetable and interests.",
    accent: "from-taylor-red/40 to-orange-500/20",
  },
  {
    id: "clubs",
    icon: Users,
    title: "Clubs & Societies",
    tagline: "Find your campus crew",
    desc: "Browse communities, meeting times, and groups that match your goals.",
    accent: "from-rose-500/35 to-taylor-red/15",
  },
  {
    id: "meter",
    icon: Brain,
    title: "AI Status Meter",
    tagline: "Focus meets wellness",
    desc: "Join events and watch your Focus & Wellness scores shift in real time.",
    accent: "from-amber-500/30 to-taylor-red/20",
  },
  {
    id: "explore",
    icon: Compass,
    title: "Campus Explore",
    tagline: "Discover what’s on",
    desc: "Swipe through live campus picks — like a TV promo reel for Taylor’s life.",
    accent: "from-sky-500/30 to-indigo-500/15",
  },
];

const LandingPage = ({ onGetStarted }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const dragX = useMotionValue(0);
  const autoTimer = useRef(null);

  useEffect(() => {
    if (paused) return undefined;

    autoTimer.current = window.setInterval(() => {
      setActiveIndex((i) => (i + 1) % FEATURE_MODULES.length);
    }, 3800);

    return () => {
      if (autoTimer.current) window.clearInterval(autoTimer.current);
    };
  }, [paused]);

  const goTo = (index) => {
    const len = FEATURE_MODULES.length;
    setActiveIndex(((index % len) + len) % len);
  };

  const onDragEnd = (_event, info) => {
    const threshold = 60;
    if (info.offset.x < -threshold) goTo(activeIndex + 1);
    else if (info.offset.x > threshold) goTo(activeIndex - 1);
  };

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
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div className="absolute left-[-25%] top-[-10%] h-[22rem] w-[22rem] rounded-full bg-taylor-red/20 blur-[100px] sm:left-[-10%] sm:h-[30rem] sm:w-[30rem]" />
        <div className="absolute bottom-[-15%] right-[-25%] h-[22rem] w-[22rem] rounded-full bg-blue-600/20 blur-[100px] sm:right-[-10%] sm:h-[30rem] sm:w-[30rem]" />
        <div className="landing-ad-scanline absolute inset-0 opacity-[0.07]" />
      </div>

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
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
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

        <section className="mt-8 space-y-4">
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl"
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

        {/* Floating TV-ad module reel — swipe or watch it float */}
        <motion.section
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          aria-label="T-Life feature reel"
          className="relative mt-8 w-full"
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="flex items-center gap-1.5 text-[11px] font-inter uppercase tracking-[0.2em] text-gray-400">
              <Sparkles size={12} className="text-taylor-red" />
              Live campus reel
            </p>
            <p className="text-[11px] font-inter text-gray-500">
              Swipe · auto-plays
            </p>
          </div>

          <div className="relative h-[210px] w-full overflow-visible">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={FEATURE_MODULES[activeIndex].id}
                style={{ x: dragX }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.55}
                onDragEnd={onDragEnd}
                initial={{ opacity: 0, x: 80, scale: 0.92, rotate: -2 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  scale: 1,
                  rotate: 0,
                  y: [0, -10, 0],
                }}
                exit={{ opacity: 0, x: -70, scale: 0.94, rotate: 2 }}
                transition={{
                  opacity: { duration: 0.35 },
                  x: { type: "spring", stiffness: 280, damping: 28 },
                  scale: { duration: 0.35 },
                  y: {
                    duration: 3.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }}
                className="absolute inset-0 cursor-grab active:cursor-grabbing touch-pan-x"
              >
                <FloatingAdCard module={FEATURE_MODULES[activeIndex]} />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            {FEATURE_MODULES.map((mod, index) => (
              <button
                key={mod.id}
                type="button"
                aria-label={`Show ${mod.title}`}
                onClick={() => goTo(index)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === activeIndex
                    ? "w-7 bg-taylor-red"
                    : "w-1.5 bg-white/25 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        </motion.section>

        <motion.button
          type="button"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.55 }}
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

const FloatingAdCard = ({ module }) => {
  const Icon = module.icon;

  return (
    <article
      className={`
        relative flex h-full w-full flex-col justify-between overflow-hidden
        rounded-3xl border border-white/15
        bg-gradient-to-br ${module.accent}
        p-5 shadow-[0_20px_50px_rgba(0,0,0,0.45)]
        backdrop-blur-md
      `}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="landing-ad-shimmer pointer-events-none absolute inset-0"
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-black/30">
          <Icon className="text-white" size={24} aria-hidden="true" />
        </div>
        <span className="rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-[10px] font-inter uppercase tracking-wider text-white/80">
          Now playing
        </span>
      </div>

      <div className="relative mt-4 text-left">
        <p className="text-[11px] font-inter uppercase tracking-[0.18em] text-white/70">
          {module.tagline}
        </p>
        <h2 className="mt-1 font-outfit text-2xl font-bold text-white">
          {module.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/75">
          {module.desc}
        </p>
      </div>
    </article>
  );
};

export default LandingPage;
