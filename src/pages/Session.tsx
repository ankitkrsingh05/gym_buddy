import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import ExerciseDemo from '../components/ExerciseDemo'
import { getSettings } from '../lib/settings'
import { Button, Card, cx, inputCls, Pill, Sheet, Stepper } from '../components/ui'
import { db, save } from '../db'
import { usePlan } from '../hooks'
import { EXERCISES } from '../lib/exercises'
import { applySession } from '../lib/progression'
import type { LoggedSet, Session, SessionExercise } from '../types'

const RPE_OPTS = [
  { v: 6, label: 'Easy', sub: '4+ left' },
  { v: 7, label: 'OK', sub: '3 left' },
  { v: 8, label: 'Hard', sub: '2 left' },
  { v: 9, label: 'V.hard', sub: '1 left' },
  { v: 10, label: 'Max', sub: '0 left' },
]

function plates(total: number) {
  let side = (total - 20) / 2
  if (side <= 0) return 'Empty bar (20 kg)'
  const out: number[] = []
  for (const p of [25, 20, 15, 10, 5, 2.5, 1.25]) while (side >= p - 1e-6) { out.push(p); side -= p }
  return `Per side: ${out.join(' + ')}${side > 0.01 ? ` (+${side.toFixed(2)} kg unmatched)` : ''}`
}

