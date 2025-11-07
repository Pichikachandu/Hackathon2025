import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import ReactMarkdown from 'react-markdown'
import { generateInsights } from '../services/aiService'
import { Loader2 } from 'lucide-react'

const CARD = 'rounded-xl border border-neutral-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-900/70 backdrop-blur p-4 shadow-sm'

function Kpi({ title, value, meta, accent }) {
  return (
    <div className={`${CARD}`}>
      <div className="text-xs text-neutral-400">{title}</div>
      <div className={`mt-1 text-xl font-semibold bg-gradient-to-r ${accent} text-transparent bg-clip-text`}>{value}</div>
      {meta && <div className="mt-1 text-xs text-neutral-500">{meta}</div>}
    </div>
  )
}

function StatBox({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-neutral-800/60 p-3">
      <div className="text-[11px] text-neutral-400">{label}</div>
      <div className="mt-1 text-sm font-semibold text-neutral-100">{value}</div>
      {hint && <div className="text-[11px] text-neutral-500 mt-1">{hint}</div>}
    </div>
  )
}

function BarTrack({ label, percent, color }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-neutral-300">{label}</span>
        <span className="text-neutral-400">{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-neutral-800/70">
        <div className="h-2 rounded-full" style={{ width: `${percent}%`, background: color }} />
      </div>
    </div>
  )
}

