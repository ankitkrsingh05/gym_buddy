import type { ExerciseState, Muscle, Plan, PlanDay, PlanSlot, Profile } from '../types'
import { EXERCISES, pickFromPool, type Exercise } from './exercises'
import { round } from './util'

type Tpl = { name: string; pools: string[] }

const FB_A: Tpl = { name: 'Full Body A', pools: ['squat', 'hpush', 'hpull', 'hinge', 'lateral', 'biceps', 'triceps'] }
const FB_B: Tpl = { name: 'Full Body B', pools: ['hinge2', 'incline', 'vpull', 'lunge', 'vpush', 'hamIso', 'abs'] }
const FB_C: Tpl = { name: 'Full Body C', pools: ['squat2', 'hpush2', 'hpull2', 'hamIso', 'lateral', 'biceps2', 'calves'] }
const UP_A: Tpl = { name: 'Upper A', pools: ['hpush', 'hpull', 'vpush', 'vpull', 'lateral', 'biceps', 'triceps'] }
const LO_A: Tpl = { name: 'Lower A', pools: ['squat', 'hinge', 'lunge', 'hamIso', 'calves', 'abs'] }
const UP_B: Tpl = { name: 'Upper B', pools: ['incline', 'vpull2', 'hpull2', 'chestIso', 'rearDelt', 'triceps2', 'biceps2'] }
const LO_B: Tpl = { name: 'Lower B', pools: ['hinge2', 'squat2', 'quadIso', 'hamIso', 'calves', 'abs'] }
const PUSH_A: Tpl = { name: 'Push A', pools: ['hpush', 'vpush', 'incline', 'lateral', 'triceps', 'chestIso'] }
const PULL_A: Tpl = { name: 'Pull A', pools: ['vpull', 'hpull', 'rearDelt', 'biceps', 'biceps2', 'abs'] }
const LEGS_A: Tpl = { name: 'Legs A', pools: ['squat', 'hinge', 'lunge', 'hamIso', 'calves', 'abs'] }
const PUSH_B: Tpl = { name: 'Push B', pools: ['incline', 'hpush2', 'vpush', 'chestIso', 'lateral', 'triceps2'] }
const PULL_B: Tpl = { name: 'Pull B', pools: ['hpull2', 'vpull2', 'rearDelt', 'biceps2', 'biceps', 'abs'] }
const LEGS_B: Tpl = { name: 'Legs B', pools: ['hinge2', 'squat2', 'quadIso', 'hamIso', 'calves', 'abs'] }

export function splitFor(days: number): { split: string; tpls: Tpl[] } {
  if (days <= 2) return { split: 'Full Body ×2', tpls: [FB_A, FB_B] }
  if (days === 3) return { split: 'Full Body ×3', tpls: [FB_A, FB_B, FB_C] }
  if (days === 4) return { split: 'Upper / Lower', tpls: [UP_A, LO_A, UP_B, LO_B] }
  if (days === 5) return { split: 'Upper / Lower + Push / Pull / Legs', tpls: [UP_A, LO_A, PUSH_B, PULL_B, LEGS_B] }
  return { split: 'Push / Pull / Legs ×2', tpls: [PUSH_A, PULL_A, LEGS_A, PUSH_B, PULL_B, LEGS_B] }
}

function maxSlots(minutes: number) {
  if (minutes <= 35) return 4
  if (minutes <= 50) return 5
  if (minutes <= 65) return 6
  if (minutes <= 80) return 7
  return 8
}

function setsReps(ex: Exercise, p: Profile) {
  const beg = p.experience === 'beginner' || p.experience === 'novice'
  if (ex.compound) {
    if (ex.startBw === 0 && ex.increment === 0) return { sets: 3, repMin: 8, repMax: 15 }
    return beg ? { sets: 3, repMin: 8, repMax: 12 } : { sets: p.experience === 'advanced' ? 4 : 3, repMin: 6, repMax: 10 }
  }
  return { sets: beg ? 2 : 3, repMin: 10, repMax: 15 }
}

