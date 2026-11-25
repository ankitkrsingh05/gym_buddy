import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar as RBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import LogActivity from '../components/LogActivity'
import { Button, Card, Empty, Sheet } from '../components/ui'
import { db, remove } from '../db'
import { useEnergy, useProfile } from '../hooks'
import { activityDef } from '../lib/activities'
import { stepsKcal, workoutKcal } from '../lib/nutrition'
import { addDays, fmtDate, today } from '../lib/util'

export default function Activity() {
  const profile = useProfile()
  const energy = useEnergy(profile)
  const [date, setDate] = useState(today())
  const [adding, setAdding] = useState(false)
  const list = useLiveQuery(() => db.activities.where('date').equals(date).toArray(), [date], [])
  const checkin = useLiveQuery(() => db.checkins.get(date), [date])
  const workouts = useLiveQuery(() => db.sessions.where('date').equals(date).toArray(), [date], [])
  const weekActs = useLiveQuery(() => db.activities.where('date').aboveOrEqual(addDays(today(), -6)).toArray(), [], [])
  if (!profile || !energy) return null
  const kg = energy.kg

  const week = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6)).map((d) => ({ day: fmtDate(d, { weekday: 'short' }), kcal: Math.round(energy.extras[d] ?? 0) }))
  const byType = Object.entries(weekActs.reduce<Record<string, number>>((m, a) => { const n = activityDef(a.type).name; m[n] = (m[n] ?? 0) + a.minutes; return m }, {})).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="px-3 text-xl text-slate-400" onClick={() => setDate(addDays(date, -1))}>‹</button>
        <h1 className="text-xl font-bold">Activity · {date === today() ? 'Today' : fmtDate(date)}</h1>
        <button className="px-3 text-xl text-slate-400 disabled:opacity-20" disabled={date >= today()} onClick={() => setDate(addDays(date, 1))}>›</button>
      </div>

      <Button size="lg" className="w-full" onClick={() => setAdding(true)}>+ Log swimming, yoga, sports…</Button>

      <Card title="Burn above resting">
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between"><span>👣 Steps: {checkin?.steps?.toLocaleString() ?? '—'} <Link to={`/checkin?date=${date}`} className="text-emerald-400">edit</Link></span><span>{checkin ? Math.round(stepsKcal(checkin.steps, kg)) : 0} kcal</span></li>
          {workouts.filter((w) => w.completed).map((w) => <li key={w.id} className="flex justify-between text-slate-400"><span>🏋️ Gym: {w.dayName} (in baseline)</span><span>≈{workoutKcal(w, kg)} kcal</span></li>)}
          {list.map((a) => {
            const d = activityDef(a.type)
            return (
              <li key={a.id} className="flex items-start justify-between gap-2">
                <span>{d.icon} {a.type} · {a.minutes} min · {a.intensity}{a.distanceKm ? ` · ${a.distanceKm} km` : ''}{a.feel ? ` · felt ${a.feel}` : ''}{a.notes ? <span className="block text-xs text-slate-500">{a.notes}</span> : null}</span>
                <span className="flex shrink-0 gap-2">{a.kcal} kcal <button className="text-slate-500" onClick={() => remove('activities', a.id)}>×</button></span>
              </li>
            )
          })}
          {!checkin && !list.length && !workouts.length && <Empty>Nothing logged yet.</Empty>}
        </ul>
        <p className="mt-3 text-xs text-slate-500">Activities add to that day's food target and can lighten your next gym session for the muscles they worked. Gym workouts are already spread across your weekly baseline.</p>
      </Card>

      <Card title="Last 7 days">
        <div className="h-40">
          <ResponsiveContainer>
            <BarChart data={week}>
              <CartesianGrid stroke="#1e293b" vertical={false} />
              <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
              <RBar dataKey="kcal" fill="#22c55e" radius={[4, 4, 0, 0]} name="Activity kcal" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {byType.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {byType.map(([n, m]) => <span key={n} className="rounded-full bg-slate-800 px-2.5 py-1 text-xs">{activityDef(n).icon} {n} · {m} min</span>)}
          </div>
        )}
        {profile.device === 'iphone' && <p className="mt-2 text-xs text-slate-500">Tip: copy today's steps from the Health app into your check-in.</p>}
        {profile.device === 'android' && <p className="mt-2 text-xs text-slate-500">Tip: copy today's steps from Google Fit / Samsung Health into your check-in.</p>}
      </Card>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Log activity">
        {adding && <LogActivity date={date} kg={kg} onDone={() => setAdding(false)} />}
      </Sheet>
    </div>
  )
}
