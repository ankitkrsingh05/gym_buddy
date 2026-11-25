import type { CheckIn, ExerciseState, Muscle, Plan, Readiness, Session, SessionExercise } from '../types'
import { notesForDay, type TrainingAdapt } from './adapt'
import { EXERCISES } from './exercises'
import { currentWeek, isDeloadWeek, targetRir, weekSetBonus } from './plan'
import { avg, clamp, round, today, uid } from './util'

/** Readiness 0-100 from the pre-workout check-in. */
export function readinessScore(r: Omit<Readiness, 'score'>): number {
  let s = 70
  if (r.sleepHours < 5) s -= 25
  else if (r.sleepHours < 6) s -= 15
  else if (r.sleepHours < 7) s -= 5
  else if (r.sleepHours >= 8) s += 5
  s += (r.energy - 3) * 10
  s -= (r.soreness - 2) * 7
  s -= (r.stress - 2) * 5
  return clamp(Math.round(s), 0, 100)
}

export function readinessFromCheckin(c?: CheckIn): Omit<Readiness, 'score'> {
  return {
    sleepHours: c?.sleepHours ?? 7,
    energy: c?.energy ?? 3,
    soreness: c?.soreness ?? 2,
    stress: c?.stress ?? 2,
    soreMuscles: c?.soreMuscles ?? [],
  }
}

const plateRound = (w: number, inc: number) => (inc <= 0 ? 0 : round(w, inc >= 2.5 ? 2.5 : 1))

/**
 * Build today's prescription from the plan + readiness.
 * Adjusts sets/effort/weight for: mesocycle week, deload, low readiness, still-sore muscles, recovery history.
 */
export function buildSession(plan: Plan, readiness: Readiness, adapt?: TrainingAdapt): Session {
  const day = plan.days[plan.nextDayIdx % plan.days.length]
  const deload = isDeloadWeek(plan)
  let rir = targetRir(plan)
  const adjustments: string[] = []
  let setDelta = 0
  let loadMult = 1

  if (deload) {
    adjustments.push('Deload week: about half the sets, lighter loads (≈90%), stop far from failure. This is when you actually recover and grow.')
    loadMult = 0.9
  } else if (readiness.score < 40) {
    setDelta = -1
    rir += 1
    loadMult = 0.95
    adjustments.push(`Low readiness (${readiness.score}/100): 1 set less per exercise, loads −5%, keep ~${rir} reps in the tank.`)
  } else if (readiness.score < 55) {
    rir += 1
    adjustments.push(`Below-average readiness (${readiness.score}/100): same plan, but stop each set with ~${rir} reps in reserve.`)
  } else if (readiness.score >= 85) {
    adjustments.push(`Great readiness (${readiness.score}/100) — push for the top of your rep ranges today.`)
  }
  if (adapt && !deload) {
    rir += adapt.rirDelta
    adjustments.push(...notesForDay(adapt, plan, plan.nextDayIdx))
  }

  const exercises: SessionExercise[] = day.slots.map((slot) => {
    const ex = EXERCISES[slot.exerciseId]
    const st = plan.exerciseState[slot.exerciseId]
    let sets = slot.sets + weekSetBonus(plan, ex) + (plan.muscleAdj[ex.primary] ?? 0) + setDelta
    let note: string | undefined
    if (readiness.soreMuscles.includes(ex.primary) && !deload) {
      sets -= 1
      note = `${ex.primary} still sore → 1 set less today`
    }
    if (adapt && !deload) {
      const md = adapt.muscleDelta[ex.primary] ?? 0
      if (md) { sets += md; note = note ?? `Trimmed ${-md} set${md < -1 ? 's' : ''} — this muscle worked hard in another activity recently` }
      if (!ex.compound) sets += adapt.isolationDelta
    }
    if (deload) sets = Math.ceil(slot.sets / 2)
    sets = clamp(sets, 1, 6)
    const w = st?.weight ?? 0
    return {
      slotKey: slot.key,
      exerciseId: slot.exerciseId,
      targetSets: sets,
      repMin: slot.repMin,
      repMax: slot.repMax,
      targetReps: deload ? slot.repMin : st?.targetReps ?? slot.repMin,
      targetWeight: plateRound(w * loadMult, ex.increment) || w,
      targetRir: rir,
      note,
      sets: Array.from({ length: sets }, () => ({
        reps: deload ? slot.repMin : st?.targetReps ?? slot.repMin,
        weight: plateRound(w * loadMult, ex.increment) || w,
        rpe: 10 - rir,
        done: false,
      })),
    }
  })

  return {
    id: uid(),
    updatedAt: Date.now(),
    date: today(),
    dayId: day.id,
    dayName: day.name,
    week: currentWeek(plan),
    meso: plan.mesoNumber,
    deload,
    readiness,
    adjustments,
    exercises,
    startedAt: Date.now(),
    completed: false,
  }
}

