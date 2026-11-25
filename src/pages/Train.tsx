import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ExerciseDemo from '../components/ExerciseDemo'
import { AdviceList, Button, Card, Empty, Pill, Segmented, Sheet } from '../components/ui'
import { db, remove, save } from '../db'
import LogActivity from '../components/LogActivity'
import { useEnergy, usePlan, useProfile } from '../hooks'
import { betterDay, notesForDay, planSuggestions, trainingAdaptations, type PlanSuggestion } from '../lib/adapt'
import { alternatives, EXERCISES, MUSCLE_LABEL } from '../lib/exercises'
import { currentWeek, generatePlan, isDeloadWeek, startWeight, targetRir } from '../lib/plan'
import { buildSession, e1rm, readinessFromCheckin, readinessScore } from '../lib/progression'
import { fmtDate, today } from '../lib/util'
import type { Plan, PlanSlot } from '../types'

export default function Train() {
  const profile = useProfile()
  const plan = usePlan()
  const nav = useNavigate()
  const [tab, setTab] = useState<'plan' | 'history' | 'strength'>('plan')
  const sessions = useLiveQuery(() => db.sessions.orderBy('date').reverse().toArray(), [], [])
  const checkin = useLiveQuery(() => db.checkins.get(today()), [])
  const [swap, setSwap] = useState<{ dayIdx: number; slot: PlanSlot } | null>(null)
  const active = sessions.find((s) => !s.completed && s.date === today())
  const energy = useEnergy(profile)
  const [logAct, setLogAct] = useState(false)
  const adapt = useMemo(() => energy ? trainingAdaptations({ activities: energy.acts, logs: energy.logs, targetFor: energy.targetFor }) : null, [energy])
  const suggestions = useMemo(() => energy && profile && plan ? planSuggestions(profile, plan, sessions, energy.acts, energy.logs, energy.targetFor) : [], [energy, profile, plan, sessions])
  const [dismissed, setDismissed] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('gainlab.dismissed') ?? '[]') } catch { return [] } })

  if (!profile || !plan || !energy) return null
  const week = currentWeek(plan)
  const deload = isDeloadWeek(plan)

  async function start() {
    if (active) return nav(`/play/${active.id}`)
    const r = readinessFromCheckin(checkin)
    const s = buildSession(plan!, { ...r, score: readinessScore(r) }, adapt ?? undefined)
    await save('sessions', s)
    nav(`/play/${s.id}`)
  }

  function dismiss(id: string) {
    const d = [...dismissed, id]
    setDismissed(d)
    try { localStorage.setItem('gainlab.dismissed', JSON.stringify(d)) } catch { /* storage blocked */ }
  }

  async function applySuggestion(sg: PlanSuggestion) {
    const a = sg.action
    if (!a) return
    if (a.kind === 'days' || a.kind === 'minutes') {
      const prof = await save('profile', { ...profile!, ...(a.kind === 'days' ? { daysPerWeek: a.value } : { sessionMinutes: a.value }) })
      await save('plan', generatePlan(prof, plan))
    } else {
      const next: Plan = structuredClone(plan!)
      const slot = next.days[a.slotDayIdx].slots.find((x) => x.key === a.slotKey)
      if (slot) {
        slot.exerciseId = a.exerciseId
        next.exerciseState[a.exerciseId] ??= { exerciseId: a.exerciseId, weight: startWeight(EXERCISES[a.exerciseId], profile!), targetReps: slot.repMin, failures: 0, calibrated: false }
        await save('plan', next)
      }
    }
    dismiss(sg.id)
  }

  async function doSwap(exId: string) {
    if (!swap) return
    const next: Plan = structuredClone(plan!)
    const slot = next.days[swap.dayIdx].slots.find((s) => s.key === swap.slot.key)!
    slot.exerciseId = exId
    const ex = EXERCISES[exId]
    next.exerciseState[exId] ??= { exerciseId: exId, weight: startWeight(ex, profile!), targetReps: slot.repMin, failures: 0, calibrated: false }
    await save('plan', next)
    setSwap(null)
  }

  async function regenerate() {
    if (!confirm('Rebuild the plan from your current profile? Your progress on exercises that stay in the plan is kept.')) return
    await save('plan', generatePlan(profile!, plan))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Training</h1>
        <Pill tone={deload ? 'sky' : 'green'}>Block {plan.mesoNumber} · Week {week}/{plan.mesoWeeks}{deload ? ' · Deload' : ''}</Pill>
      </div>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'plan', label: 'Plan' }, { value: 'history', label: 'History' }, { value: 'strength', label: 'Strength' }]} />

      {tab === 'plan' && (
        <>
          <Card>
            <div className="text-sm text-slate-400">Next session</div>
            <div className="text-xl font-bold">{plan.days[plan.nextDayIdx].name}</div>
            <p className="mt-1 text-sm text-slate-400">{deload ? 'Deload: lighter and fewer sets so you recover and come back stronger.' : `Target effort this week: stop with ~${targetRir(plan)} reps in reserve (RPE ${10 - targetRir(plan)}).`}</p>
            <Button className="mt-3 w-full" size="lg" onClick={start}>{active ? 'Resume workout' : 'Start workout'}</Button>
            {!checkin && !active && <p className="mt-2 text-center text-xs text-slate-500"><Link className="text-emerald-400 underline" to="/checkin">Do your check-in first</Link> so today's session matches your recovery.</p>}
            {!active && adapt && notesForDay(adapt, plan, plan.nextDayIdx).length > 0 && (
              <div className="mt-3 rounded-xl border border-sky-500/30 bg-sky-500/5 p-3">
                <div className="mb-1 text-xs font-semibold tracking-wide text-sky-300 uppercase">Adapted for today</div>
                <ul className="space-y-1 text-sm text-slate-300">{notesForDay(adapt, plan, plan.nextDayIdx).map((n) => <li key={n}>• {n}</li>)}</ul>
                {(() => {
                  const b = betterDay(plan, adapt)
                  return b && (
                    <div className="mt-3 border-t border-sky-500/20 pt-3">
                      <p className="text-sm text-slate-300">{b.why}</p>
                      <Button size="sm" className="mt-2" onClick={() => {
                        // swap the two days in the rotation so the skipped day comes right after
                        const days = [...plan.days]
                        const cur = plan.nextDayIdx % days.length
                        ;[days[cur], days[b.idx]] = [days[b.idx], days[cur]]
                        save('plan', { ...plan, days })
                      }}>Do {b.name} today instead</Button>
                    </div>
                  )
                })()}
              </div>
            )}
            <Button variant="soft" className="mt-3 w-full" onClick={() => setLogAct(true)}>+ Log other activity (swim, yoga, sport…)</Button>
          </Card>

          {suggestions.filter((sg) => !dismissed.includes(sg.id)).length > 0 && (
            <Card title="Suggestions from your habits">
              <div className="space-y-3">
                {suggestions.filter((sg) => !dismissed.includes(sg.id)).map((sg) => (
                  <div key={sg.id}>
                    <AdviceList items={[{ level: sg.level, title: sg.title, body: sg.body }]} />
                    <div className="mt-2 flex gap-2">
                      {sg.action && <Button size="sm" onClick={() => applySuggestion(sg)}>{sg.action.label}</Button>}
                      <Button size="sm" variant="ghost" onClick={() => dismiss(sg.id)}>Dismiss</Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <p className="text-xs text-slate-500">{plan.split}. Tap an exercise to swap it for an alternative that fits your gym.</p>
          {plan.days.map((d, di) => (
            <Card key={d.id} title={<span>{d.name}{di === plan.nextDayIdx && <span className="ml-2 text-emerald-400">← next</span>}</span>}>
              <ul className="divide-y divide-slate-800">
                {d.slots.map((s) => {
                  const ex = EXERCISES[s.exerciseId]
                  const st = plan.exerciseState[s.exerciseId]
                  const adj = plan.muscleAdj[ex.primary] ?? 0
                  return (
                    <li key={s.key}>
                      <button className="flex w-full items-center justify-between gap-2 py-2.5 text-left" onClick={() => setSwap({ dayIdx: di, slot: s })}>
                        <ExerciseDemo id={ex.id} playing={false} className="h-12 w-14 shrink-0 rounded-lg" />
                        <div className="flex-1">
                          <div className="font-medium">{ex.name}</div>
                          <div className="text-xs text-slate-500">{MUSCLE_LABEL[ex.primary]}{adj ? ` · ${adj > 0 ? '+' : ''}${adj} set (recovery)` : ''}</div>
                        </div>
                        <div className="text-right text-sm">
                          <div>{s.sets}×{s.repMin}–{s.repMax}</div>
                          <div className="text-xs text-slate-400">{st?.weight ? `${st.weight} kg${ex.perHand ? ' each' : ''}` : 'bodyweight'}{st && !st.calibrated ? ' (est.)' : ''}</div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Card>
          ))}
          <div className="flex gap-2">
            <Button variant="soft" className="flex-1" onClick={regenerate}>Rebuild plan</Button>
            {!deload && <Button variant="soft" className="flex-1" onClick={async () => { if (confirm('Start a deload week now?')) await save('plan', { ...plan, deloadRemaining: plan.days.length }) }}>Deload now</Button>}
          </div>
        </>
      )}

      {tab === 'history' && (
        <div className="space-y-3">
          {sessions.length === 0 && <Empty>No workouts yet. Your first session calibrates your starting weights.</Empty>}
          {sessions.map((s) => {
            const vol = s.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done).reduce((b, x) => b + x.reps * x.weight, 0), 0)
            return (
              <Card key={s.id}>
                <div className="flex items-start justify-between">
                  <Link to={`/session/${s.id}`} className="flex-1">
                    <div className="font-semibold">{s.dayName} <span className="text-sm font-normal text-slate-400">· {fmtDate(s.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span></div>
                    <div className="text-sm text-slate-400">Week {s.week}{s.deload ? ' (deload)' : ''} · readiness {s.readiness.score} · {s.sessionRpe ? `felt ${s.sessionRpe}/10` : 'in progress'} · {Math.round(vol)} kg volume</div>
                  </Link>
                  {!s.completed && <Button size="sm" variant="ghost" onClick={() => confirm('Discard this unfinished session?') && remove('sessions', s.id)}>Discard</Button>}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {tab === 'strength' && <StrengthCharts plan={plan} />}

      <Sheet open={logAct} onClose={() => setLogAct(false)} title="Log activity">
        {logAct && <LogActivity date={today()} kg={energy.kg} onDone={() => setLogAct(false)} />}
      </Sheet>

      <Sheet open={!!swap} onClose={() => setSwap(null)} title="Swap exercise">
        {swap && (
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Alternatives that fit your equipment and injuries:</p>
            {alternatives(swap.slot.pool, profile.equipment, profile.injuries).map((ex) => (
              <button key={ex.id} onClick={() => doSwap(ex.id)} className={`flex w-full items-center gap-3 rounded-xl border p-2 text-left ${ex.id === swap.slot.exerciseId ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700'}`}>
                <ExerciseDemo id={ex.id} className="h-16 w-20 shrink-0 rounded-lg" />
                <div><div className="font-medium">{ex.name}</div><div className="text-xs text-slate-400">{ex.cues[0]}</div></div>
              </button>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  )
}

function StrengthCharts({ plan }: { plan: Plan }) {
  const all = useLiveQuery(() => db.sessions.toArray(), [], [])
  const done = all.filter((s) => s.completed).sort((a, b) => a.date.localeCompare(b.date))
  const ids = useMemo(() => [...new Set(plan.days.flatMap((d) => d.slots.map((s) => s.exerciseId)))].filter((id) => EXERCISES[id].compound), [plan])
  const [sel, setSel] = useState(ids[0])
  const data = done.flatMap((s) => {
    const e = s.exercises.find((x) => x.exerciseId === sel)
    if (!e) return []
    const best = Math.max(0, ...e.sets.filter((x) => x.done).map((x) => e1rm(x.weight, x.reps)))
    return best ? [{ date: fmtDate(s.date), e1rm: Math.round(best * 10) / 10 }] : []
  })
  return (
    <Card title="Estimated 1-rep max">
      <select className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-2" value={sel} onChange={(e) => setSel(e.target.value)}>
        {ids.map((id) => <option key={id} value={id}>{EXERCISES[id].name}</option>)}
      </select>
      {data.length < 2 ? <Empty>Log at least 2 sessions with this exercise to see a trend.</Empty> : (
        <div className="h-56">
          <ResponsiveContainer>
            <LineChart data={data}>
              <CartesianGrid stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
              <Line dataKey="e1rm" stroke="#22c55e" strokeWidth={2} dot={false} name="e1RM (kg)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
