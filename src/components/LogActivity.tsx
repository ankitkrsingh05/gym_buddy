import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db, save } from '../db'
import { ACTIVITIES, activityDef, activityKcal, CATEGORY_LABEL, type ActivityCategory } from '../lib/activities'
import { MUSCLE_LABEL } from '../lib/exercises'
import { uid } from '../lib/util'
import type { Activity } from '../types'
import { Button, cx, Field, inputCls, NumInput, Segmented, Stepper } from './ui'

const INTENSITY_HINT: Record<Activity['intensity'], string> = {
  light: 'Easy — can chat comfortably',
  moderate: 'Breathing harder, can still talk',
  vigorous: 'Hard — only a few words at a time',
}

/** Pick an activity (tiles) → duration, effort, distance → save. */
export default function LogActivity({ date, kg, onDone }: { date: string; kg: number; onDone: () => void }) {
  const [cat, setCat] = useState<ActivityCategory | 'recent'>('recent')
  const [type, setType] = useState<string | null>(null)
  const [minutes, setMinutes] = useState(30)
  const [intensity, setIntensity] = useState<Activity['intensity']>('moderate')
  const [distance, setDistance] = useState<number>(NaN)
  const [feel, setFeel] = useState<Activity['feel']>('good')
  const [notes, setNotes] = useState('')
  const [q, setQ] = useState('')
  const recentActs = useLiveQuery(() => db.activities.orderBy('updatedAt').reverse().limit(30).toArray(), [], [])
  const recentNames = useMemo(() => [...new Set(recentActs.map((a) => activityDef(a.type).name))].slice(0, 8), [recentActs])

  const shown = q
    ? ACTIVITIES.filter((a) => a.name.toLowerCase().includes(q.toLowerCase()))
    : cat === 'recent'
      ? (recentNames.length ? recentNames.map(activityDef) : ACTIVITIES.filter((a) => ['Walking', 'Swimming – freestyle', 'Yoga – gentle / hatha', 'Cricket', 'Cycling', 'Running', 'Badminton', 'Football'].includes(a.name)))
      : ACTIVITIES.filter((a) => a.category === cat)

  if (!type) {
    return (
      <div className="space-y-3">
        <input className={inputCls} placeholder="Search: swim, yoga, cricket…" value={q} onChange={(e) => setQ(e.target.value)} />
        {!q && (
          <div className="flex gap-1 overflow-x-auto pb-1">
            {(['recent', ...Object.keys(CATEGORY_LABEL)] as (ActivityCategory | 'recent')[]).map((c) => (
              <button key={c} onClick={() => setCat(c)} className={cx('shrink-0 rounded-full px-3 py-1.5 text-sm', cat === c ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300')}>
                {c === 'recent' ? (recentNames.length ? 'Recent' : 'Popular') : CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          {shown.map((a) => (
            <button key={a.name} onClick={() => { setType(a.name); if (a.recovery) setIntensity('light') }} className="flex flex-col items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-center hover:border-emerald-600">
              <span className="text-2xl">{a.icon}</span>
              <span className="text-xs leading-tight text-slate-200">{a.name}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const def = activityDef(type)
  const kcal = activityKcal(type, minutes, intensity, kg)
  const pace = def.distance && distance > 0 && minutes > 0 ? (minutes / distance) : null

  async function submit() {
    await save('activities', {
      id: uid(), updatedAt: 0, date, type, minutes, intensity, kcal,
      distanceKm: Number.isNaN(distance) ? undefined : distance, feel, notes: notes || undefined,
    })
    onDone()
  }

  return (
    <div className="space-y-4">
      <button className="flex items-center gap-3" onClick={() => setType(null)}>
        <span className="text-3xl">{def.icon}</span>
        <div className="text-left"><div className="text-lg font-bold">{def.name}</div><div className="text-xs text-emerald-400">change</div></div>
      </button>
      <Field label="Duration">
        <div className="flex flex-wrap items-center gap-2">
          {[15, 30, 45, 60, 90].map((m) => (
            <button key={m} onClick={() => setMinutes(m)} className={cx('rounded-lg border px-3 py-1.5 text-sm', minutes === m ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-slate-700 text-slate-300')}>{m}m</button>
          ))}
          <Stepper compact value={minutes} step={5} min={5} max={600} onChange={setMinutes} />
        </div>
      </Field>
      <Field label="Effort" hint={INTENSITY_HINT[intensity]}>
        <Segmented value={intensity} onChange={setIntensity} options={[{ value: 'light', label: 'Light' }, { value: 'moderate', label: 'Moderate' }, { value: 'vigorous', label: 'Hard' }]} />
      </Field>
      {def.distance && (
        <Field label="Distance (optional)" hint={pace ? `Pace ≈ ${Math.floor(pace)}:${String(Math.round((pace % 1) * 60)).padStart(2, '0')} min/km` : undefined}>
          <NumInput value={distance} step={0.1} onChange={setDistance} suffix="km" />
        </Field>
      )}
      <Field label="How did it feel?">
        <Segmented value={feel ?? 'good'} onChange={setFeel} options={[{ value: 'easy', label: 'Easy' }, { value: 'good', label: 'Good' }, { value: 'tough', label: 'Tough' }, { value: 'exhausting', label: 'Wiped' }]} />
      </Field>
      <input className={inputCls} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="rounded-xl bg-slate-800/60 p-3 text-sm text-slate-300">
        <div>≈ <b className="text-emerald-300">{kcal} kcal</b> burned — added to that day's food target.</div>
        {def.recovery
          ? <div className="mt-1 text-slate-400">Counts as active recovery — won't reduce your gym volume.</div>
          : def.muscles.length > 0 && <div className="mt-1 text-slate-400">Works {def.muscles.map((m) => MUSCLE_LABEL[m].toLowerCase()).join(', ')} — your next gym session trims volume there if this was long or hard.</div>}
      </div>
      <Button size="lg" className="w-full" onClick={submit}>Save activity</Button>
    </div>
  )
}
