import { motion } from "framer-motion";
import { UploadCloud, Cpu, FileCheck2 } from "lucide-react";

const STEPS = [
  {
    icon: UploadCloud,
    title: "Upload your file",
    desc: "Drag in a video or audio file. It uploads straight to secure cloud storage.",
  },

  {
    icon: Cpu,
    title: "Watch it process live",
    desc: "Audio separation, diarization, transcription and subtitle generation — tracked step by step over a live socket connection.",
  },
  {
    icon: FileCheck2,
    title: "Review, edit & export",
    desc: "Play back the result, tweak subtitle lines if needed, and download the final SRT or captioned video.",
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-slate-50 py-20 dark:bg-slate-900/40"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            From upload to subtitles in three steps
          </h2>
        </div>

        <div className="relative mt-16 grid gap-10 sm:grid-cols-3">
          <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent dark:via-slate-700 sm:block" />
          {STEPS.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.12 }}
              className="relative flex flex-col items-center text-center"
            >
              <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-lg shadow-slate-200 ring-1 ring-slate-100 dark:bg-slate-900 dark:text-brand-400 dark:ring-slate-800 dark:shadow-none">
                <Icon className="h-7 w-7" />
              </span>
              <span className="mt-4 text-xs font-bold uppercase tracking-wider text-brand-500">
                Step {i + 1}
              </span>
              <h3 className="mt-1.5 text-lg font-bold text-slate-900 dark:text-white">
                {title}
              </h3>
              <p className="mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">
                {desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
