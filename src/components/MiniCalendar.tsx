import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db'
import { activityDef } from '../lib/activities'
import type { Macros } from '../lib/nutrition'
import { stepsKcal, workoutKcal } from '../lib/nutrition'
import { addDays, fmtDate, parseDate, today } from '../lib/util'
import { Button, Card, cx, Segmented, Sheet } from './ui'

interface DayInfo {
  date: string
  eaten: number
  target: number
  burned: number
  gym?: string
  acts: string[]
  steps?: number
}

const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function mondayOf(d: string) {
  return addDays(d, -((parseDate(d).getDay() + 6) % 7))
}

export default function MiniCalendar({ kg, targetFor }: { kg: number; targetFor: (d: string) => Macros }) {
  const [mode, setMode] = useState<'week' | 'month'>('week')
  const [anchor, setAnchor] = useState(today())
  const [open, setOpen] = useState<DayInfo | null>(null)
  const nav = useNavigate()

  const { start, end } = useMemo(() => {
    if (mode === 'week') { const s = mondayOf(anchor); return { start: s, end: addDays(s, 6) } }
    const a = parseDate(anchor)
    const first = today(new Date(a.getFullYear(), a.getMonth(), 1))
    const last = today(new Date(a.getFullYear(), a.getMonth() + 1, 0))
    return { start: mondayOf(first), end: addDays(mondayOf(last), 6) }
  }, [mode, anchor])

  const data = useLiveQuery(async () => {
    const [logs, sessions, acts, checkins] = await Promise.all([
      db.foodLogs.where('date').between(start, end, true, true).toArray(),
      db.sessions.where('date').between(start, end, true, true).toArray(),
      db.activities.where('date').between(start, end, true, true).toArray(),
      db.checkins.where('date').between(start, end, true, true).toArray(),
    ])
    return { logs, sessions, acts, checkins }
  }, [start, end])

  const days: DayInfo[] = useMemo(() => {
    const out: DayInfo[] = []
    for (let d = start; d <= end; d = addDays(d, 1)) {
      const eaten = Math.round((data?.logs ?? []).filter((l) => l.date === d).reduce((x, l) => x + l.kcal, 0))
      const gym = (data?.sessions ?? []).find((s) => s.date === d && s.completed)
      const acts = (data?.acts ?? []).filter((a) => a.date === d)
      const ci = (data?.checkins ?? []).find((c) => c.date === d)
      const burned = Math.round((ci ? stepsKcal(ci.steps, kg) : 0) + acts.reduce((x, a) => x + a.kcal, 0) + (gym ? workoutKcal(gym, kg) : 0))
      out.push({ date: d, eaten, target: d <= today() ? targetFor(d).kcal : 0, burned, gym: gym?.dayName, acts: acts.map((a) => `${activityDef(a.type).icon} ${a.type} · ${a.minutes} min · ${a.kcal} kcal`), steps: ci?.steps })
    }
    return out
  }, [data, start, end, kg, targetFor])

  const monthIdx = parseDate(anchor).getMonth()
  const shift = (n: number) => {
    if (mode === 'week') setAnchor(addDays(anchor, 7 * n))
    else { const a = parseDate(anchor); setAnchor(today(new Date(a.getFullYear(), a.getMonth() + n, 1))) }
  }
  const color = (d: DayInfo) => {
    if (d.date > today() || !d.eaten) return 'bg-slate-800'
    const r = d.eaten / Math.max(1, d.target)
    if (d.date === today() && r < 0.92) return 'bg-slate-500' // day still in progress
    return r >= 0.92 ? 'bg-emerald-500' : r >= 0.7 ? 'bg-amber-400' : 'bg-rose-500'
  }
  const weekTotals = mode === 'week' ? {
    workouts: days.filter((d) => d.gym).length,
    eaten: days.reduce((x, d) => x + d.eaten, 0),
    burned: days.reduce((x, d) => x + d.burned, 0),
  } : null

  return (
    <Card
      title={mode === 'week' ? `Week of ${fmtDate(days[0]?.date ?? anchor)}` : parseDate(anchor).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
      action={<div className="flex items-center gap-1"><button className="px-2 text-lg text-slate-400" onClick={() => shift(-1)}>‹</button><button className="px-2 text-lg text-slate-400 disabled:opacity-20" disabled={end >= today() && start <= today()} onClick={() => shift(1)}>›</button></div>}
    >
      <div className="mb-3 w-40"><Segmented value={mode} onChange={(m) => { setMode(m); setAnchor(today()) }} options={[{ value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} /></div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WD.map((w, i) => <div key={i} className="text-[10px] text-slate-500">{w}</div>)}
        {days.map((d) => {
          const isToday = d.date === today()
          const dim = mode === 'month' && parseDate(d.date).getMonth() !== monthIdx
          const future = d.date > today()
          return (
            <button key={d.date} disabled={future} onClick={() => setOpen(d)}
              className={cx('flex flex-col items-center rounded-xl border py-1.5', isToday ? 'border-emerald-500' : 'border-slate-800', dim && 'opacity-30', future && 'opacity-40')}>
              <span className={cx('text-sm font-semibold', isToday && 'text-emerald-400')}>{parseDate(d.date).getDate()}</span>
              <span className="h-4 text-xs leading-4">{d.gym ? '💪' : d.acts.length ? d.acts[0].split(' ')[0] : ''}</span>
              <span className={cx('mt-0.5 h-1.5 w-5 rounded-full', color(d))} />
              {mode === 'week' && !future && (
                <span className="mt-1 text-[9px] leading-tight text-slate-400">
                  <span className="block text-slate-200">{d.eaten ? `${(d.eaten / 1000).toFixed(1)}k` : '–'}</span>
                  <span className="block text-orange-300">🔥{d.burned}</span>
                </span>
              )}
            </button>
          )
        })}
      </div>
      {weekTotals && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-slate-800 p-1.5"><div className="font-bold">{weekTotals.workouts}</div><div className="text-slate-400">workouts</div></div>
          <div className="rounded-lg bg-slate-800 p-1.5"><div className="font-bold">{weekTotals.eaten.toLocaleString()}</div><div className="text-slate-400">kcal eaten</div></div>
          <div className="rounded-lg bg-slate-800 p-1.5"><div className="font-bold text-orange-300">{weekTotals.burned.toLocaleString()}</div><div className="text-slate-400">kcal burned*</div></div>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
        <span>💪 gym</span><span><span className="inline-block h-1.5 w-3 rounded-full bg-emerald-500" /> hit food target</span><span><span className="inline-block h-1.5 w-3 rounded-full bg-amber-400" /> close</span><span><span className="inline-block h-1.5 w-3 rounded-full bg-rose-500" /> under</span>
        {mode === 'week' && <span>*burned above resting (steps, gym, activities)</span>}
      </div>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open ? fmtDate(open.date, { weekday: 'long', day: 'numeric', month: 'long' }) : ''}>
        {open && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-slate-800 p-2"><div className="text-lg font-bold">{open.eaten}</div><div className="text-xs text-slate-400">eaten of {open.target}</div></div>
              <div className="rounded-xl bg-slate-800 p-2"><div className="text-lg font-bold text-orange-300">{open.burned}</div><div className="text-xs text-slate-400">burned*</div></div>
              <div className="rounded-xl bg-slate-800 p-2"><div className={cx('text-lg font-bold', open.eaten >= open.target - 200 ? 'text-emerald-400' : 'text-rose-400')}>{open.eaten - open.target > 0 ? '+' : ''}{open.eaten - open.target}</div><div className="text-xs text-slate-400">vs target</div></div>
            </div>
            <ul className="space-y-1.5 text-sm">
              <li>{open.gym ? `💪 Gym: ${open.gym}` : <span className="text-slate-500">No gym session</span>}</li>
              {open.acts.map((a) => <li key={a}>{a}</li>)}
              {open.steps !== undefined && <li>👣 {open.steps.toLocaleString()} steps</li>}
            </ul>
            <div className="flex gap-2">
              <Button variant="soft" size="sm" onClick={() => nav('/food')}>Food log</Button>
              <Button variant="soft" size="sm" onClick={() => nav('/activity')}>Activity</Button>
            </div>
          </div>
        )}
      </Sheet>
    </Card>
  )
}
