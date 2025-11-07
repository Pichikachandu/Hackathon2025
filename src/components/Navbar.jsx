import { NavLink } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'

export default function Navbar({ onChangeRange, activeRange }) {
  const [openRange, setOpenRange] = useState(false)
  const menuRef = useRef(null)
  const buttonRef = useRef(null)

  const ranges = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'last7', label: 'Last 7 days' },
    { id: 'last30', label: 'Last 30 days' },
    { id: 'thisMonth', label: 'This month' },
  ]
  const active = ranges.find(r => r.id === activeRange) || ranges[0]

  useEffect(() => {
    function handleClickOutside(event) {
      // Close the dropdown if clicked outside of the dropdown and button
      if (menuRef.current && !menuRef.current.contains(event.target) && 
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setOpenRange(false)
      }
    }

    // Add event listener when component mounts
    document.addEventListener('mousedown', handleClickOutside)
    
    // Clean up the event listener when component unmounts
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/70 dark:border-neutral-800/70 bg-white/60 dark:bg-neutral-950/60 backdrop-blur px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-base sm:text-lg font-semibold tracking-tight">PULSEVO</h1>
        <nav className="flex items-center gap-2 ml-2">
          {[
            { to: '/overview', label: 'Overview' },
            { to: '/tasks', label: 'Tasks' },
            { to: '/insights', label: 'AI Insights' },
            { to: '/query', label: 'Query' },
            { to: '/settings', label: 'Settings' },
          ].map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) => `px-3 py-1.5 rounded-full text-sm ${isActive ? 'bg-sky-600 text-white' : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800/60'}`}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {/* Date range dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            ref={buttonRef}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200/70 dark:border-neutral-800/70 px-3 py-1.5 text-sm text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
            onClick={(e) => {
              e.stopPropagation()
              setOpenRange(v => !v)
            }}
            aria-haspopup="menu"
            aria-expanded={openRange}
          >
            {active.label}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
          {openRange && (
            <div className="absolute right-0 mt-2 w-44 rounded-md border border-neutral-200/70 dark:border-neutral-800/70 bg-white/90 dark:bg-neutral-900/90 backdrop-blur shadow-lg p-1" role="menu">
              {ranges.map(r => (
                <button
                  key={r.id}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800 ${r.id === active.id ? 'text-sky-600 dark:text-sky-400' : 'text-neutral-700 dark:text-neutral-200'}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onChangeRange) {
                      onChangeRange(r.id)
                    }
                    setOpenRange(false)
                  }}
                  role="menuitem"
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Avatar placeholder */}
        <div className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-white text-sm font-semibold">A</div>
      </div>
    </header>
  )
}