export default function SessionPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const stored = useLiveQuery(() => db.sessions.get(id!), [id])
  const plan = usePlan()
  const [s, setS] = useState<Session | null>(null)
  const [params] = useSearchParams()
  const [finishOpen, setFinishOpen] = useState(params.get('finish') === '1')
  const [summary, setSummary] = useState<string[] | null>(null)
  const [rest, setRest] = useState<{ end: number; total: number } | null>(null)
  const [now, setNow] = useState(Date.now())
  const [openCues, setOpenCues] = useState<string | null>(null)
  const saveTimer = useRef<number | undefined>(undefined)

  useEffect(() => { if (stored && !s) setS(stored) }, [stored, s])
  useEffect(() => {
    if (!rest) return
    const t = setInterval(() => {
      setNow(Date.now())
      if (Date.now() >= rest.end) { navigator.vibrate?.([200, 100, 200]); setRest(null) }
    }, 250)
    return () => clearInterval(t)
  }, [rest])

  if (!s || !plan) return null
  const readOnly = s.completed

  const update = (next: Session) => {
    setS(next)
    clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => save('sessions', next), 400)
  }
  const setEx = (i: number, e: SessionExercise) => update({ ...s, exercises: s.exercises.map((x, j) => (j === i ? e : x)) })
  const setSet = (i: number, k: number, patch: Partial<LoggedSet>) => {
    const e = s.exercises[i]
    const sets = e.sets.map((x, j) => (j === k ? { ...x, ...patch } : x))
    // Changing weight on a set carries forward to later, not-yet-done sets
    if (patch.weight !== undefined) for (let j = k + 1; j < sets.length; j++) if (!sets[j].done) sets[j] = { ...sets[j], weight: patch.weight }
    setEx(i, { ...e, sets })
  }
  const toggleDone = (i: number, k: number) => {
    const set = s.exercises[i].sets[k]
    setSet(i, k, { done: !set.done })
    if (!set.done) {
      const secs = EXERCISES[s.exercises[i].exerciseId].compound ? getSettings().restCompound : getSettings().restIsolation
      setRest({ end: Date.now() + secs * 1000, total: secs })
      setNow(Date.now())
    }
  }

  const doneSets = s.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0)
  const totalSets = s.exercises.reduce((a, e) => a + e.sets.length, 0)

  async function finish(sessionRpe: number, feeling: Session['feeling'], painNote: string) {
    const recent = (await db.sessions.toArray()).filter((x) => x.completed && x.id !== s!.id).sort((a, b) => b.date.localeCompare(a.date))
    const r = applySession(plan!, { ...s!, sessionRpe, feeling, painNote }, recent)
    await save('plan', r.plan)
    await save('sessions', r.session)
    setS(r.session)
    setFinishOpen(false)
    setSummary(r.summary)
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <button className="text-slate-400" onClick={() => nav('/train')}>← Back</button>
        <Pill tone={s.deload ? 'sky' : 'green'}>Week {s.week}{s.deload ? ' · Deload' : ''}</Pill>
      </div>
      <div>
        <h1 className="text-2xl font-bold">{s.dayName}</h1>
        {!readOnly && <Button className="mt-3 w-full" size="lg" onClick={() => nav(`/play/${s.id}`)}>▶ Guided mode (demo + rest timer)</Button>}
        <p className="text-sm text-slate-400">Readiness {s.readiness.score}/100 · sleep {s.readiness.sleepHours}h · energy {s.readiness.energy}/5</p>
      </div>
      {s.adjustments.length > 0 && (
        <Card className="border-sky-500/40 bg-sky-500/5">
          <div className="mb-1 text-sm font-semibold text-sky-300">Today's adjustments</div>
          <ul className="space-y-1 text-sm text-slate-300">{s.adjustments.map((a, i) => <li key={i}>• {a}</li>)}</ul>
        </Card>
      )}
      {summary && (
        <Card className="border-emerald-500/40 bg-emerald-500/5" title="Workout saved 🎉">
          <ul className="space-y-1 text-sm text-slate-300">
            {summary.map((x, i) => <li key={i}>• {x}</li>)}
            <li>• Progression for each exercise is shown below. Your next session uses these new targets.</li>
          </ul>
          <Button className="mt-3 w-full" onClick={() => nav('/')}>Done</Button>
        </Card>
      )}

      {s.exercises.map((e, i) => {
        const ex = EXERCISES[e.exerciseId]
        const bw = ex.increment === 0
        return (
          <Card key={e.slotKey}>
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <button className="text-left text-lg font-bold" onClick={() => setOpenCues(openCues === e.slotKey ? null : e.slotKey)}>{ex.name} <span className="text-xs text-slate-500">ⓘ</span></button>
                <div className="text-sm text-slate-400">
                  Target {e.targetSets}×{e.targetReps} {bw ? '(bodyweight)' : `@ ${e.targetWeight} kg${ex.perHand ? ' each' : ''}`} · range {e.repMin}–{e.repMax} · RPE {10 - e.targetRir}
                </div>
                {e.note && <div className="text-xs text-amber-300">{e.note}</div>}
              </div>
            </div>
            {openCues === e.slotKey && <ExerciseDemo id={e.exerciseId} className="mb-2 aspect-[4/3] w-full rounded-xl" />}
            {openCues === e.slotKey && (
              <ul className="mb-3 space-y-0.5 rounded-xl bg-slate-800/60 p-3 text-sm text-slate-300">
                {ex.cues.map((c) => <li key={c}>• {c}</li>)}
                {ex.equipment.includes('barbell') && !bw && <li className="text-emerald-300">• {plates(e.sets.find((x) => !x.done)?.weight ?? e.targetWeight)}</li>}
              </ul>
            )}
            <div className="space-y-3">
              {e.sets.map((set, k) => (
                <div key={k} className={cx('rounded-xl border p-2', set.done ? 'border-emerald-600/50 bg-emerald-500/5' : 'border-slate-800')}>
                  <div className="flex items-center gap-2">
                    <span className="w-5 shrink-0 text-center text-sm font-bold text-slate-500">{k + 1}</span>
                    <div className={cx('grid flex-1 gap-2', bw ? 'grid-cols-1' : 'grid-cols-2')}>
                      {!bw && <div><div className="mb-0.5 text-[10px] text-slate-500 uppercase">kg{ex.perHand ? ' each' : ''}</div><Stepper compact value={set.weight} step={ex.increment >= 2.5 ? 2.5 : ex.increment || 1} onChange={(weight) => !readOnly && setSet(i, k, { weight })} /></div>}
                      <div><div className="mb-0.5 text-[10px] text-slate-500 uppercase">reps</div><Stepper compact value={set.reps} onChange={(reps) => !readOnly && setSet(i, k, { reps })} /></div>
                    </div>
                    <button
                      disabled={readOnly}
                      onClick={() => toggleDone(i, k)}
                      className={cx('mt-4 h-10 w-10 shrink-0 rounded-full border-2 text-lg font-bold', set.done ? 'border-emerald-500 bg-emerald-500 text-slate-950' : 'border-slate-600 text-slate-600')}
                      aria-label="Mark set done"
                    >✓</button>
                  </div>
                  <div className="mt-2 grid grid-cols-5 gap-1">
                    {RPE_OPTS.map((o) => (
                      <button key={o.v} disabled={readOnly} onClick={() => setSet(i, k, { rpe: o.v })}
                        className={cx('rounded-lg border px-1 py-1 text-center leading-tight', set.rpe === o.v ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200' : 'border-slate-800 text-slate-400')}>
                        <div className="text-xs font-semibold">{o.label}</div>
                        <div className="text-[10px] text-slate-500">{o.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {!readOnly && (
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setEx(i, { ...e, sets: [...e.sets, { ...(e.sets[e.sets.length - 1] ?? { reps: e.targetReps, weight: e.targetWeight, rpe: 8 }), done: false }] })}>+ Set</Button>
                {e.sets.length > 1 && <Button size="sm" variant="ghost" onClick={() => setEx(i, { ...e, sets: e.sets.slice(0, -1) })}>− Set</Button>}
              </div>
            )}
            {e.progressionNote && <div className="mt-3 rounded-lg bg-slate-800/70 p-2 text-sm text-emerald-200">→ {e.progressionNote}</div>}
          </Card>
        )
      })}

      {!readOnly && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            {rest ? (
              <button className="flex-1 rounded-xl bg-slate-800 px-3 py-2 text-left" onClick={() => setRest(null)}>
                <div className="text-xs text-slate-400">Rest · tap to skip</div>
                <div className="text-xl font-bold tabular-nums">{Math.max(0, Math.ceil((rest.end - now) / 1000))}s</div>
              </button>
            ) : (
              <div className="flex-1 text-sm text-slate-400">{doneSets}/{totalSets} sets done</div>
            )}
            <Button onClick={() => setFinishOpen(true)} disabled={doneSets === 0}>Finish</Button>
          </div>
        </div>
      )}

      <FinishSheet open={finishOpen} onClose={() => setFinishOpen(false)} onFinish={finish} />
    </div>
  )
}

function FinishSheet({ open, onClose, onFinish }: { open: boolean; onClose: () => void; onFinish: (rpe: number, f: Session['feeling'], pain: string) => void }) {
  const [rpe, setRpe] = useState(7)
  const [feeling, setFeeling] = useState<Session['feeling']>('good')
  const [pain, setPain] = useState('')
  const labels: Record<number, string> = { 3: 'Very easy', 5: 'Easy', 6: 'Moderate', 7: 'Challenging', 8: 'Hard', 9: 'Very hard', 10: 'Maximal' }
  return (
    <Sheet open={open} onClose={onClose} title="How heavy did this workout feel?">
      <div className="space-y-5">
        <div>
          <div className="mb-2 text-center text-4xl font-extrabold">{rpe}<span className="text-lg text-slate-500">/10</span></div>
          <div className="mb-2 text-center text-sm text-slate-400">{labels[rpe] ?? labels[Object.keys(labels).map(Number).filter((k) => k <= rpe).pop() ?? 3]}</div>
          <input type="range" min={1} max={10} value={rpe} onChange={(e) => setRpe(Number(e.target.value))} className="w-full accent-emerald-500" />
        </div>
        <div>
          <div className="mb-2 text-sm font-medium text-slate-300">How do you feel now?</div>
          <div className="grid grid-cols-5 gap-1">
            {([['great', '🔥', 'Great'], ['good', '🙂', 'Good'], ['ok', '😐', 'OK'], ['drained', '🥵', 'Drained'], ['pain', '🤕', 'Pain']] as const).map(([v, e, l]) => (
              <button key={v} onClick={() => setFeeling(v)} className={cx('rounded-xl border py-2 text-center', feeling === v ? 'border-emerald-500 bg-emerald-500/15' : 'border-slate-700')}>
                <div className="text-xl">{e}</div><div className="text-[11px] text-slate-400">{l}</div>
              </button>
            ))}
          </div>
        </div>
        {feeling === 'pain' && (
          <div>
            <textarea className={inputCls} rows={2} placeholder="Where does it hurt? Sharp joint pain = stop that exercise and swap it." value={pain} onChange={(e) => setPain(e.target.value)} />
          </div>
        )}
        <Button size="lg" className="w-full" onClick={() => onFinish(rpe, feeling, pain)}>Save & update my plan</Button>
      </div>
    </Sheet>
  )
}
