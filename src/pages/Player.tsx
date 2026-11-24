import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ExerciseDemo from '../components/ExerciseDemo'
import { Button, cx, Ring, Stepper } from '../components/ui'
import { db, save } from '../db'
import { EXERCISES } from '../lib/exercises'
import { getSettings, setSettings } from '../lib/settings'
import type { Session } from '../types'

type Phase = 'ready' | 'work' | 'log' | 'rest' | 'done'
type Pos = { ei: number; si: number }

const EFFORT = [
  { v: 6, label: 'Easy', sub: '4+ left' },
  { v: 7, label: 'OK', sub: '3 left' },
  { v: 8, label: 'Hard', sub: '2 left' },
  { v: 9, label: 'V.hard', sub: '1 left' },
  { v: 10, label: 'Max', sub: '0 left' },
]

function firstOpen(s: Session, skipped: Set<number>): Pos | null {
  for (let ei = 0; ei < s.exercises.length; ei++) {
    if (skipped.has(ei)) continue
    const si = s.exercises[ei].sets.findIndex((x) => !x.done)
    if (si >= 0) return { ei, si }
  }
  return null
}

let audio: AudioContext | null = null
function beep(freq = 880, ms = 150) {
  if (!getSettings().sound) return
  try {
    audio ??= new AudioContext()
    const o = audio.createOscillator(), g = audio.createGain()
    o.frequency.value = freq
    g.gain.setValueAtTime(0.25, audio.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + ms / 1000)
    o.connect(g).connect(audio.destination)
    o.start()
    o.stop(audio.currentTime + ms / 1000)
  } catch { /* audio unavailable */ }
}

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.max(0, Math.floor(sec % 60))).padStart(2, '0')}`

export default function Player() {
  const { id } = useParams()
  const nav = useNavigate()
  const stored = useLiveQuery(() => db.sessions.get(id!), [id])
  const [s, setS] = useState<Session | null>(null)
  const [skipped, setSkipped] = useState<Set<number>>(new Set())
  const [pos, setPos] = useState<Pos | null>(null)
  const [phase, setPhase] = useState<Phase>('ready')
  const [paused, setPaused] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [timerEnd, setTimerEnd] = useState(Date.now() + 10_000) // ready countdown / rest end
  const [timerTotal, setTimerTotal] = useState(10)
  const [pausedLeft, setPausedLeft] = useState(0)
  const [pausedMs, setPausedMs] = useState(0)
  const pauseStarted = useRef(0)
  const lastBeep = useRef(-1)
  const [settings, setLocal] = useState(getSettings())
  const [log, setLog] = useState({ reps: 0, weight: 0, rpe: 8 })
  const [showCues, setShowCues] = useState(false)

  // Load once
  useEffect(() => {
    if (!stored || s) return
    setS(stored)
    const p = firstOpen(stored, new Set())
    setPos(p)
    if (!p) setPhase('done')
  }, [stored, s])

  // Keep the screen awake during the workout
  useEffect(() => {
    let lock: any
    const req = async () => { try { lock = await (navigator as any).wakeLock?.request('screen') } catch { /* unsupported */ } }
    req()
    const vis = () => document.visibilityState === 'visible' && req()
    document.addEventListener('visibilitychange', vis)
    return () => { document.removeEventListener('visibilitychange', vis); lock?.release?.() }
  }, [])

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200)
    return () => clearInterval(t)
  }, [])

  const left = paused ? pausedLeft : Math.max(0, (timerEnd - now) / 1000)
  const timed = phase === 'ready' || phase === 'rest'

  // Countdown beeps + phase change when the timer hits zero
  useEffect(() => {
    if (!timed || paused) return
    const sec = Math.ceil(left)
    if (sec <= 3 && sec > 0 && sec !== lastBeep.current) { lastBeep.current = sec; beep(660, 120) }
    if (left <= 0 && lastBeep.current !== 0) {
      lastBeep.current = 0
      beep(990, 400)
      navigator.vibrate?.([200, 100, 200])
      if (phase === 'ready' || settings.autoAdvance) setPhase('work')
    }
  }, [left, timed, paused, phase, settings.autoAdvance])

  const ex = s && pos ? s.exercises[pos.ei] : null
  const meta = ex ? EXERCISES[ex.exerciseId] : null
  if (!s) return null
  const totalSets = s.exercises.reduce((a, e) => a + e.sets.length, 0)
  const doneSets = s.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done).length, 0)
  const elapsed = Math.max(0, ((paused ? pauseStarted.current : now) - s.startedAt - pausedMs) / 1000)
  const bw = meta ? meta.increment === 0 : false

  function startTimer(sec: number) {
    setTimerTotal(sec)
    setTimerEnd(Date.now() + sec * 1000)
    lastBeep.current = -1
  }
  function togglePause() {
    if (paused) {
      setPausedMs((m) => m + (Date.now() - pauseStarted.current))
      if (timed) setTimerEnd(Date.now() + pausedLeft * 1000)
      setPaused(false)
    } else {
      pauseStarted.current = Date.now()
      setPausedLeft(left)
      setPaused(true)
    }
  }
  function addRest(delta: number) {
    if (paused) setPausedLeft((l) => Math.max(0, l + delta))
    else setTimerEnd((t) => Math.max(Date.now(), t + delta * 1000))
    setTimerTotal((t) => Math.max(1, t + delta))
    if (lastBeep.current === 0 && delta > 0) lastBeep.current = -1
  }
  function openLog() {
    const set = ex!.sets[pos!.si]
    setLog({ reps: set.reps, weight: set.weight, rpe: set.rpe })
    setPhase('log')
  }
  async function saveSet() {
    const nextS: Session = structuredClone(s!)
    const e = nextS.exercises[pos!.ei]
    e.sets[pos!.si] = { ...log, done: true }
    for (let j = pos!.si + 1; j < e.sets.length; j++) if (!e.sets[j].done) e.sets[j].weight = log.weight
    setS(nextS)
    await save('sessions', nextS)
    const p = firstOpen(nextS, skipped)
    if (!p) { setPhase('done'); beep(990, 600); return }
    const rest = EXERCISES[e.exerciseId].compound ? settings.restCompound : settings.restIsolation
    setPos(p)
    startTimer(rest)
    setPhase('rest')
  }
  function skipExercise() {
    const sk = new Set(skipped).add(pos!.ei)
    setSkipped(sk)
    const p = firstOpen(s!, sk)
    if (!p) return setPhase('done')
    setPos(p)
    setPhase('work')
  }
  function setDefaultRest(kind: 'restCompound' | 'restIsolation', v: number) {
    setLocal(setSettings({ [kind]: v }))
  }

  const restExercise = phase === 'rest' && pos ? s.exercises[pos.ei] : null // during rest, pos already points to the upcoming set

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button className="text-slate-400" onClick={() => nav(`/session/${s.id}`)}>✕</button>
        <div className="flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${(doneSets / totalSets) * 100}%` }} /></div>
          <div className="mt-1 flex justify-between text-xs text-slate-500"><span>{doneSets}/{totalSets} sets</span><span>{mmss(elapsed)}</span></div>
        </div>
        <button className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm" onClick={() => setLocal(setSettings({ sound: !settings.sound }))}>{settings.sound ? '🔊' : '🔇'}</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {phase === 'ready' && ex && meta && (
          <div className="flex h-full flex-col items-center justify-center gap-5 text-center">
            <div className="text-sm tracking-widest text-slate-400 uppercase">Get ready</div>
            <Ring value={left} max={timerTotal} size={180} stroke={12}><div className="text-6xl font-extrabold tabular-nums">{Math.ceil(left)}</div></Ring>
            <ExerciseDemo id={ex.exerciseId} className="h-40 w-56 rounded-2xl" />
            <div><div className="text-xl font-bold">{meta.name}</div><div className="text-slate-400">First up · {s.dayName}</div></div>
            <Button variant="soft" onClick={() => setPhase('work')}>Start now</Button>
          </div>
        )}

        {(phase === 'work' || phase === 'log') && ex && meta && pos && (
          <div className="mx-auto max-w-lg space-y-4 pb-6">
            <ExerciseDemo id={ex.exerciseId} playing={!paused} className="aspect-[4/3] w-full rounded-2xl" />
            <div>
              <div className="text-sm text-emerald-400">Exercise {pos.ei + 1}/{s.exercises.length} · Set {pos.si + 1} of {ex.sets.length}</div>
              <h1 className="text-2xl font-extrabold">{meta.name}</h1>
              <div className="mt-1 text-lg">
                <b>{ex.sets[pos.si].reps} reps</b>{!bw && <> × <b>{ex.sets[pos.si].weight} kg</b>{meta.perHand ? ' each' : ''}</>}
                <span className="text-slate-400"> · stop with ~{ex.targetRir} in the tank</span>
              </div>
              {ex.note && <div className="text-sm text-amber-300">{ex.note}</div>}
            </div>
            <button className="text-sm text-slate-400 underline" onClick={() => setShowCues(!showCues)}>{showCues ? 'Hide' : 'Show'} form tips</button>
            {showCues && <ul className="space-y-1 rounded-xl bg-slate-900 p-3 text-sm text-slate-300">{meta.cues.map((c) => <li key={c}>• {c}</li>)}</ul>}

            {phase === 'log' && (
              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="font-semibold">How did that set go?</div>
                <div className={cx('grid gap-2', bw ? 'grid-cols-1' : 'grid-cols-2')}>
                  {!bw && <div><div className="mb-1 text-xs text-slate-500 uppercase">kg{meta.perHand ? ' each' : ''}</div><Stepper compact value={log.weight} step={meta.increment >= 2.5 ? 2.5 : meta.increment || 1} onChange={(weight) => setLog({ ...log, weight })} /></div>}
                  <div><div className="mb-1 text-xs text-slate-500 uppercase">reps done</div><Stepper compact value={log.reps} onChange={(reps) => setLog({ ...log, reps })} /></div>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {EFFORT.map((o) => (
                    <button key={o.v} onClick={() => setLog({ ...log, rpe: o.v })} className={cx('rounded-lg border px-1 py-1.5 text-center leading-tight', log.rpe === o.v ? 'border-emerald-500 bg-emerald-500/15 text-emerald-200' : 'border-slate-700 text-slate-400')}>
                      <div className="text-xs font-semibold">{o.label}</div><div className="text-[10px] text-slate-500">{o.sub}</div>
                    </button>
                  ))}
                </div>
                <Button size="lg" className="w-full" onClick={saveSet}>Save set & rest</Button>
              </div>
            )}
          </div>
        )}

        {phase === 'rest' && restExercise && pos && (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-5 pt-4 text-center">
            <div className="text-sm tracking-widest text-slate-400 uppercase">{paused ? 'Paused' : 'Rest'}</div>
            <Ring value={left} max={timerTotal} size={200} stroke={14} color="#38bdf8">
              <div className="text-5xl font-extrabold tabular-nums">{mmss(Math.ceil(left))}</div>
            </Ring>
            <div className="flex gap-2">
              <Button variant="soft" onClick={() => addRest(-15)}>−15s</Button>
              <Button variant="soft" onClick={() => addRest(15)}>+15s</Button>
              <Button variant="soft" onClick={() => addRest(30)}>+30s</Button>
            </div>
            {left <= 0 && !settings.autoAdvance && <Button size="lg" onClick={() => setPhase('work')}>Start next set</Button>}
            <div className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-3 text-left">
              <div className="mb-2 text-xs tracking-wide text-slate-500 uppercase">Next up</div>
              <div className="flex items-center gap-3">
                <ExerciseDemo id={restExercise.exerciseId} className="h-20 w-24 shrink-0 rounded-xl" />
                <div>
                  <div className="font-semibold">{EXERCISES[restExercise.exerciseId].name}</div>
                  <div className="text-sm text-slate-400">Set {pos.si + 1} of {restExercise.sets.length} · {restExercise.sets[pos.si].reps} reps{EXERCISES[restExercise.exerciseId].increment ? ` × ${restExercise.sets[pos.si].weight} kg` : ''}</div>
                </div>
              </div>
            </div>
            <details className="w-full rounded-2xl border border-slate-800 bg-slate-900 p-3 text-left text-sm">
              <summary className="cursor-pointer text-slate-300">Rest settings</summary>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between gap-2"><span>Big lifts (compound)</span><Stepper compact value={settings.restCompound} step={15} min={30} max={420} onChange={(v) => setDefaultRest('restCompound', v)} /></div>
                <div className="flex items-center justify-between gap-2"><span>Isolation moves</span><Stepper compact value={settings.restIsolation} step={15} min={15} max={300} onChange={(v) => setDefaultRest('restIsolation', v)} /></div>
                <label className="flex items-center gap-2"><input type="checkbox" checked={settings.autoAdvance} onChange={(e) => setLocal(setSettings({ autoAdvance: e.target.checked }))} /> Start next set automatically when rest ends</label>
                <p className="text-xs text-slate-500">Seconds. 2–3 min for big lifts gives more reps (= more growth) than short rests.</p>
              </div>
            </details>
          </div>
        )}

        {phase === 'done' && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="text-6xl">🎉</div>
            <h1 className="text-2xl font-extrabold">Workout complete</h1>
            <p className="text-slate-400">{doneSets} sets in {mmss(elapsed)}. Rate how it felt so your next session adapts.</p>
            <Button size="lg" onClick={() => nav(`/session/${s.id}?finish=1`)}>Rate & finish</Button>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      {phase !== 'done' && (
        <div className="flex items-center gap-2 border-t border-slate-800 px-4 py-3">
          <Button variant="soft" onClick={togglePause}>{paused ? '▶ Resume' : '⏸ Pause'}</Button>
          {phase === 'work' && <Button variant="ghost" onClick={skipExercise}>Skip exercise</Button>}
          {phase === 'rest' && <Button variant="ghost" onClick={() => setPhase('work')}>Skip rest</Button>}
          {phase === 'work' && <Button className="ml-auto" size="lg" disabled={paused} onClick={openLog}>✓ Done</Button>}
          {phase === 'log' && <Button className="ml-auto" variant="ghost" onClick={() => setPhase('work')}>Back</Button>}
        </div>
      )}
      {paused && phase === 'work' && <div className="pointer-events-none absolute inset-x-0 top-1/3 text-center text-3xl font-bold text-white/80">Paused</div>}
    </div>
  )
}
