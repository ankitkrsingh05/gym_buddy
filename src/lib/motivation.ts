import type { Activity, FoodLog, Profile, Session, WeightEntry } from '../types'
import { EXERCISES } from './exercises'
import type { Macros } from './nutrition'
import { weightTrend } from './nutrition'
import { e1rm } from './progression'
import { addDays, parseDate, today } from './util'

// Original short lines — one per day, rotating.
const LINES = [
  'Muscle is built one ordinary day at a time. Make today one of them.',
  'You don\'t need a perfect day. You need a logged one.',
  'The weight on the bar goes up because you showed up.',
  'Eat like it\'s part of training — because it is.',
  'Small surplus, heavy-ish weights, good sleep. Repeat.',
  'Discipline is just remembering what you want.',
  'Every rep you log teaches the plan how to help you.',
  'Strong is a habit, not a mood.',
  'Rest days build what training days break down.',
  'Progress hides in consistency. Keep showing up.',
  'One more meal, one more set, one more good night\'s sleep.',
  'Future you is built by what you do this week.',
  'Hard sets, honest logs, steady gains.',
  'You are not behind. You are building.',
]

export interface Motivation { headline: string; line: string; chips: string[] }

export function motivation(p: Profile, sessions: Session[], weights: WeightEntry[], logs: FoodLog[], acts: Activity[], targetFor: (d: string) => Macros, totalWorkouts?: number): Motivation {
  const t = today()
  const done = sessions.filter((s) => s.completed).sort((a, b) => a.date.localeCompare(b.date))
  const chips: string[] = []

  // Week (Mon–Sun)
  const dow = (parseDate(t).getDay() + 6) % 7
  const monday = addDays(t, -dow)
  const weekDone = done.filter((s) => s.date >= monday).length
  chips.push(`💪 ${weekDone}/${p.daysPerWeek} workouts this week`)

  // Active-day streak (gym or other activity), today counts if done
  const activeDays = new Set([...done.map((s) => s.date), ...acts.map((a) => a.date)])
  let streak = 0
  for (let d = activeDays.has(t) ? t : addDays(t, -1); activeDays.has(d); d = addDays(d, -1)) streak++

  // Food streak: consecutive days hitting calorie target (yesterday backwards)
  const intake: Record<string, number> = {}
  for (const l of logs) intake[l.date] = (intake[l.date] ?? 0) + l.kcal
  let foodStreak = 0
  for (let d = addDays(t, -1); (intake[d] ?? 0) >= targetFor(d).kcal - 200; d = addDays(d, -1)) foodStreak++
  if (foodStreak >= 2) chips.push(`🍽️ ${foodStreak}-day calorie streak`)

  // Weight progress
  const tr = weightTrend(weights)
  const gained = tr.length >= 2 ? tr[tr.length - 1].trend - p.startWeightKg : 0
  if (Math.abs(gained) >= 0.2) chips.push(`⚖️ ${gained > 0 ? '+' : ''}${gained.toFixed(1)} kg since start`)
  chips.push(`🏋️ ${totalWorkouts ?? done.length} workouts total`)

  // Personal record in the latest session
  let pr: string | null = null
  const last = done[done.length - 1]
  if (last && last.date >= addDays(t, -2)) {
    for (const e of last.exercises) {
      const best = Math.max(0, ...e.sets.filter((x) => x.done).map((x) => e1rm(x.weight, x.reps)))
      const prev = Math.max(0, ...done.slice(0, -1).flatMap((s) => s.exercises.filter((x) => x.exerciseId === e.exerciseId).flatMap((x) => x.sets.filter((y) => y.done).map((y) => e1rm(y.weight, y.reps)))))
      if (best > 0 && prev > 0 && best > prev * 1.01) { pr = EXERCISES[e.exerciseId]?.name ?? e.exerciseId; break }
    }
  }

  const trainedToday = done.some((s) => s.date === t)
  const name = p.name ? `, ${p.name}` : ''
  let headline: string
  if (pr) headline = `New personal best on ${pr}! 🏆`
  else if (trainedToday) headline = `Workout done today${name} — now eat and recover. 🔥`
  else if (streak >= 3) headline = `${streak}-day active streak${name}. Don't break the chain! 🔗`
  else if (gained >= 1) headline = `You've gained ${gained.toFixed(1)} kg${name}. It's working. 📈`
  else if (weekDone >= p.daysPerWeek) headline = `All ${p.daysPerWeek} workouts done this week${name}! 🙌`
  else if (done.length === 0) headline = `Day one${name}. Every strong person started here. 🌱`
  else headline = `${Math.max(0, p.daysPerWeek - weekDone)} workout${p.daysPerWeek - weekDone === 1 ? '' : 's'} left this week${name}. You've got this. 💪`

  const doy = Math.floor((parseDate(t).getTime() - new Date(parseDate(t).getFullYear(), 0, 0).getTime()) / 86400000)
  return { headline, line: LINES[doy % LINES.length], chips }
}
