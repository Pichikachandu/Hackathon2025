import { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Line, Legend, BarChart, Bar } from 'recharts'

const CARD_CLASSES = 'rounded-xl border border-neutral-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-900/70 backdrop-blur p-4 shadow-sm'

function MetricCard({ title, value, delta, accent }) {
  return (
    <div className={`${CARD_CLASSES}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-neutral-500">{title}</div>
          <div className={`mt-2 text-2xl font-semibold bg-gradient-to-r ${accent} text-transparent bg-clip-text`}>{value}</div>
        </div>
        {delta && (
          <div className="text-xs rounded-md px-2 py-1 bg-neutral-100/60 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-800/60">
            {delta}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Overview({ refreshKey }) {
  const [metrics, setMetrics] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  function loadData() {
    try {
      setLoading(true)
      const savedMetrics = localStorage.getItem('uploaded_metrics')
      const savedTasks = localStorage.getItem('uploaded_tasks')
      
      if (savedMetrics) {
        setMetrics(JSON.parse(savedMetrics))
      }
      
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks))
      }
    } catch (e) {
      console.error('Error loading overview data:', e)
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

  const derived = useMemo(() => {
    if (!tasks.length) {
      return {
        open: 0,
        inProgress: 0,
        closedToday: 0,
        closedThisHour: 0,
        completion: 0
      }
    }
    
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    const completedTasks = tasks.filter(t => 
      t.status && /done|complete|resolved/i.test(t.status)
    )
    
    const inProgressTasks = tasks.filter(t => 
      t.status && /in.?progress|in.?review|testing/i.test(t.status)
    )
    
    const closedTodayCount = completedTasks.filter(t => {
      if (!t.completedAt) return false
      const taskDate = new Date(t.completedAt)
      return taskDate >= today
    }).length
    
    const completionRate = tasks.length > 0 
      ? Math.round((completedTasks.length / tasks.length) * 100) 
      : 0
    
    return {
      open: tasks.length - completedTasks.length,
      inProgress: inProgressTasks.length,
      completed: completedTasks.length,
      closedToday: closedTodayCount,
      closedThisHour: Math.max(0, Math.round(closedTodayCount * 0.1)),
      completion: completionRate
    }
  }, [tasks])

  const donutData = useMemo(() => {
    if (tasks.length === 0) {
      return [
        { name: 'No Data', value: 1, color: '#6b7280' }
      ]
    }
    
    const completedTasks = tasks.filter(t => 
      t.status && /done|complete|resolved/i.test(t.status)
    )
    
    const inProgressTasks = tasks.filter(t => 
      t.status && /in.?progress|in.?review|testing/i.test(t.status)
    )
    
    const blockedTasks = tasks.filter(t => 
      t.status && /blocked|waiting|on.?hold/i.test(t.status)
    )
    
    const openTasks = tasks.length - completedTasks.length - inProgressTasks.length - blockedTasks.length
    
    return [
      { name: 'Open', value: Math.max(openTasks, 0), color: '#8b5cf6' },
      { name: 'In Progress', value: inProgressTasks.length, color: '#60a5fa' },
      { name: 'Completed', value: completedTasks.length, color: '#f59e0b' },
      { name: 'Blocked', value: blockedTasks.length, color: '#a855f7' },
    ].filter(item => item.value > 0)
  }, [tasks])

  const trendData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    
    // If no tasks, return empty data
    if (tasks.length === 0) {
      return days.map(day => ({
        name: day,
        completed: 0,
        created: 0,
        inProgress: 0
      }))
    }
    
    // Group tasks by day of week
    const now = new Date()
    const dayData = Array(7).fill().map(() => ({
      completed: 0,
      created: 0,
      inProgress: 0
    }))
    
    tasks.forEach(task => {
      const taskDate = task.createdAt ? new Date(task.createdAt) : now
      const dayOfWeek = taskDate.getDay() // 0 = Sunday, 1 = Monday, etc.
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Convert to 0-6 where 0 is Monday
      
      // Count created tasks
      dayData[adjustedDay].created++
      
      // Count completed tasks
      if (task.status && /done|complete|resolved/i.test(task.status)) {
        dayData[adjustedDay].completed++
      }
      
      // Count in-progress tasks
      if (task.status && /in.?progress|in.?review|testing/i.test(task.status)) {
        dayData[adjustedDay].inProgress++
      }
    })
    
    return days.map((day, idx) => ({
      name: day,
      completed: dayData[idx]?.completed || 0,
      created: dayData[idx]?.created || 0,
      inProgress: dayData[idx]?.inProgress || 0
    }))
  }, [tasks])

  const teamData = useMemo(() => {
    if (tasks.length === 0) {
      return [
        { name: 'No Data', completed: 0, progress: 0, open: 0 }
      ]
    }
    
    // Group tasks by assignee
    const assigneeStats = {}
    
    tasks.forEach(task => {
      const assignee = task.assignee || 'Unassigned'
      
      if (!assigneeStats[assignee]) {
        assigneeStats[assignee] = {
          completed: 0,
          progress: 0,
          open: 0
        }
      }
      
      if (task.status && /done|complete|resolved/i.test(task.status)) {
        assigneeStats[assignee].completed++
      } else if (task.status && /in.?progress|in.?review|testing/i.test(task.status)) {
        assigneeStats[assignee].progress++
      } else {
        assigneeStats[assignee].open++
      }
    })
    
    // Convert to array and sort by total tasks
    return Object.entries(assigneeStats)
      .map(([name, stats]) => ({
        name: name.length > 10 ? name.substring(0, 10) + '...' : name,
        ...stats
      }))
      .sort((a, b) => (b.completed + b.progress + b.open) - (a.completed + a.progress + a.open))
      .slice(0, 5) // Top 5 assignees
  }, [tasks])

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <MetricCard 
          title="Open Tasks" 
          value={loading ? '-' : derived.open} 
          delta={derived.open > 0 ? <span className="text-rose-400">{Math.round((derived.open / tasks.length) * 100)}% of total</span> : null} 
          accent="from-sky-400 to-indigo-400" 
        />
        <MetricCard 
          title="In Progress" 
          value={loading ? '-' : derived.inProgress} 
          delta={derived.inProgress > 0 ? <span className="text-green-400">{Math.round((derived.inProgress / tasks.length) * 100)}% of total</span> : null} 
          accent="from-violet-400 to-fuchsia-400" 
        />
        <MetricCard 
          title="Completed" 
          value={loading ? '-' : derived.completed} 
          delta={<span className="text-green-400">{derived.completion}% of total</span>} 
          accent="from-emerald-400 to-teal-400" 
        />
        <MetricCard 
          title="Closed Today" 
          value={loading ? '-' : derived.closedToday} 
          delta={derived.closedToday > 0 ? <span className="text-sky-400">{Math.round((derived.closedToday / derived.completed) * 100)}% of completed</span> : null} 
          accent="from-sky-400 to-cyan-400" 
        />
        <MetricCard 
          title="Completion Rate" 
          value={loading ? '-' : `${derived.completion}%`} 
          delta={derived.completion > 0 ? <span className="text-green-400">{Math.round((derived.completed / tasks.length) * 100)}% of total</span> : null} 
          accent="from-green-400 to-emerald-400" 
        />
      </div>
      
      {!loading && tasks.length === 0 && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-yellow-700 dark:text-yellow-400">
            No task data available. Please upload an Excel/CSV file on the Tasks page to get started.
          </p>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`${CARD_CLASSES}`}>
          <div className="mb-3 text-sm text-neutral-400">Task Distribution (100)</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={1}>
                  {donutData.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`${CARD_CLASSES}`}>
          <div className="mb-3 text-sm text-neutral-400">7-Day Trend Analysis</div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="completed" stroke="#22c55e" fill="url(#grad1)" strokeWidth={2} name="Tasks Completed" />
                <Line type="monotone" dataKey="created" stroke="#38bdf8" strokeWidth={2} dot={true} name="Tasks Created" />
                <Line type="monotone" dataKey="inProgress" stroke="#8b5cf6" strokeWidth={2} dot={true} name="Tasks In Progress" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3 text-xs text-neutral-400">
            <div><span className="text-emerald-400">Avg. Daily Completion</span><br/><span className="text-white/90 dark:text-white">2.4 tasks</span></div>
            <div><span className="text-sky-400">Avg. Daily Creation</span><br/><span className="text-white/90 dark:text-white">4.1 tasks</span></div>
            <div><span className="text-violet-400">Avg. In Progress</span><br/><span className="text-white/90 dark:text-white">7.8 tasks</span></div>
          </div>
        </div>
      </div>

      {/* Team Performance */}
      <div className={`${CARD_CLASSES}`}>
        <div className="mb-3 text-sm text-neutral-400">Team Performance</div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={teamData}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#22c55e" name="Completed" radius={[6,6,0,0]} />
              <Bar dataKey="progress" fill="#60a5fa" name="In Progress" radius={[6,6,0,0]} />
              <Bar dataKey="open" fill="#8b5cf6" name="Open" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
