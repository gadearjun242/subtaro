import { motion } from "framer-motion";

const STATS = [
  { value: "5-step", label: "Live-tracked pipeline" },
  { value: "2", label: "Subtitle delivery modes" },
  { value: "30 days", label: "Free trial, no card needed" },
  { value: "Real-time", label: "Socket-powered updates" },
];

export default function StatsStrip() {
  return (
    <section className="border-y border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/30">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.35, delay: i * 0.06 }}
            className="text-center"
          >
            <p className="text-gradient text-3xl font-extrabold sm:text-4xl">
              {stat.value}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {stat.label}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
