export default function AIInsights({ text, loading }) {
  return (
    <div className="rounded-xl border border-neutral-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-900/70 backdrop-blur p-4 shadow-sm">
      <div className="mb-2 text-sm text-neutral-500">AI Insights</div>
      {loading ? (
        <>
          <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-200/70 dark:bg-neutral-800/70" />
          <div className="mt-2 h-4 w-3/5 animate-pulse rounded bg-neutral-200/70 dark:bg-neutral-800/70" />
        </>
      ) : (
        <p className="text-sm leading-6 text-neutral-700 dark:text-neutral-300">{text}</p>
      )}
    </div>
  )
}
