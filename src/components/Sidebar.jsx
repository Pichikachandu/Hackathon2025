import { Link } from 'react-router-dom'
export default function Sidebar({ onNavigate }) {
  const items = [
    { label: 'Overview', path: '/overview' },
    { label: 'Tasks', path: '/tasks' },
    { label: 'All Insights', path: '/insights' },
    { label: 'Query', path: '/query' },
    { label: 'Settings', path: '/settings' },
  ]
  return (
    <div className="h-full flex flex-col">
      <div className="text-lg font-semibold mb-4 bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">Pulsevo</div>
      <nav className="space-y-1 text-sm">
        {items.map((it) => (
          <Link
            key={it.path}
            to={it.path}
            onClick={onNavigate}
            className="block rounded-md px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            {it.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto text-xs text-neutral-500">v0.1.0</div>
    </div>
  )
}
