export default function Cards({ metrics, loading }) {
  const items = [
    { label: 'Open Issues', value: metrics?.open ?? '-', color: 'from-amber-500 to-orange-500' },
    { label: 'Closed Today', value: metrics?.closedToday ?? '-', color: 'from-emerald-500 to-teal-500' },
    { label: 'Completion %', value: metrics?.completion != null ? `${metrics.completion}%` : '-', color: 'from-indigo-500 to-violet-500' },
  ]
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl border border-neutral-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-900/70 backdrop-blur p-4 shadow-sm">
          <div className="text-sm text-neutral-500">{it.label}</div>
          {loading ? (
            <div className="mt-3 h-8 w-24 animate-pulse rounded bg-neutral-200/70 dark:bg-neutral-800/70" />
          ) : (
            <div className={`mt-2 text-3xl font-semibold bg-gradient-to-r ${it.color} text-transparent bg-clip-text`}>{it.value}</div>
          )}
        </div>
      ))}
    </div>
  )
}
