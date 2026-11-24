import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useProfile } from './hooks'
import { onSyncStatus } from './lib/sync'
import Activity from './pages/Activity'
import CheckIn from './pages/CheckIn'
import Dashboard from './pages/Dashboard'
import Food from './pages/Food'
import More from './pages/More'
import Onboarding from './pages/Onboarding'
import Player from './pages/Player'
import Progress from './pages/Progress'
import SessionPage from './pages/Session'
import Settings from './pages/Settings'
import Supplements from './pages/Supplements'
import Train from './pages/Train'

const TABS = [
  { to: '/', label: 'Home', icon: 'M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z' },
  { to: '/train', label: 'Train', icon: 'M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12' },
  { to: '/food', label: 'Food', icon: 'M7 3v8a2 2 0 002 2v8M11 3v8M15 3c2 0 3 3 3 6s-1 4-3 4v8' },
  { to: '/progress', label: 'Progress', icon: 'M3 20l6-7 4 4 8-10M15 7h6v6' },
  { to: '/more', label: 'More', icon: 'M4 6h16M4 12h16M4 18h16' },
]

function SyncDot() {
  const [s, setS] = useState<{ state: string; message?: string }>({ state: 'off' })
  useEffect(() => onSyncStatus(setS), [])
  if (s.state === 'off') return null
  const color = s.state === 'error' ? 'bg-rose-500' : s.state === 'syncing' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'
  return <span title={s.message ?? `Sync: ${s.state}`} className={`fixed top-[calc(0.5rem+env(safe-area-inset-top))] right-3 z-40 h-2 w-2 rounded-full ${color}`} />
}

export default function App() {
  const profile = useProfile()
  const loc = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])

  if (profile === null) return <div className="flex h-dvh items-center justify-center text-slate-500">Loading…</div>
  if (!profile) return <Routes><Route path="*" element={<Onboarding />} /></Routes>

  const hideNav = loc.pathname.startsWith('/session/') || loc.pathname.startsWith('/play/')
  return (
    <div className="min-h-dvh">
      <SyncDot />
      <main className="mx-auto max-w-2xl px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-28">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/checkin" element={<CheckIn />} />
          <Route path="/train" element={<Train />} />
          <Route path="/session/:id" element={<SessionPage />} />
          <Route path="/play/:id" element={<Player />} />
          <Route path="/food" element={<Food />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/supplements" element={<Supplements />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/more" element={<More />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!hideNav && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <div className="mx-auto flex max-w-2xl">
            {TABS.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d={t.icon} /></svg>
                {t.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
