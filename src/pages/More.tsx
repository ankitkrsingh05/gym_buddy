import { Link } from 'react-router-dom'

const ITEMS = [
  { to: '/checkin', icon: '☀️', title: 'Daily check-in', desc: 'Sleep, energy, soreness, steps, water' },
  { to: '/activity', icon: '🚶', title: 'Activity', desc: 'Steps, sports, walks, cardio' },
  { to: '/supplements', icon: '💊', title: 'Supplements guide', desc: 'Whey protein & creatine — detailed health info' },
  { to: '/settings', icon: '⚙️', title: 'Settings', desc: 'Profile & goals, cloud sync, AI, backup' },
]

export default function More() {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">More</h1>
      {ITEMS.map((i) => (
        <Link key={i.to} to={i.to} className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <span className="text-2xl">{i.icon}</span>
          <div><div className="font-semibold">{i.title}</div><div className="text-sm text-slate-400">{i.desc}</div></div>
        </Link>
      ))}
    </div>
  )
}
