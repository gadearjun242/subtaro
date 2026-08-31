export default function LegalPage({ title, updated, children }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-sm text-slate-400">Last updated {updated}</p>
      <div className="prose-legal mt-10 space-y-8">{children}</div>
    </div>
  )
}

export const LegalSection = ({ title, children }) => (
  <section>
    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
    <div className="mt-2.5 space-y-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
      {children}
    </div>
  </section>
)
