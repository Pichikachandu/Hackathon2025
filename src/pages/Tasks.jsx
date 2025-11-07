import { useMemo, useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts'
import { format, parseISO, isWithinInterval } from 'date-fns'

const CARD = 'rounded-xl border border-neutral-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-900/70 backdrop-blur p-4 shadow-sm'

// Color scheme for charts
const COLORS = {
  'API Services': '#a855f7',
  'Mobile App': '#60a5fa',
  'Web Platform': '#f59e0b',
  'Backend': '#10b981',
  'Frontend': '#f43f5e',
  'Design': '#8b5cf6',
  'Other': '#6b7280'
}

// Default empty data structures
const DEFAULT_USERS = []
const DEFAULT_PROJECT_DONUT = []
const DEFAULT_OPEN_ISSUES = []

function Badge({ text, color }) {
  return (
    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${color || 'bg-neutral-800 text-neutral-200'}`}>{text}</span>
  )
}

function Trend({ value }) {
  const up = value > 0
  const neutral = value === 0
  const cls = up ? 'text-emerald-400' : neutral ? 'text-neutral-400' : 'text-rose-400'
  return (
    <div className={`flex items-center gap-1 ${cls}`}>
      {neutral ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>
      ) : up ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 14l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 10l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      )}
      <span className="tabular-nums">{Math.abs(value).toFixed(1)}%</span>
    </div>
  )
}

export default function Tasks() {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showFilters, setShowFilters] = useState(false)
  
  // Filter states
  const [filters, setFilters] = useState({
    project: '',
    status: '',
    assignee: '',
    dateRange: { start: null, end: null }
  })

  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState('')
  const [uploadedTasks, setUploadedTasks] = useState([])
  const [users, setUsers] = useState(DEFAULT_USERS)
  const [projectDonut, setProjectDonut] = useState(DEFAULT_PROJECT_DONUT)
  const [openIssues, setOpenIssues] = useState(DEFAULT_OPEN_ISSUES)

  function normalizeHeader(h) {
    return String(h || '')
      .toLowerCase()
      .replace(/\s+/g, '_')
  }

  function detectBool(v) {
    if (typeof v === 'boolean') return v
    if (v == null) return false
    const s = String(v).toLowerCase()
    return ['true', 'yes', 'y', '1', 'done', 'completed', 'closed'].includes(s)
  }

  function parseDate(d) {
    if (!d) return null
    if (d instanceof Date && !isNaN(d)) return d
    const t = Date.parse(d)
    return isNaN(t) ? null : new Date(t)
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  }

  function computeMetrics(rows) {
    const today = new Date()
    const total = rows.length
    let completed = 0
    let closedToday = 0

    const last7 = Array(7).fill(0)
    for (const r of rows) {
      // try multiple field names for status/completion
      const status = (r.status || r.state || r.stage || r.progress || '').toString().toLowerCase()
      const isDone = detectBool(r.completed) || /done|closed|complete|resolved/.test(status)
      const compDate = parseDate(r.completed_date || r.closed_at || r.done_at || r.updated || r.date)
      if (isDone) {
        completed += 1
        if (compDate && sameDay(compDate, today)) closedToday += 1
        if (compDate) {
          const diffDays = Math.floor((today - compDate) / (1000 * 60 * 60 * 24))
          if (diffDays >= 0 && diffDays < 7) last7[6 - diffDays] += 1
        }
      }
    }
    const open = Math.max(0, total - completed)
    const completion = total ? Math.round((completed / total) * 100) : 0
    return { open, closedToday, completion, trend: last7 }
  }

  // Process tasks and update all data visualizations
  const processTasks = (tasks) => {
    if (!tasks || tasks.length === 0) {
      setUsers(DEFAULT_USERS)
      setProjectDonut(DEFAULT_PROJECT_DONUT)
      setOpenIssues(DEFAULT_OPEN_ISSUES)
      return
    }

    // Process tasks by assignee
    const userStats = {}
    const projectStats = {}
    const openIssuesStats = {}

    tasks.forEach(task => {
      const assignee = task.assignee || 'Unassigned'
      const project = task.project || 'Other'
      const status = (task.status || '').toLowerCase()
      const isCompleted = detectBool(task.completed) || /done|closed|complete|resolved/.test(status)
      
      // Initialize user stats
      if (!userStats[assignee]) {
        const initials = assignee.split(' ').map(n => n[0]).join('').toUpperCase()
        userStats[assignee] = {
          name: assignee,
          initials: initials.substring(0, 2),
          assigned: 0,
          completed: 0,
          ongoing: 0,
          trend: 0
        }
      }

      // Initialize project stats
      if (!projectStats[project]) {
        projectStats[project] = 0
      }
      if (!openIssuesStats[project]) {
        openIssuesStats[project] = 0
      }

      // Update counts
      userStats[assignee].assigned++
      projectStats[project]++
      
      if (isCompleted) {
        userStats[assignee].completed++
      } else if (status.includes('progress')) {
        userStats[assignee].ongoing++
        openIssuesStats[project]++
      } else {
        openIssuesStats[project]++
      }
    })

    // Calculate trends (simple implementation - can be enhanced)
    Object.values(userStats).forEach(user => {
      if (user.assigned > 0) {
        user.trend = Math.round((user.completed / user.assigned) * 100)
      }
    })

    // Convert to arrays for rendering
    const userList = Object.values(userStats)
    const projectDonutData = Object.entries(projectStats).map(([name, value]) => ({
      name,
      value,
      color: COLORS[name] || COLORS['Other']
    }))
    
    const openIssuesData = Object.entries(openIssuesStats).map(([name, value]) => ({
      name,
      value,
      color: COLORS[name] || COLORS['Other']
    }))

    // Update state
    setUsers(userList)
    setProjectDonut(projectDonutData)
    setOpenIssues(openIssuesData)
  }

  // Load tasks from localStorage on component mount
  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem('uploaded_tasks')
      if (savedTasks) {
        const tasks = JSON.parse(savedTasks)
        setUploadedTasks(tasks)
        processTasks(tasks)
      }
    } catch (e) {
      console.error('Error loading saved tasks:', e)
    }
  }, [])

  // Handle file upload
  async function handleUpload(file) {
    setUploading(true)
    setUploadMsg('')
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array' })
      const sheetName = wb.SheetNames[0]
      const sheet = wb.Sheets[sheetName]
      let rows = XLSX.utils.sheet_to_json(sheet, { defval: null })
      
      // Normalize keys
      const tasks = rows.map((r) => {
        const o = {}
        Object.keys(r).forEach((k) => {
          o[normalizeHeader(k)] = r[k]
        })
        return o
      })

      // Calculate metrics
      const metrics = computeMetrics(tasks)
      
      // Save to state and localStorage
      setUploadedTasks(tasks)
      localStorage.setItem('uploaded_tasks', JSON.stringify(tasks))
      localStorage.setItem('uploaded_metrics', JSON.stringify(metrics))
      
      // Process tasks for visualization
      processTasks(tasks)
      
      setUploadMsg(`Uploaded ${tasks.length} tasks. Open: ${metrics.open}, Completed: ${metrics.completed}, Closed today: ${metrics.closedToday}.`)
    } catch (e) {
      console.error(e)
      setUploadMsg('Failed to parse file. Please ensure it is a valid Excel/CSV file.')
    } finally {
      setUploading(false)
      try {
        localStorage.setItem('uploaded_at', String(Date.now()))
        window.dispatchEvent(new CustomEvent('uploaded_metrics_changed'))
      } catch (e) {
        console.error('Error updating storage:', e)
      }
    }
  }

  // Get unique values for filter dropdowns
  const uniqueProjects = useMemo(() => 
    [...new Set(uploadedTasks.map(t => t.project).filter(Boolean))], 
    [uploadedTasks]
  )

  const uniqueStatuses = useMemo(() => 
    [...new Set(uploadedTasks.map(t => t.status).filter(Boolean))], 
    [uploadedTasks]
  )

  const uniqueAssignees = useMemo(() => 
    [...new Set(uploadedTasks.map(t => t.assignee).filter(Boolean))], 
    [uploadedTasks]
  )

  // Filter tasks based on all active filters
  const filteredTasks = useMemo(() => {
    if (!uploadedTasks || uploadedTasks.length === 0) return [];
    
    return uploadedTasks.filter(task => {
      if (!task) return false;
      
      // Text search - search in multiple fields
      const searchTerm = query.toLowerCase();
      const matchesSearch = !searchTerm || 
        (task.title && task.title.toLowerCase().includes(searchTerm)) ||
        (task.description && task.description.toLowerCase().includes(searchTerm)) ||
        (task.id && task.id.toString().includes(searchTerm)) ||
        (task.project && task.project.toLowerCase().includes(searchTerm)) ||
        (task.assignee && task.assignee.toLowerCase().includes(searchTerm)) ||
        (task.status && task.status.toLowerCase().includes(searchTerm));
      
      // Project filter - case insensitive partial match
      const matchesProject = !filters.project || 
        (task.project && task.project.toLowerCase().includes(filters.project.toLowerCase()));
      
      // Status filter - case insensitive exact match
      const matchesStatus = !filters.status || 
        (task.status && task.status.toLowerCase() === filters.status.toLowerCase());
      
      // Assignee filter - case insensitive exact match
      const matchesAssignee = !filters.assignee || 
        (task.assignee && task.assignee.toLowerCase() === filters.assignee.toLowerCase());
      
      // Date range filter
      const taskDate = task.dueDate || task.deadline || task['due_date'] || task.createdAt || task.date;
      let matchesDateRange = true;
      
      if (filters.dateRange.start && filters.dateRange.end) {
        if (!taskDate) {
          // If task has no date and we have a date range filter, exclude it
          matchesDateRange = false;
        } else {
          try {
            const startDate = new Date(filters.dateRange.start);
            const endDate = new Date(filters.dateRange.end);
            // Set end of day for end date
            endDate.setHours(23, 59, 59, 999);
            
            const taskDateTime = new Date(taskDate);
            // Handle invalid dates
            if (isNaN(taskDateTime.getTime())) {
              matchesDateRange = false;
            } else {
              matchesDateRange = taskDateTime >= startDate && taskDateTime <= endDate;
            }
          } catch (e) {
            console.error('Error parsing date:', e);
            matchesDateRange = false;
          }
        }
      }
      
      return matchesSearch && matchesProject && matchesStatus && 
             matchesAssignee && matchesDateRange;
    });
  }, [uploadedTasks, query, filters]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / itemsPerPage));
  const pageData = filteredTasks.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );
  
  // Reset to first page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters, query, itemsPerPage]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      project: '',
      status: '',
      assignee: '',
      dateRange: { start: null, end: null }
    });
    setQuery('');
  };

  return (
    <div className="space-y-4">
      {/* Upload data */}
      <div className={`${CARD}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm font-medium">Upload Tasks (Excel/CSV) for Real-time Dashboard</div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 rounded-md border border-neutral-200/70 dark:border-neutral-800/70 px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleUpload(f)
                }}
              />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 12l-4-4m4 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              {uploading ? 'Uploading...' : 'Choose File'}
            </label>
            {uploadMsg && <span className="text-xs text-neutral-500">{uploadMsg}</span>}
          </div>
        </div>
        <div className="mt-2 text-xs text-neutral-500">After upload, use the Refresh button in the navbar to update the Overview and Insights.</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Task Management Table */}
        <div className="lg:col-span-8">
          {uploadedTasks.length === 0 ? (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-yellow-700 dark:text-yellow-400">
                No task data available. Please upload an Excel/CSV file to get started.
              </p>
            </div>
          ) : (
            <div className={`${CARD} mb-4`}>
              <div className="flex flex-col gap-4">
                {/* Search and Filter Bar */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search tasks..."
                      className="h-9 w-full rounded-md text-sm px-9 border focus:outline-none focus:ring-2 ring-indigo-500/30 bg-white/70 border-neutral-200/70 text-neutral-900 placeholder:text-neutral-500 dark:bg-neutral-900/50 dark:border-neutral-800/70 dark:text-neutral-100"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                        <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </span>
                  </div>
                  
                  <button 
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-neutral-200/70 hover:bg-neutral-100 dark:border-neutral-800/70 dark:hover:bg-neutral-800/60"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M4 6h16M4 12h16M4 18h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </button>
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                  <div className="w-full p-4 bg-neutral-50 dark:bg-neutral-900/40 rounded-lg space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Project Filter */}
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Project</label>
                        <select
                          value={filters.project}
                          onChange={(e) => setFilters({...filters, project: e.target.value})}
                          className="w-full h-9 rounded-md text-sm px-3 border bg-white/70 border-neutral-200/70 text-neutral-900 dark:bg-neutral-900/50 dark:border-neutral-800/70 dark:text-neutral-100"
                        >
                          <option value="">All Projects</option>
                          {uniqueProjects.map(project => (
                            <option key={project} value={project}>{project}</option>
                          ))}
                        </select>
                      </div>

                      {/* Status Filter */}
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Status</label>
                        <select
                          value={filters.status}
                          onChange={(e) => setFilters({...filters, status: e.target.value})}
                          className="w-full h-9 rounded-md text-sm px-3 border bg-white/70 border-neutral-200/70 text-neutral-900 dark:bg-neutral-900/50 dark:border-neutral-800/70 dark:text-neutral-100"
                        >
                          <option value="">All Statuses</option>
                          {uniqueStatuses.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>

                      {/* Assignee Filter */}
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Assignee</label>
                        <select
                          value={filters.assignee}
                          onChange={(e) => setFilters({...filters, assignee: e.target.value})}
                          className="w-full h-9 rounded-md text-sm px-3 border bg-white/70 border-neutral-200/70 text-neutral-900 dark:bg-neutral-900/50 dark:border-neutral-800/70 dark:text-neutral-100"
                        >
                          <option value="">All Assignees</option>
                          {uniqueAssignees.map(assignee => (
                            <option key={assignee} value={assignee}>{assignee}</option>
                          ))}
                        </select>
                      </div>

                      {/* Date Range Filter */}
                      <div>
                        <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">Date Range</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={filters.dateRange.start || ''}
                            onChange={(e) => setFilters({...filters, dateRange: {...filters.dateRange, start: e.target.value}})}
                            className="flex-1 h-9 rounded-md text-sm px-3 border bg-white/70 border-neutral-200/70 text-neutral-900 dark:bg-neutral-900/50 dark:border-neutral-800/70 dark:text-neutral-100"
                          />
                          <span className="flex items-center">to</span>
                          <input
                            type="date"
                            value={filters.dateRange.end || ''}
                            onChange={(e) => setFilters({...filters, dateRange: {...filters.dateRange, end: e.target.value}})}
                            className="flex-1 h-9 rounded-md text-sm px-3 border bg-white/70 border-neutral-200/70 text-neutral-900 dark:bg-neutral-900/50 dark:border-neutral-800/70 dark:text-neutral-100"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-sm text-neutral-500">
                        {filteredTasks.length} tasks found
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={clearFilters}
                          className="text-sm px-3 py-1.5 rounded-md border border-neutral-200/70 hover:bg-neutral-100 dark:border-neutral-800/70 dark:hover:bg-neutral-800/60"
                        >
                          Clear Filters
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Items per page selector */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-neutral-500">
                    Showing {Math.min((page - 1) * itemsPerPage + 1, filteredTasks.length)} to {Math.min(page * itemsPerPage, filteredTasks.length)} of {filteredTasks.length} tasks
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-neutral-500">Items per page:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="h-8 text-sm rounded-md border border-neutral-200/70 bg-white/70 dark:bg-neutral-900/50 dark:border-neutral-800/70"
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Task Table */}
          <div className={`${CARD}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">Task Management</div>
            </div>

            <div className="overflow-auto w-full rounded-lg border border-neutral-200/70 dark:border-neutral-800/60">
              {pageData.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">
                  <p>No tasks found matching your filters.</p>
                  <button 
                    onClick={clearFilters}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-neutral-50 text-neutral-600 dark:bg-neutral-900/60 dark:text-neutral-400">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Task</th>
                      <th className="text-left px-4 py-3 font-medium">Project</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium">Assignee</th>
                      <th className="text-left px-4 py-3 font-medium">Due Date</th>
                      <th className="text-right px-4 py-3 font-medium">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/70 dark:divide-neutral-800/60">
                    {pageData.map((task, i) => {
                      const dueDate = task.dueDate || task.deadline || task['due_date'];
                      const priority = task.priority || 'Medium';
                      const priorityColors = {
                        'High': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                        'Medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
                        'Low': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                      };
                      const statusColors = {
                        'Done': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
                        'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
                        'To Do': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
                        'Blocked': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
                        'Review': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
                      };
                      
                      return (
                        <tr 
                          key={`${task.id || i}-${task.title}`} 
                          className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-neutral-900 dark:text-neutral-100">
                              {task.title || 'Untitled Task'}
                            </div>
                            {task.description && (
                              <div className="text-xs text-neutral-500 line-clamp-1">
                                {task.description}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                              {task.project || 'No Project'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              statusColors[task.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                            }`}>
                              {task.status || 'Not Set'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              {task.assignee ? (
                                <>
                                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-medium text-indigo-700 dark:text-indigo-300">
                                    {task.assignee.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                                  </div>
                                  <div className="ml-2 text-sm text-neutral-700 dark:text-neutral-300">
                                    {task.assignee}
                                  </div>
                                </>
                              ) : (
                                <span className="text-xs text-neutral-500">Unassigned</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-neutral-700 dark:text-neutral-300">
                            {dueDate ? new Date(dueDate).toLocaleDateString() : 'No due date'}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                priorityColors[priority] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                              }`}>
                                {priority}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-neutral-500">
                Page {page} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="h-8 w-8 rounded-md border border-neutral-200/70 hover:bg-neutral-100 dark:border-neutral-800/70 dark:hover:bg-neutral-800/60 disabled:opacity-50"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  «
                </button>
                <button
                  className="h-8 w-8 rounded-md border border-neutral-200/70 hover:bg-neutral-100 dark:border-neutral-800/70 dark:hover:bg-neutral-800/60 disabled:opacity-50"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ‹
                </button>
                <span className="h-8 min-w-8 inline-flex items-center justify-center rounded-md border border-neutral-200/70 bg-neutral-50 dark:border-neutral-800/70 dark:bg-neutral-900/60">
                  {page}
                </span>
                <button
                  className="h-8 w-8 rounded-md border border-neutral-200/70 hover:bg-neutral-100 dark:border-neutral-800/70 dark:hover:bg-neutral-800/60 disabled:opacity-50"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  ›
                </button>
                <button
                  className="h-8 w-8 rounded-md border border-neutral-200/70 hover:bg-neutral-100 dark:border-neutral-800/70 dark:hover:bg-neutral-800/60 disabled:opacity-50"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                >
                  »
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Charts */}
        <div className="lg:col-span-4 space-y-4">
          <div className={`${CARD}`}>
            <div className="mb-2 text-sm text-neutral-400">Tasks by Project</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={projectDonut} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={1}>
                    {projectDonut.map((d, i) => (
                      <Cell key={i} fill={d.color || COLORS['Other']} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={`${CARD}`}>
            <div className="mb-2 text-sm text-neutral-400">Open Issues by Project</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={openIssues} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={1}>
                    {openIssues.map((d, i) => (
                      <Cell key={i} fill={d.color || COLORS['Other']} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
