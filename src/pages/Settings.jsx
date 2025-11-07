import { useEffect, useState } from 'react'

const CARD = 'rounded-xl border border-neutral-200/70 dark:border-neutral-800/70 bg-white/70 dark:bg-neutral-900/70 backdrop-blur shadow-sm'

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-sky-600' : 'bg-neutral-700'}`}
      aria-pressed={checked}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`}
      />
    </button>
  )
}

export default function Settings() {
  const [githubToken, setGithubToken] = useState('')
  const [trelloKey, setTrelloKey] = useState('')
  const [trelloToken, setTrelloToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const [notifyTasks, setNotifyTasks] = useState(true)
  const [notifyInsights, setNotifyInsights] = useState(true)
  const [notifyDigest, setNotifyDigest] = useState(false)

  useEffect(() => {
    // load mock persistence
    setGithubToken(localStorage.getItem('gh_token') || '')
    setTrelloKey(localStorage.getItem('trello_key') || '')
    setTrelloToken(localStorage.getItem('trello_token') || '')
    setNotifyTasks(localStorage.getItem('notify_tasks') !== 'false')
    setNotifyInsights(localStorage.getItem('notify_insights') !== 'false')
    setNotifyDigest(localStorage.getItem('notify_digest') === 'true')
  }, [])

  async function onSave() {
    setSaving(true)
    localStorage.setItem('gh_token', githubToken)
    localStorage.setItem('trello_key', trelloKey)
    localStorage.setItem('trello_token', trelloToken)
    localStorage.setItem('notify_tasks', String(notifyTasks))
    localStorage.setItem('notify_insights', String(notifyInsights))
    localStorage.setItem('notify_digest', String(notifyDigest))
    await new Promise((r) => setTimeout(r, 400))
    setSaving(false)
    setSavedMsg('Saved!')
    setTimeout(() => setSavedMsg(''), 1500)
  }

  return (
    <div className="space-y-4">

      {/* API Configuration */}
      <div className={`${CARD} p-4 border-t-indigo-500/40`}>
        <div className="flex items-center gap-2 text-neutral-200 text-sm font-medium mb-3">
          <span className="text-indigo-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3l9 4v6c0 5-3.8 9.7-9 10-5.2-.3-9-5-9-10V7l9-4z" stroke="currentColor" strokeWidth="1.5"/></svg>
          </span>
          API Configuration
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-neutral-400">GitHub Personal Access Token</label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp xxxxxxxxxxxx"
              className="mt-1 w-full h-10 rounded-full bg-neutral-900/70 border border-neutral-800/70 px-4 text-sm text-neutral-100 placeholder:text-neutral-500"
            />
            <div className="text-[11px] text-neutral-500 mt-1">Required for fetching GitHub issues data</div>
          </div>

          <div>
            <label className="text-xs text-neutral-400">Trello API key</label>
            <input
              value={trelloKey}
              onChange={(e) => setTrelloKey(e.target.value)}
              placeholder="Enter your Trello API Key"
              className="mt-1 w-full h-10 rounded-full bg-neutral-900/70 border border-neutral-800/70 px-4 text-sm text-neutral-100 placeholder:text-neutral-500"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400">Trello Token</label>
            <input
              type="password"
              value={trelloToken}
              onChange={(e) => setTrelloToken(e.target.value)}
              placeholder="Enter your Trello token"
              className="mt-1 w-full h-10 rounded-full bg-neutral-900/70 border border-neutral-800/70 px-4 text-sm text-neutral-100 placeholder:text-neutral-500"
            />
          </div>

          <div className="pt-1">
            <button
              onClick={onSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm px-4 py-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 7a2 2 0 0 1 2-2h9l5 5v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7z" stroke="currentColor" strokeWidth="1.5"/><path d="M8 7v4h8V7" stroke="currentColor" strokeWidth="1.5"/></svg>
              {saving ? 'Saving...' : 'Save API Keys'}
            </button>
            {savedMsg && <span className="ml-3 text-sm text-emerald-400">{savedMsg}</span>}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className={`${CARD} p-4 border-t-emerald-500/40`}>
        <div className="flex items-center gap-2 text-neutral-200 text-sm font-medium mb-3">
          <span className="text-emerald-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2z" fill="currentColor"/><path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2z" stroke="currentColor" strokeWidth="1.5"/></svg>
          </span>
          Notifications
        </div>

        <div className="divide-y divide-neutral-800/60">
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm text-neutral-200">Task Updates</div>
              <div className="text-xs text-neutral-500">Notify on task status changes</div>
            </div>
            <Toggle checked={notifyTasks} onChange={setNotifyTasks} />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm text-neutral-200">AI Insights</div>
              <div className="text-xs text-neutral-500">Receive AI-generated summaries</div>
            </div>
            <Toggle checked={notifyInsights} onChange={setNotifyInsights} />
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm text-neutral-200">Daily Digest</div>
              <div className="text-xs text-neutral-500">Get daily productivity reports</div>
            </div>
            <Toggle checked={notifyDigest} onChange={setNotifyDigest} />
          </div>
        </div>
      </div>
    </div>
  )
}
