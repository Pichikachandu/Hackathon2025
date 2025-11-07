import { useEffect, useRef, useState } from 'react'
import { answerQuery } from '../services/aiService'
import { Send, Loader2 } from 'lucide-react'

const CARD = 'rounded-xl border border-neutral-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-900/70 backdrop-blur shadow-sm'

function Bubble({ role, text, time }) {
  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full`}>
      <div className={`${isUser ? 'bg-sky-600/80 text-white' : 'bg-neutral-800/80 text-neutral-100'} max-w-[70%] rounded-xl px-4 py-3`}> 
        <div className="text-sm whitespace-pre-wrap leading-6">{text}</div>
        <div className={`mt-1 text-[10px] ${isUser ? 'text-white/80' : 'text-neutral-400'}`}>{time}</div>
      </div>
    </div>
  )
}

export default function Query() {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [tasks, setTasks] = useState([])
  const messagesEndRef = useRef(null)

  // Load tasks from localStorage
  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem('uploaded_tasks')
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks))
      }
    } catch (e) {
      console.error('Error loading tasks:', e)
    }
  }, [])

  const [messages, setMessages] = useState(() => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    let summary = 'No uploaded data found yet. Upload an Excel/CSV in Tasks to enable live answers.'
    try {
      const cached = typeof localStorage !== 'undefined' ? localStorage.getItem('uploaded_metrics') : null
      if (cached) {
        const m = JSON.parse(cached)
        summary = `Live data loaded. Open: ${m.open ?? 0}. Closed today: ${m.closedToday ?? 0}. Completion: ${m.completion ?? 0}%.`
      }
    } catch {}
    return [
      { id: 1, role: 'assistant', text: "Hello! I'm your AI assistant. Ask me anything about your team's productivity, tasks, or performance metrics.", time: now },
      { id: 2, role: 'assistant', text: summary, time: now },
    ]
  })
  const [metrics, setMetrics] = useState(null)
  useEffect(() => {
    function load() {
      try {
        const cached = typeof localStorage !== 'undefined' ? localStorage.getItem('uploaded_metrics') : null
        setMetrics(cached ? JSON.parse(cached) : null)
      } catch {
        setMetrics(null)
      }
    }
    load()
    function onStorage(e) {
      if (e.key === 'uploaded_metrics') load()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    
    const userMessage = input
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', text: userMessage, time: now }])
    setInput('')
    setIsLoading(true)
    
    try {
      // Get AI response
      const response = await answerQuery(userMessage, tasks)
      
      // Add AI response to messages
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          text: response,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    } catch (error) {
      console.error('Error getting AI response:', error)
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          text: 'Sorry, I encountered an error processing your request. Please try again.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-neutral-200/70 dark:border-neutral-800/70">
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">AI Assistant</h1>
        <p className="text-sm text-neutral-500">Ask questions about your task data</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-neutral-500">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-1">How can I help you today?</h3>
            <p className="max-w-md">Ask me anything about your tasks, projects, or team performance. For example:</p>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl">
              <button 
                onClick={() => setInput('What are my top priority tasks?')} 
                className="text-left p-3 rounded-lg border border-neutral-200/70 dark:border-neutral-800/70 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 text-sm transition-colors"
              >
                What are my top priority tasks?
              </button>
              <button 
                onClick={() => setInput('Show me tasks due this week')} 
                className="text-left p-3 rounded-lg border border-neutral-200/70 dark:border-neutral-800/70 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 text-sm transition-colors"
              >
                Show me tasks due this week
              </button>
              <button 
                onClick={() => setInput('Who has the most open tasks?')} 
                className="text-left p-3 rounded-lg border border-neutral-200/70 dark:border-neutral-800/70 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 text-sm transition-colors"
              >
                Who has the most open tasks?
              </button>
              <button 
                onClick={() => setInput('What projects need attention?')} 
                className="text-left p-3 rounded-lg border border-neutral-200/70 dark:border-neutral-800/70 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 text-sm transition-colors"
              >
                What projects need attention?
              </button>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <Bubble key={i} role={msg.role} text={msg.text} time={msg.time} />
          ))
        )}
        <div ref={messagesEndRef} />
        {isLoading && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800/50 w-fit">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm text-neutral-600 dark:text-neutral-300">Thinking...</span>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit} className="p-4 border-t border-neutral-200/70 dark:border-neutral-800/70 bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your tasks..."
            className="flex-1 h-12 px-4 rounded-xl border border-neutral-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-900/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={`h-12 w-12 rounded-xl flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
              isLoading || !input.trim()
                ? 'bg-indigo-400 dark:bg-indigo-900/50 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="mt-2 text-xs text-center text-neutral-500">
          Ask about tasks, projects, or team performance. I'll analyze your data and provide insights.
        </p>
      </form>
    </div>
  )
}
