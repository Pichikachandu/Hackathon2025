import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function Charts({ data, loading }) {
  return (
    <div className="rounded-xl border border-neutral-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-900/70 backdrop-blur p-4 shadow-sm">
      <div className="mb-3 text-sm text-neutral-500">7-day Issues Trend</div>
      {loading ? (
        <div className="h-56 animate-pulse rounded-md bg-neutral-200/70 dark:bg-neutral-800/70" />
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="open" stroke="#6366f1" strokeWidth={2} dot={false} name="Open" />
              <Line type="monotone" dataKey="closed" stroke="#10b981" strokeWidth={2} dot={false} name="Closed" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
