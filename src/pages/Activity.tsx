import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar as RBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button, Card, Empty, Field, NumInput, Segmented } from '../components/ui'
import { db, remove, save } from '../db'
import { useEnergy, useProfile } from '../hooks'
import { activityKcal, MET, stepsKcal, workoutKcal } from '../lib/nutrition'
import { addDays, fmtDate, today, uid } from '../lib/util'
import type { Activity as A } from '../types'

export default function Activity() {
  const profile = useProfile()
  const energy = useEnergy(profile)
  const [date, setDate] = useState(today())
  const [type, setType] = useState('Walking (brisk)')
  const [minutes, setMinutes] = useState(30)
  const [intensity, setIntensity] = useState<A['intensity']>('moderate')
  const list = useLiveQuery(() => db.activities.where('date').equals(date).toArray(), [date], [])
  const checkin = useLiveQuery(() => db.checkins.get(date), [date])
  const workouts = useLiveQuery(() => db.sessions.where('date').equals(date).toArray(), [date], [])
  if (!profile || !energy) return null
  const kg = energy.kg
  const est = activityKcal(type, minutes, intensity, kg)

  const week = Array.from({ length: 7 }, (_, i) => addDays(today(), i - 6)).map((d) => ({ day: fmtDate(d, { weekday: 'short' }), kcal: Math.round(energy.extras[d] ?? 0) }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="px-3 text-xl text-slate-400" onClick={() => setDate(addDays(date, -1))}>‹</button>
        <h1 className="text-xl font-bold">Activity · {date === today() ? 'Today' : fmtDate(date)}</h1>
        <button className="px-3 text-xl text-slate-400 disabled:opacity-20" disabled={date >= today()} onClick={() => setDate(addDays(date, 1))}>›</button>
      </div>

      <Card title="Today's burn (above resting)">
        <ul className="space-y-1.5 text-sm">
          <li className="flex justify-between"><span>Steps: {checkin?.steps ?? '—'} <Link to={`/checkin?date=${date}`} className="text-emerald-400">edit</Link></span><span>{checkin ? Math.round(stepsKcal(checkin.steps, kg)) : 0} kcal</span></li>
          {workouts.filter((w) => w.completed).map((w) => <li key={w.id} className="flex justify-between text-slate-400"><span>Gym: {w.dayName} (in baseline)</span><span>≈{workoutKcal(w, kg)} kcal</span></li>)}
          {list.map((a) => (
            <li key={a.id} className="flex justify-between"><span>{a.type} · {a.minutes} min · {a.intensity}</span><span className="flex gap-2">{a.kcal} kcal <button className="text-slate-500" onClick={() => remove('activities', a.id)}>×</button></span></li>
          ))}
          {!checkin && !list.length && !workouts.length && <Empty>Nothing logged yet.</Empty>}
        </ul>
        <p className="mt-3 text-xs text-slate-500">Steps and sports are added to that day's food target automatically. Gym workouts are already spread evenly across your week's baseline, so rest days still get enough food to grow.</p>
      </Card>

      <Card title="Add activity">
        <div className="space-y-3">
          <Field label="Type">
            <select className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5" value={type} onChange={(e) => setType(e.target.value)}>
              {Object.keys(MET).map((k) => <option key={k}>{k}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Minutes"><NumInput value={minutes} step={5} onChange={setMinutes} /></Field>
            <Field label="Intensity"><Segmented value={intensity} onChange={setIntensity} options={[{ value: 'light', label: 'Light' }, { value: 'moderate', label: 'Mod' }, { value: 'vigorous', label: 'Hard' }]} /></Field>
          </div>
          <Button className="w-full" disabled={!minutes} onClick={() => save('activities', { id: uid(), updatedAt: 0, date, type, minutes, intensity, kcal: est })}>Add · ≈{est} kcal</Button>
        </div>
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
        {profile.device === 'iphone' && <p className="mt-2 text-xs text-slate-500">Tip: open the Health app → Steps to copy today's count into your check-in. Automatic Apple Health sync needs a native app (possible later).</p>}
        {profile.device === 'android' && <p className="mt-2 text-xs text-slate-500">Tip: copy today's steps from Google Fit / Samsung Health / Health Connect into your check-in.</p>}
      </Card>
    </div>
  )
}
