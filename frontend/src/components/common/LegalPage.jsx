export default function LegalPage({ title, updated, children }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="premium-surface rounded-[2rem] p-6 sm:p-10 lg:p-14">
        <span className="premium-eyebrow">Subtaro · Legal</span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Last updated {updated}</p>
        <div className="mt-10 space-y-9 border-t border-black/[0.06] pt-8 dark:border-white/[0.08] sm:mt-12 sm:pt-10">
          {children}
        </div>
      </div>
    </div>
  )
}

export const LegalSection = ({ title, children }) => (
  <section>
    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
    <div className="mt-3 space-y-3 text-[15px] leading-7 text-slate-600 dark:text-slate-300">
      {children}
    </div>
  </section>
)