export interface ProgressResult {
  state: ExerciseState
  note: string
  outcome: 'increase' | 'reps' | 'hold' | 'fail' | 'reset' | 'skip'
}

/**
 * Double progression with effort (RPE) autoregulation:
 * - all sets hit top of the rep range at/under target effort → add weight (double jump if it felt easy)
 * - hit the range → add a rep next time
 * - grinding (effort way above target) → hold
 * - missed the bottom of the range → hold; two misses in a row → drop 10% and rebuild
 */
export function progressExercise(se: SessionExercise, prev: ExerciseState | undefined, deload: boolean): ProgressResult {
  const ex = EXERCISES[se.exerciseId]
  const done = se.sets.filter((s) => s.done && s.reps > 0)
  const base: ExerciseState = prev ?? { exerciseId: se.exerciseId, weight: se.targetWeight, targetReps: se.repMin, failures: 0, calibrated: false }
  if (done.length === 0) return { state: base, note: 'Skipped — no change.', outcome: 'skip' }
  if (deload) return { state: { ...base, lastDate: today() }, note: 'Deload — progression paused.', outcome: 'hold' }

  // Use the heaviest weight that was actually used for most sets as the new baseline
  const weight = Math.max(...done.map((s) => s.weight))
  const working = done.filter((s) => s.weight === weight)
  const reps = working.map((s) => s.reps)
  const rpe = avg(working.map((s) => s.rpe))
  const targetRpe = 10 - se.targetRir
  const completedPlan = done.length >= Math.ceil(se.targetSets * 0.75)
  const allTop = reps.every((r) => r >= se.repMax)
  const allMin = reps.every((r) => r >= se.repMin)
  const minReps = Math.min(...reps)
  const st: ExerciseState = { ...base, weight, calibrated: true, lastDate: today() }
  const bodyweight = ex.increment === 0

  if (!base.calibrated) {
    // First time: lock in what they actually lifted, then progress normally from there
    st.targetReps = clamp(minReps + (rpe <= targetRpe ? 1 : 0), se.repMin, se.repMax)
    if (allTop && rpe <= targetRpe - 1 && !bodyweight) {
      st.weight = weight + ex.increment
      st.targetReps = se.repMin
      return { state: st, note: `Calibrated. Felt easy at ${weight}kg → next time ${st.weight}kg.`, outcome: 'increase' }
    }
    return { state: st, note: `Calibrated at ${weight || 'bodyweight'}${weight ? 'kg' : ''}. Aim for ${st.targetReps} reps next time.`, outcome: 'reps' }
  }

  if (allTop && completedPlan && rpe <= targetRpe + 0.5) {
    if (bodyweight) {
      st.targetReps = se.repMax
      st.failures = 0
      return { state: st, note: 'Top of the range on bodyweight — switch to a harder variation or add load (backpack/band).', outcome: 'increase' }
    }
    const jump = rpe <= targetRpe - 2 ? ex.increment * 2 : ex.increment
    st.weight = weight + jump
    st.targetReps = se.repMin
    st.failures = 0
    return { state: st, note: `Hit ${se.repMax}+ reps on all sets at RPE ${rpe.toFixed(1)} → +${jump}kg next time (${st.weight}kg).`, outcome: 'increase' }
  }
  if (allMin) {
    st.failures = 0
    if (rpe > targetRpe + 1.5) {
      st.targetReps = clamp(minReps, se.repMin, se.repMax)
      return { state: st, note: `Reps were there but it was a grind (RPE ${rpe.toFixed(1)}). Hold weight and reps, own them next time.`, outcome: 'hold' }
    }
    st.targetReps = clamp(minReps + 1, se.repMin, se.repMax)
    return { state: st, note: `Solid. Same weight, aim for ${st.targetReps} reps on every set next time.`, outcome: 'reps' }
  }
  st.failures = base.failures + 1
  if (st.failures >= 2 && !bodyweight) {
    st.weight = Math.max(ex.equipment.includes('barbell') ? 20 : ex.increment, round(weight * 0.9, ex.increment >= 2.5 ? 2.5 : 1))
    st.targetReps = se.repMin
    st.failures = 0
    return { state: st, note: `Missed the rep range twice → reset to ${st.weight}kg and build back up (this is normal and works).`, outcome: 'reset' }
  }
  st.targetReps = se.repMin
  return { state: st, note: `Below ${se.repMin} reps. Keep ${weight}kg and try again — check sleep and food.`, outcome: 'fail' }
}