/** Estimate a conservative starting load. User calibrates on first session. */
export function startWeight(ex: Exercise, p: Profile): number {
  if (ex.startBw === 0) return 0
  const known: Partial<Record<string, number | undefined>> = {
    bb_bench: p.knownLifts.bench, bb_squat: p.knownLifts.squat, deadlift: p.knownLifts.deadlift,
    bb_row: p.knownLifts.row, bb_ohp: p.knownLifts.ohp,
  }
  if (known[ex.id]) return known[ex.id]!
  const expMult = { beginner: 0.7, novice: 1, intermediate: 1.4, advanced: 1.8 }[p.experience]
  let w = p.startWeightKg * ex.startBw * expMult
  const step = ex.perHand ? ex.increment || 1 : ex.increment >= 5 ? 5 : 2.5
  w = round(w, step)
  if (ex.equipment.includes('barbell')) w = Math.max(20, w) // empty Olympic bar
  return Math.max(step, w)
}

export function generatePlan(p: Profile, prev?: Plan): Plan {
  const { split, tpls } = splitFor(p.daysPerWeek)
  const limit = maxSlots(p.sessionMinutes)
  const days: PlanDay[] = tpls.map((t, di) => {
    let pools = [...t.pools]
    // Focus muscles: make sure their isolation slot survives trimming by moving it earlier.
    const focusPools = pools.filter((pl) => {
      const ex = pickFromPool(pl, p.equipment, p.injuries)
      return p.focus.includes(ex.primary) && !ex.compound
    })
    pools = [...pools.filter((x) => !focusPools.includes(x)).slice(0, 4), ...focusPools, ...pools.filter((x) => !focusPools.includes(x)).slice(4)]
    pools = pools.slice(0, limit)
    // Beginners rarely manage 8+ strict pull-ups: prefer pulldowns/rows while they build up
    const used: string[] = p.experience === 'beginner' ? ['pullup'] : []
    const slots: PlanSlot[] = pools.map((pool, i) => {
      const ex = pickFromPool(pool, p.equipment, p.injuries, used)
      used.push(ex.id)
      const sr = setsReps(ex, p)
      const focusBonus = p.focus.includes(ex.primary) ? 1 : 0
      return { key: `${di}-${i}`, pool, exerciseId: ex.id, sets: sr.sets + focusBonus, repMin: sr.repMin, repMax: sr.repMax }
    })
    return { id: `d${di}`, name: t.name, slots }
  })

  const exerciseState: Record<string, ExerciseState> = {}
  for (const d of days)
    for (const s of d.slots) {
      const ex = EXERCISES[s.exerciseId]
      exerciseState[ex.id] = prev?.exerciseState[ex.id] ?? {
        exerciseId: ex.id, weight: startWeight(ex, p), targetReps: s.repMin, failures: 0, calibrated: false,
      }
    }

  return {
    id: 'current',
    updatedAt: Date.now(),
    createdAt: prev?.createdAt ?? Date.now(),
    split,
    days,
    nextDayIdx: prev ? prev.nextDayIdx % days.length : 0,
    mesoNumber: prev?.mesoNumber ?? 1,
    mesoSessionCount: prev?.mesoSessionCount ?? 0,
    mesoWeeks: p.experience === 'beginner' ? 6 : 5,
    exerciseState: { ...(prev?.exerciseState ?? {}), ...exerciseState },
    muscleAdj: prev?.muscleAdj ?? {},
  }
}

/** Week (1-based) inside the mesocycle, derived from completed sessions so missed days don't break it. */
export function currentWeek(plan: Plan): number {
  const perWeek = plan.days.length
  return Math.min(plan.mesoWeeks, Math.floor(plan.mesoSessionCount / perWeek) + 1)
}

export function isDeloadWeek(plan: Plan) {
  return (plan.deloadRemaining ?? 0) > 0 || currentWeek(plan) === plan.mesoWeeks
}

/** Target reps-in-reserve by week: ramps effort up across the block, deload last. */
export function targetRir(plan: Plan): number {
  if (isDeloadWeek(plan)) return 4
  const w = currentWeek(plan)
  const ramp = plan.mesoWeeks === 6 ? [3, 3, 2, 2, 1] : [3, 2, 2, 1]
  return ramp[Math.min(w - 1, ramp.length - 1)]
}

/** Extra sets added in the later, harder weeks of a block (volume ramps). */
export function weekSetBonus(plan: Plan, ex: Exercise): number {
  if (isDeloadWeek(plan)) return 0
  const w = currentWeek(plan)
  return w >= plan.mesoWeeks - 2 && w > 2 && ex.compound ? 1 : 0
}

export const muscleOf = (exerciseId: string): Muscle => EXERCISES[exerciseId]?.primary ?? 'abs'
