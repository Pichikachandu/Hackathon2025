import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Overview from './pages/Overview.jsx'
import Tasks from './pages/Tasks.jsx'
import InsightsPage from './pages/InsightsPage.jsx'
import Query from './pages/Query.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [dateRange, setDateRange] = useState('today')

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        onRefresh={() => setRefreshKey((k) => k + 1)}
        onChangeRange={(r) => { setDateRange(r); setRefreshKey((k) => k + 1) }}
        activeRange={dateRange}
      />
      <main className="p-4 lg:p-6">
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<Overview refreshKey={refreshKey} />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/insights" element={<InsightsPage refreshKey={refreshKey} />} />
          <Route path="/query" element={<Query />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
      <footer className="mt-auto p-4 text-xs text-neutral-500 border-t border-neutral-200/70 dark:border-neutral-800/70">
        Query bar coming soon...
      </footer>
    </div>
  )
}