/** Finish a session: update exercise states, muscle volume, mesocycle counters. */
export function applySession(plan: Plan, s: Session, recentSessions: Session[]): { plan: Plan; session: Session; summary: string[] } {
  const next: Plan = structuredClone(plan)
  const summary: string[] = []
  const outcomes: Record<string, ProgressResult['outcome'][]> = {}
  const exercises = s.exercises.map((se) => {
    const r = progressExercise(se, next.exerciseState[se.exerciseId], s.deload)
    next.exerciseState[se.exerciseId] = r.state
    const m = EXERCISES[se.exerciseId].primary
    ;(outcomes[m] ??= []).push(r.outcome)
    return { ...se, progressionNote: r.note }
  })

  // Muscle volume autoregulation: sore at next session → less volume; progressing & recovered → more
  if (!s.deload) {
    for (const [m, outs] of Object.entries(outcomes) as [Muscle, ProgressResult['outcome'][]][]) {
      const cur = next.muscleAdj[m] ?? 0
      const sore = s.readiness.soreMuscles.includes(m)
      const failing = outs.filter((o) => o === 'fail' || o === 'reset').length > 0
      const progressing = outs.every((o) => o === 'increase' || o === 'reps')
      if ((sore && failing) || (failing && (s.sessionRpe ?? 7) >= 9)) {
        if (cur > -2) { next.muscleAdj[m] = cur - 1; summary.push(`${m}: recovering slowly → −1 set`) }
      } else if (progressing && !sore && (s.sessionRpe ?? 7) <= 8 && s.readiness.score >= 60) {
        if (cur < 2 && (plan.mesoSessionCount + 1) % plan.days.length === 0) { next.muscleAdj[m] = cur + 1; summary.push(`${m}: recovering well → +1 set`) }
      }
    }
  }

  // Fatigue check → early deload suggestion
  const lastTwo = [s, ...recentSessions].slice(0, 3)
  const highEffort = lastTwo.filter((x) => (x.sessionRpe ?? 0) >= 9).length
  const lowReady = lastTwo.filter((x) => x.readiness.score < 45).length
  const fails = exercises.filter((e) => /Missed|Below|reset/.test(e.progressionNote ?? '')).length
  if (!s.deload && ((highEffort >= 2 && lowReady >= 2) || fails >= 3)) {
    next.deloadRemaining = plan.days.length
    summary.push('Fatigue is piling up (hard sessions, low readiness or several misses). The next week switches to a deload.')
  }

  next.nextDayIdx = (plan.nextDayIdx + 1) % plan.days.length
  const blockLen = plan.days.length * plan.mesoWeeks
  let newBlock = false
  if ((plan.deloadRemaining ?? 0) > 0 && s.deload) {
    next.deloadRemaining = (plan.deloadRemaining ?? 1) - 1
    if (next.deloadRemaining === 0) newBlock = true
  } else {
    next.mesoSessionCount += 1
    if (next.mesoSessionCount >= blockLen) newBlock = true
  }
  if (newBlock) {
    next.mesoNumber += 1
    next.mesoSessionCount = 0
    next.deloadRemaining = 0
    summary.push(`Block ${plan.mesoNumber} complete! Starting block ${next.mesoNumber} from your new, stronger baseline.`)
  }
  const done: Session = { ...s, exercises, completed: true, endedAt: Date.now() }
  return { plan: next, session: done, summary }
}

/** Epley estimated 1RM for strength charts */
export const e1rm = (w: number, reps: number) => (w <= 0 ? 0 : w * (1 + reps / 30))
