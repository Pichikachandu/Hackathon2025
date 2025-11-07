import { useEffect, useMemo, useState } from 'react'
import Cards from '../components/Cards.jsx'
import Charts from '../components/Charts.jsx'
import AIInsights from '../components/AIInsights.jsx'

export default function Dashboard({ refreshKey }) {
  const [metrics, setMetrics] = useState(null)
  const [insight, setInsight] = useState('')
  const [loading, setLoading] = useState(true)

  function loadData() {
    try {
      setLoading(true)
      const savedMetrics = localStorage.getItem('uploaded_metrics')
      const savedTasks = localStorage.getItem('uploaded_tasks')
      
      if (savedMetrics) {
        const m = JSON.parse(savedMetrics)
        setMetrics(m)
        
        // Generate insight based on metrics
        if (savedTasks) {
          const tasks = JSON.parse(savedTasks)
          const completed = tasks.filter(t => 
            t.status && /done|complete|resolved/i.test(t.status)
          ).length
          const total = tasks.length
          const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0
          
          setInsight(`Your team has completed ${completed} out of ${total} tasks (${completionRate}% completion rate). ` +
                    `There are currently ${m?.open || 0} open tasks.`)
        }
      }
    } catch (e) {
      console.error('Error loading dashboard data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    
    // React to uploads immediately (same-tab and cross-tab)
    function onCustom() { loadData() }
    function onStorage(e) {
      if (!e || e.key === 'uploaded_metrics' || e.key === 'uploaded_tasks') {
        loadData()
      }
    }
    
    window.addEventListener('uploaded_metrics_changed', onCustom)
    window.addEventListener('storage', onStorage)
    
    return () => {
      window.removeEventListener('uploaded_metrics_changed', onCustom)
      window.removeEventListener('storage', onStorage)
    }
  }, [refreshKey])

  const chartData = useMemo(() => {
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    
    // Generate some sample trend data if not available
    const trend = metrics?.trend || Array(7).fill(0).map(() => Math.floor(Math.random() * 10) + 5)
    
    return days.map((day, idx) => {
      const open = trend[idx % trend.length] || 0
      return {
        name: day,
        open: open,
        closed: Math.max(0, open - Math.floor(Math.random() * 3)),
      }
    })
  }, [metrics])

  return (
    <div className="space-y-4">
      <Cards metrics={metrics} loading={loading} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Charts data={chartData} loading={loading} />
        </div>
        <AIInsights text={insight} loading={loading} />
      </div>
      
      {!loading && !metrics && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-yellow-700 dark:text-yellow-400">
            No data available. Please upload an Excel/CSV file on the Tasks page to get started.
          </p>
        </div>
      )}
    </div>
  )
}
