import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, ListVideo, Check, Captions } from "lucide-react";

const MODES = {
  embedded: {
    icon: Flame,
    title: "Burned into the video",
    tagline: "Always visible, everywhere",
    points: [
      "Captions are part of the picture — works on any device or player",
      "Nothing for the viewer to turn on",
      "Best for social clips, ads, and silent autoplay feeds",
    ],
  },
  selectable: {
    icon: ListVideo,
    title: "Selectable subtitle track",
    tagline: "Like a DVD or MKV subtitle track",
    points: [
      "Viewers toggle captions on or off themselves",
      "No re-encoding — muxed in seconds, not minutes",
      "Perfect for archives, dailies, and multi-language libraries",
    ],
  },
};

export default function SubtitleModesShowcase() {
  const [active, setActive] = useState("selectable");
  const mode = MODES[active];
  const Icon = mode.icon;

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400">
          <Captions className="h-3.5 w-3.5" /> Your choice, every project
        </span>
        <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Two ways to deliver subtitles
        </h2>
        <p className="mt-4 text-slate-500 dark:text-slate-400">
          Choose per project, and change your mind later — editing a subtitle
          can switch modes and re-render the video automatically.
        </p>
      </div>

      <div className="mx-auto mt-10 flex max-w-md items-center justify-center rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800">
        {Object.entries(MODES).map(([key, m]) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              active === key
                ? "bg-white text-slate-900 shadow-md dark:bg-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            <m.icon className="h-4 w-4" />
            {m.title}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-8 lg:grid-cols-2 lg:items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.25 }}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white shadow-lg shadow-brand-500/25">
              <Icon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
              {mode.title}
            </h3>
            <p className="mt-1 text-sm font-medium text-brand-600 dark:text-brand-400">
              {mode.tagline}
            </p>
            <ul className="mt-5 space-y-3">
              {mode.points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {point}
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>

        {/* Mini visual mock */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-xl dark:border-slate-800">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
            <AnimatePresence mode="wait">
              {active === "embedded" ? (
                <motion.div
                  key="embedded-preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-black/70 px-3 py-1.5 text-center text-xs font-semibold text-white backdrop-blur"
                >
                  "This part is always here."
                </motion.div>
              ) : (
                <motion.div
                  key="selectable-preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute bottom-6 right-6 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"
                >
                  <ListVideo className="h-3.5 w-3.5" /> CC{" "}
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-end gap-1 opacity-40">
              {[30, 55, 40, 70, 45, 60, 35, 65].map((h, i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-white"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
