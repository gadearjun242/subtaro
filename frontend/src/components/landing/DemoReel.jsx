import { useState } from "react";
import { motion } from "framer-motion";
import { Film, Sparkles, UploadCloud, Volume2 } from "lucide-react";
import clsx from "clsx";

// ============================================================
// DROP YOUR OWN DEMO FOOTAGE IN HERE
// ============================================================
// Put two short (10–20s) MP4 clips in /public — same source
// clip, one with no subtitles and one with subtitles burned in
// or attached — then point these at them, e.g.:
//   const BEFORE_VIDEO_URL = '/demo/before.mp4'
//   const AFTER_VIDEO_URL  = '/demo/after.mp4'
// Both play muted + looped, so any short silent clip works.
// Leave either blank to show the placeholder below instead.
// ============================================================
const BEFORE_VIDEO_URL = "/demo/before.mp4";
const AFTER_VIDEO_URL = "/demo/after.mp4";

const TABS = [
  { id: "before", label: "Before", hint: "Raw upload" },
  { id: "after", label: "After", hint: "Subtitled result" },
];

export default function DemoReel() {
  const [tab, setTab] = useState("after");
  const videoUrl = tab === "before" ? BEFORE_VIDEO_URL : AFTER_VIDEO_URL;

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <span className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400">
          <Film className="h-3.5 w-3.5" /> See it in action
        </span>
        <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Same clip. Before and after.
        </h2>
        <p className="mt-4 text-slate-500 dark:text-slate-400">
          A quick, silent loop — flip between the raw upload and the finished
          result.
        </p>
      </div>

      {/* Before / after toggle */}
      <div className="mx-auto mt-8 flex w-fit items-center gap-1 rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "flex cursor-pointer flex-col items-center rounded-xl px-6 py-2 transition-all",
              tab === t.id
                ? "bg-white shadow-md dark:bg-slate-900"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            <span
              className={clsx(
                "text-sm font-bold",
                tab === t.id ? "text-slate-900 dark:text-white" : "",
              )}
            >
              {t.label}
            </span>
            <span className="text-[11px] text-slate-400">{t.hint}</span>
          </button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-2xl shadow-slate-300/30 dark:border-slate-800 dark:shadow-none"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <Volume2 className="h-3 w-3 line-through opacity-60" /> Muted ·
            Looping
          </span>
        </div>

        <div className="relative aspect-video bg-gradient-to-br from-slate-900 to-slate-800">
          {videoUrl ? (
            <video
              key={videoUrl}
              src={videoUrl}
              autoPlay
              muted
              loop
              playsInline
              className="h-full w-full object-cover"
            />
          ) : (
            <DemoPlaceholder showCaptions={tab === "after"} />
          )}
        </div>
      </motion.div>

      {!BEFORE_VIDEO_URL && !AFTER_VIDEO_URL && (
        <p className="mx-auto mt-4 max-w-md text-center text-xs text-slate-400">
          Placeholder shown above — drop{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">
            before.mp4
          </code>{" "}
          /{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">
            after.mp4
          </code>{" "}
          into{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">
            DemoReel.jsx
          </code>{" "}
          to swap in your own footage.
        </p>
      )}
    </section>
  );
}

function DemoPlaceholder({ showCaptions }) {
  const bars = [35, 60, 45, 80, 50, 70, 40, 90, 55, 65, 35, 75, 45, 85, 40];

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6 px-8">
      <div className="flex items-end gap-1">
        {bars.map((h, i) => (
          <span
            key={i}
            className="w-1.5 animate-wave rounded-full bg-gradient-to-t from-brand-500 to-accent-400 opacity-70"
            style={{ height: `${h}%`, animationDelay: `${i * 0.06}s` }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2 rounded-full border border-dashed border-white/20 px-4 py-2 text-xs font-medium text-slate-300">
        <UploadCloud className="h-3.5 w-3.5" />
        Add your demo clip in{" "}
        <code className="rounded bg-white/10 px-1.5 py-0.5">DemoReel.jsx</code>
      </div>

      {showCaptions && (
        <span className="flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
          <Sparkles className="h-3 w-3" /> "This is where your captions appear."
        </span>
      )}
    </div>
  );
}
