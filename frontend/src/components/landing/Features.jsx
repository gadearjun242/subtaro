import { motion } from "framer-motion";
import {
  Users,
  Wand2,
  FileDown,
  RadioTower,
  PencilLine,
  ShieldCheck,
} from "lucide-react";

const FEATURES = [
  {
    icon: Users,
    title: "Speaker diarization",
    desc: "Automatically detects who is speaking and when, so multi-speaker content stays accurate.",
  },
  {
    icon: Wand2,
    title: "Speaker-aware transcription",
    desc: "Transcription tuned per-speaker for far higher accuracy than generic ASR.",
  },
  {
    icon: RadioTower,
    title: "Live pipeline updates",
    desc: "Watch every processing step update in real time over a socket connection — no refreshing.",
  },
  {
    icon: PencilLine,
    title: "Editable subtitles",
    desc: "Fine-tune the generated SRT right in your dashboard, then save an updated file.",
  },
  {
    icon: FileDown,
    title: "Video or audio in",
    desc: "Drop in MP4, MOV, MKV, MP3, WAV, FLAC and more — output stays clean either way.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    desc: "JWT-based auth, hashed passwords, and per-user isolated storage for every upload.",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Everything you need, nothing you don't
        </h2>
        <p className="mt-4 text-slate-500 dark:text-slate-400">
          A focused pipeline that goes from raw media to polished subtitles.
        </p>
      </div>

      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, desc }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
            className="group rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:shadow-none"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-500/10 dark:text-brand-400">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {desc}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
