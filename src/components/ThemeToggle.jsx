import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState('system')

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme') || 'system'
      setTheme(stored)
    } catch {}
  }, [])

  useEffect(() => {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  function cycleTheme() {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'
      try { localStorage.setItem('theme', next) } catch {}
      return next
    })
  }

  const label = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'Auto'

  return (
    <button onClick={cycleTheme} aria-label="Cambiar tema" className="inline-flex items-center gap-2 px-3 h-9 rounded-md border border-slate-300/60 dark:border-slate-700/60 bg-white/70 dark:bg-slate-800/70 text-slate-800 dark:text-slate-100 hover:bg-white/90 dark:hover:bg-slate-800/90 transition-colors">
      <span aria-hidden>
        {theme === 'light' ? '🌞' : theme === 'dark' ? '🌚' : '🌓'}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}