export default function InsightsPage({ refreshKey }) {
  const [insight, setInsight] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState('');
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const CARD = 'rounded-xl border border-neutral-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-900/70 backdrop-blur p-4 shadow-sm';

  const processTasksForInsights = (tasksData) => {
    if (!tasksData || tasksData.length === 0) return {};
    
    // Calculate basic metrics
    const totalTasks = tasksData.length;
    const completedTasks = tasksData.filter(t => t.status && /done|complete|resolved/i.test(t.status)).length;
    const inProgressTasks = tasksData.filter(t => t.status && /in.?progress|in.?review|testing/i.test(t.status)).length;
    const blockedTasks = tasksData.filter(t => t.status && /blocked|waiting|on.?hold/i.test(t.status)).length;
    
    // Calculate completion rate
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Calculate priority distribution
    const priorities = {};
    tasksData.forEach(task => {
      const priority = task.priority || 'unassigned';
      priorities[priority] = (priorities[priority] || 0) + 1;
    });
    
    // Calculate project distribution
    const projects = {};
    tasksData.forEach(task => {
      const project = task.project || 'Uncategorized';
      projects[project] = (projects[project] || 0) + 1;
    });
    
    // Set the metrics state
    setMetrics({
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      completionRate,
      priorities,
      projects
    });
  };

  const generateAiInsights = async (tasksData) => {
    if (!tasksData || tasksData.length === 0) return;
    
    setIsGeneratingInsights(true);
    try {
      // Only send a subset of data to avoid hitting token limits
      const dataForAnalysis = tasksData.slice(0, 100).map(task => ({
        title: task.title,
        status: task.status,
        priority: task.priority,
        project: task.project,
        assignee: task.assignee,
        dueDate: task.dueDate || task.deadline || task['due_date']
      }));
      
      const insights = await generateInsights(dataForAnalysis);
      setAiInsights(insights);
    } catch (error) {
      console.error('Failed to generate insights:', error);
      setAiInsights('Failed to generate insights. Please try again later.');
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  useEffect(() => {
    try {
      const savedMetrics = localStorage.getItem('uploaded_metrics')
      const savedTasks = localStorage.getItem('uploaded_tasks')
      
      if (savedMetrics) {
        setMetrics(JSON.parse(savedMetrics))
      }
      
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks)
        setTasks(parsedTasks)
        processTasksForInsights(parsedTasks)
        generateAiInsights(parsedTasks);
      } else {
        setAiInsights('Upload task data to generate AI-powered insights.');
      }
      
      setLoading(false)
    } catch (e) {
      console.error('Error loading data:', e)
      setLoading(false)
    }
  }, [refreshKey])

  const trend = useMemo(() => {
    const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4']
    
    if (tasks.length === 0) {
      return weeks.map(week => ({
        name: week,
        alpha: 0,
        beta: 0,
        gamma: 0,
        yours: 0
      }))
    }
    
    // Group tasks by week
    const now = new Date()
    const weekData = Array(4).fill().map(() => ({
      completed: 0,
      inProgress: 0,
      blocked: 0
    }))
    
    tasks.forEach(task => {
      const taskDate = task.createdAt ? new Date(task.createdAt) : now
      const weekDiff = Math.floor((now - taskDate) / (7 * 24 * 60 * 60 * 1000))
      const weekIndex = Math.min(3, weekDiff) // Cap at week 4
      
      if (task.status && /done|complete|resolved/i.test(task.status)) {
        weekData[weekIndex].completed++
      } else if (task.status && /blocked|waiting|on.?hold/i.test(task.status)) {
        weekData[weekIndex].blocked++
      } else {
        weekData[weekIndex].inProgress++
      }
    })
    
    // Calculate productivity scores for each week
    return weeks.map((week, idx) => {
      const weekTasks = weekData[idx] || { completed: 0, inProgress: 0, blocked: 0 }
      const totalTasks = weekTasks.completed + weekTasks.inProgress + weekTasks.blocked
      
      // Simulate team performance (for demo purposes)
      const base = totalTasks > 0 
        ? Math.min(25, Math.max(10, Math.round(totalTasks * 2.5)))
        : 15 + idx
      
      return {
        name: week,
        alpha: Math.round(base + (Math.random() * 3 - 1.5)),
        beta: Math.round(base + 2 + (Math.random() * 3 - 1.5)),
        gamma: Math.round(base - 2 + (Math.random() * 3 - 1.5)),
        yours: base,
      }
    })
  }, [tasks])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">Insights</h1>
        <button
          onClick={() => tasks.length > 0 && generateAiInsights(tasks)}
          disabled={isGeneratingInsights || tasks.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium ${
            tasks.length === 0 
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {isGeneratingInsights ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            '⟳ Refresh Insights'
          )}
        </button>
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          <div className="sr-only">Loading...</div>
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-8 text-center text-neutral-500">
          <p>No data available. Please upload task data to see insights.</p>
        </div>
      ) : (
        <>
          {/* AI Insights Section */}
          {aiInsights && (
            <div className={`${CARD} mb-6`}>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI-Powered Insights
              </h2>
              <div className="prose dark:prose-invert prose-sm max-w-none">
                <ReactMarkdown>{aiInsights}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Kpi 
              title="Total Tasks" 
              value={tasks.length} 
              meta={`${tasks.filter(t => t.status && !/done|complete|resolved/i.test(t.status)).length} open, ${tasks.filter(t => t.status && /done|complete|resolved/i.test(t.status)).length} completed`} 
              accent="from-indigo-500 to-blue-500" 
            />
            <Kpi 
              title="Completion Rate" 
              value={`${tasks.length > 0 ? Math.round((tasks.filter(t => t.status && /done|complete|resolved/i.test(t.status)).length / tasks.length) * 100) : 0}%`} 
              meta={`${tasks.filter(t => t.status && /done|complete|resolved/i.test(t.status)).length} of ${tasks.length} tasks`} 
              accent="from-emerald-500 to-green-500" 
            />
            <Kpi 
              title="In Progress" 
              value={tasks.filter(t => t.status && /in.?progress|in.?review|testing/i.test(t.status)).length} 
              meta="Tasks currently being worked on" 
              accent="from-amber-500 to-orange-500" 
            />
            <Kpi 
              title="Blocked" 
              value={tasks.filter(t => t.status && /blocked|waiting|on.?hold/i.test(t.status)).length} 
              meta="Tasks needing attention" 
              accent="from-rose-500 to-pink-500" 
            />
          </div>
          
          {/* Predictive Performance Analysis */}
          <div className={`${CARD}`}>
            <div className="mb-3 text-sm text-neutral-300">Performance Analysis</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StatBox 
                label="Projected Completion" 
                value={loading ? '-' : `${Math.min(100, Math.round((tasks.filter(t => t.status && /done|complete|resolved/i.test(t.status)).length / Math.max(1, tasks.length)) * 1.5 * 100))}%`} 
              />
              <StatBox 
                label="Workload Distribution" 
                value={loading ? '-' : 
                  tasks.length === 0 ? 'No data' :
                  tasks.length < 10 ? 'Light' :
                  tasks.length < 30 ? 'Moderate' : 'Heavy'} 
                hint={loading ? 'Loading...' : `${tasks.length} total tasks`} 
              />
              <StatBox 
                label="Risk Level" 
                value={loading ? '-' : 
                  tasks.length === 0 ? 'N/A' :
                  tasks.filter(t => t.status && /blocked|waiting|on.?hold/i.test(t.status)).length > tasks.length * 0.3 ? 'High' :
                  tasks.filter(t => t.status && /blocked|waiting|on.?hold/i.test(t.status)).length > tasks.length * 0.1 ? 'Medium' : 'Low'} 
                hint={loading ? 'Loading...' : 
                  tasks.length === 0 ? 'No tasks' :
                  `${tasks.filter(t => t.status && /blocked|waiting|on.?hold/i.test(t.status)).length} blocked tasks`} 
              />
            </div>
            <div className="mt-4">
              <BarTrack 
                label="Task Completion Progress" 
                percent={loading ? 0 : Math.round((tasks.filter(t => t.status && /done|complete|resolved/i.test(t.status)).length / Math.max(1, tasks.length)) * 100)} 
                color="#22c55e" 
              />
            </div>
          </div>

          {/* Team Benchmarking */}
          <div className={`${CARD} border-l-4 border-l-emerald-500/70`}>
            <div className="text-sm font-medium text-neutral-100 mb-3">Team Benchmarking</div>
            <div className="rounded-lg border border-neutral-800/60 p-3">
              <div className="mb-2 text-xs text-neutral-400">4-Week Productivity Trends</div>
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="alpha" stroke="#a855f7" fill="url(#g1)" name="Alpha Team" />
                    <Line type="monotone" dataKey="beta" stroke="#22c55e" dot={true} name="Beta Team" />
                    <Line type="monotone" dataKey="gamma" stroke="#f59e0b" dot={true} name="Gamma Team" />
                    <Line type="monotone" dataKey="yours" stroke="#60a5fa" dot={true} name="Your Team" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Team cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-sm">
                <StatBox label="Your Team" value={<div className="flex items-center gap-4"><div>174<br/><span className="text-[11px] text-neutral-400">Tasks</span></div><div>82%<br/><span className="text-[11px] text-neutral-400">Velocity</span></div></div>} />
                <StatBox label="Alpha Team" value={<div className="flex items-center gap-4"><div>138<br/><span className="text-[11px] text-neutral-400">Tasks</span></div><div>91%<br/><span className="text-[11px] text-neutral-400">Velocity</span></div></div>} />
                <StatBox label="Beta Team" value={<div className="flex items-center gap-4"><div>152<br/><span className="text-[11px] text-neutral-400">Tasks</span></div><div>86%<br/><span className="text-[11px] text-neutral-400">Velocity</span></div></div>} />
                <StatBox label="Gamma Team" value={<div className="flex items-center gap-4"><div>129<br/><span className="text-[11px] text-neutral-400">Tasks</span></div><div>80%<br/><span className="text-[11px] text-neutral-400">Velocity</span></div></div>} />
              </div>
            </div>

            <div className="mt-3 text-xs text-neutral-300 rounded-lg border border-neutral-800/60 p-3 bg-neutral-950/40">
              <span className="text-emerald-400">Benchmarking Insights:</span> Your team leads in stable velocity. Velocity increased 21% week-over-week. Backlog reduced 13%. On-time delivery at 92%.
            </div>
          </div>

          {/* Task Status Distribution */}
          <div className={`${CARD}`}>
            <div className="text-sm font-medium text-neutral-100 mb-3">Task Status Distribution</div>
            <div className="space-y-4">
              <BarTrack 
                label="Completed" 
                percent={loading ? 0 : Math.round((tasks.filter(t => t.status && /done|complete|resolved/i.test(t.status)).length / Math.max(1, tasks.length)) * 100)} 
                color="#22c55e" 
              />
              <BarTrack 
                label="In Progress" 
                percent={loading ? 0 : Math.round((tasks.filter(t => t.status && /in.?progress|in.?review|testing/i.test(t.status)).length / Math.max(1, tasks.length)) * 100)} 
                color="#f59e0b" 
              />
              <BarTrack 
                label="Blocked" 
                percent={loading ? 0 : Math.round((tasks.filter(t => t.status && /blocked|waiting|on.?hold/i.test(t.status)).length / Math.max(1, tasks.length)) * 100)} 
                color="#ef4444" 
              />
            </div>
            <div className="mt-3 text-xs text-neutral-400">
              {loading ? 'Loading insights...' : 
               tasks.length === 0 ? 'No task data available. Please upload an Excel/CSV file on the Tasks page to get started.' :
               `Total tasks: ${tasks.length} | Completed: ${tasks.filter(t => t.status && /done|complete|resolved/i.test(t.status)).length} | In Progress: ${tasks.filter(t => t.status && /in.?progress|in.?review|testing/i.test(t.status)).length} | Blocked: ${tasks.filter(t => t.status && /blocked|waiting|on.?hold/i.test(t.status)).length}`}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
