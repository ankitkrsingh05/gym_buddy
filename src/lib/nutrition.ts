import type { Activity, CheckIn, FoodLog, Pace, Profile, Session, WeightEntry } from '../types'
import { addDays, avg, clamp, daysBetween, round, sum, today } from './util'

/** kcal stored per kg of tissue gained during a bulk (mix of lean + fat). */
export const KCAL_PER_KG = 7000

export const PACE_INFO: Record<Pace, { surplus: number; label: string; desc: string }> = {
  lean: { surplus: 300, label: 'Lean bulk', desc: '≈0.25–0.3 kg/week. Mostly muscle, minimal fat.' },
  moderate: { surplus: 450, label: 'Moderate', desc: '≈0.4–0.5 kg/week. Faster, some fat gain.' },
  aggressive: { surplus: 650, label: 'Aggressive', desc: '≈0.6+ kg/week. For very skinny/hard gainers.' },
}

export function bmr(p: Profile, kg: number) {
  return 10 * kg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161)
}

const NEAT: Record<Profile['jobType'], number> = { desk: 1.2, standing: 1.35, active: 1.5 }

export function stepsKcal(steps: number, kg: number) {
  // ~0.57 kcal/step per 1000 kg-steps; first 3000 steps are part of the baseline factor
  return Math.max(0, steps - 3000) * 0.00057 * kg
}

export const MET: Record<string, number> = {
  'Walking (casual)': 3.0, 'Walking (brisk)': 4.3, 'Running': 9.0, 'Cycling': 7.0, 'Swimming': 7.0,
  'Cricket': 5.0, 'Football': 7.0, 'Badminton': 5.5, 'Basketball': 6.5, 'Tennis': 7.3, 'Table tennis': 4.0,
  'Yoga': 2.5, 'Stretching': 2.3, 'Dancing': 5.0, 'Hiking': 6.0, 'Stairs': 8.0, 'Household chores': 3.0,
  'HIIT': 8.0, 'Martial arts': 10.0, 'Skipping rope': 11.0, 'Other': 4.0,
}
const INTENSITY_MULT = { light: 0.8, moderate: 1, vigorous: 1.25 }

/** Net kcal above resting for an activity (MET − 1) × kg × hours */
export function activityKcal(type: string, minutes: number, intensity: Activity['intensity'], kg: number) {
  const met = (MET[type] ?? 4) * INTENSITY_MULT[intensity]
  return Math.round((met - 1) * kg * (minutes / 60))
}

export function workoutKcal(s: Session, kg: number) {
  const mins = s.endedAt ? (s.endedAt - s.startedAt) / 60000 : 50
  return Math.round((5 - 1) * kg * (clamp(mins, 10, 150) / 60))
}

export interface Macros { kcal: number; protein: number; carbs: number; fat: number; fiber: number }

export function macroTargets(kcal: number, kg: number): Macros {
  const protein = round(kg * 2.0)
  const fat = round(Math.max(kg * 0.9, (kcal * 0.25) / 9))
  const carbs = round(Math.max(0, (kcal - protein * 4 - fat * 9) / 4))
  return { kcal: round(kcal, 10), protein, fat, carbs, fiber: round((kcal / 1000) * 12) }
}

/** Exponentially-smoothed weight trend (removes water noise). */
export function weightTrend(weights: WeightEntry[], alpha = 0.15): { date: string; kg: number; trend: number }[] {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  let t: number | null = null
  return sorted.map((w) => {
    t = t === null ? w.kg : t + alpha * (w.kg - t)
    return { date: w.date, kg: w.kg, trend: Math.round(t * 100) / 100 }
  })
}

export function latestWeight(p: Profile, weights: WeightEntry[]) {
  const s = [...weights].sort((a, b) => b.date.localeCompare(a.date))
  return s[0]?.kg ?? p.startWeightKg
}

export interface EnergyModel {
  formulaMaint: number // BMR × NEAT + averaged planned training
  adaptiveMaint: number | null // observed maintenance from intake vs weight trend
  maintenance: number // blended baseline used for targets
  confidence: number // 0..1 how much we trust the adaptive estimate
  avgIntake: number | null
  loggedDays: number
  weeklyRateKg: number | null // observed trend kg/week
  targetRateKg: number
  surplus: number
}

/** Sum of logged kcal per date */
export function intakeByDate(logs: FoodLog[]) {
  const m: Record<string, number> = {}
  for (const l of logs) m[l.date] = (m[l.date] ?? 0) + l.kcal
  return m
}

/** Planned gym training, averaged over the week so the daily target stays steady (rest days need food to grow too). */
export function trainingKcalPerDay(p: Profile, kg: number) {
  return Math.round(((5 - 1) * kg * (p.sessionMinutes / 60) * p.daysPerWeek) / 7)
}

/** Steps + logged sports/cardio per date (gym sessions are already in the baseline). */
export function extraActivityByDate(_p: Profile, kg: number, checkins: CheckIn[], acts: Activity[], _sessions: Session[]) {
  const m: Record<string, number> = {}
  for (const c of checkins) m[c.date] = (m[c.date] ?? 0) + stepsKcal(c.steps, kg)
  for (const a of acts) m[a.date] = (m[a.date] ?? 0) + a.kcal
  return m
}

/**
 * Adaptive energy model (MacroFactor-style):
 *   observed maintenance = avg intake − (Δtrend × 7000 / days)
 * blended with the formula until there is enough data (≈3 weeks).
 */
export function energyModel(p: Profile, weights: WeightEntry[], logs: FoodLog[], extras: Record<string, number>): EnergyModel {
  const kg = latestWeight(p, weights)
  const formulaMaint = bmr(p, kg) * NEAT[p.jobType] + trainingKcalPerDay(p, kg)
  const surplus = PACE_INFO[p.pace].surplus
  const targetRateKg = (surplus * 7) / KCAL_PER_KG
  const end = today()
  const start = addDays(end, -27)
  const intake = intakeByDate(logs)
  const windowDays = Object.keys(intake).filter((d) => d >= start && d < end && intake[d] >= 600) // ignore obviously incomplete days
  const trend = weightTrend(weights).filter((w) => w.date >= start)
  let adaptiveMaint: number | null = null
  let weeklyRateKg: number | null = null
  let avgIntake: number | null = null
  let confidence = 0
  if (trend.length >= 2) {
    const span = daysBetween(trend[0].date, trend[trend.length - 1].date)
    if (span >= 7) weeklyRateKg = ((trend[trend.length - 1].trend - trend[0].trend) / span) * 7
  }
  if (windowDays.length) avgIntake = avg(windowDays.map((d) => intake[d]))
  if (avgIntake !== null && weeklyRateKg !== null && windowDays.length >= 7) {
    const avgExtra = avg(windowDays.map((d) => extras[d] ?? 0))
    const observed = avgIntake - (weeklyRateKg * KCAL_PER_KG) / 7 - avgExtra
    adaptiveMaint = clamp(observed, formulaMaint * 0.7, formulaMaint * 1.5)
    confidence = clamp((windowDays.length - 6) / 15, 0, 1) * clamp(trend.length / 14, 0, 1)
  }
  const maintenance = adaptiveMaint === null ? formulaMaint : formulaMaint * (1 - confidence) + adaptiveMaint * confidence
  return { formulaMaint, adaptiveMaint, maintenance, confidence, avgIntake, loggedDays: windowDays.length, weeklyRateKg, targetRateKg, surplus }
}

export function dailyTarget(p: Profile, em: EnergyModel, extraToday: number, kg: number): Macros {
  let kcal = em.maintenance + em.surplus + extraToday
  // If they've logged for weeks but aren't gaining at even half the target pace, nudge up
  if (em.weeklyRateKg !== null && em.confidence > 0.5 && em.weeklyRateKg < em.targetRateKg * 0.5) kcal += 100
  if (em.weeklyRateKg !== null && em.confidence > 0.5 && em.weeklyRateKg > em.targetRateKg * 1.6) kcal -= 100
  return macroTargets(kcal, kg)
}

export interface Forecast {
  current: number
  in30Plan: number // if you hit target daily
  in30Actual: number | null // at your logged habits
  in30Trend: number | null // by extrapolating the scale trend
  weeksToGoal: number | null
  waterNote?: string
}

export function forecast(p: Profile, weights: WeightEntry[], em: EnergyModel): Forecast {
  const tr = weightTrend(weights)
  const current = tr.length ? tr[tr.length - 1].trend : p.startWeightKg
  const in30Plan = current + (em.surplus * 30) / KCAL_PER_KG
  const in30Actual = em.avgIntake !== null ? current + ((em.avgIntake - em.maintenance) * 30) / KCAL_PER_KG : null
  const in30Trend = em.weeklyRateKg !== null ? current + (em.weeklyRateKg * 30) / 7 : null
  const rate = em.weeklyRateKg && em.weeklyRateKg > 0.05 ? em.weeklyRateKg : em.targetRateKg
  const weeksToGoal = p.targetWeightKg > current ? (p.targetWeightKg - current) / rate : null
  let waterNote: string | undefined
  if (p.usesCreatine && p.creatineStartDate && daysBetween(p.creatineStartDate, today()) < 28)
    waterNote = 'You started creatine recently — expect ~0.5–1.5 kg of extra water in muscle in the first weeks. That part is not fat or new tissue.'
  const r = (n: number) => Math.round(n * 10) / 10
  return {
    current: r(current), in30Plan: r(in30Plan), in30Actual: in30Actual === null ? null : r(in30Actual),
    in30Trend: in30Trend === null ? null : r(in30Trend), weeksToGoal: weeksToGoal === null ? null : Math.ceil(weeksToGoal), waterNote,
  }
}

export interface DayTotals extends Macros { sugar: number; byTag: Record<string, number>; meals: number }

export function totals(logs: FoodLog[]): DayTotals {
  const byTag: Record<string, number> = {}
  for (const l of logs) for (const t of l.tags) byTag[t] = (byTag[t] ?? 0) + l.kcal
  return {
    kcal: Math.round(sum(logs.map((l) => l.kcal))),
    protein: Math.round(sum(logs.map((l) => l.protein))),
    carbs: Math.round(sum(logs.map((l) => l.carbs))),
    fat: Math.round(sum(logs.map((l) => l.fat))),
    fiber: Math.round(sum(logs.map((l) => l.fiber))),
    sugar: Math.round(sum(logs.map((l) => l.sugar ?? 0))),
    byTag,
    meals: new Set(logs.map((l) => l.meal)).size,
  }
}

export interface Advice { level: 'good' | 'warn' | 'bad' | 'info'; title: string; body: string }

/** Rule-based coaching on a day's intake + recent pattern. */
export function foodAdvice(p: Profile, t: DayTotals, target: Macros, history: Record<string, number>, isToday: boolean): Advice[] {
  const out: Advice[] = []
  const gap = target.kcal - t.kcal
  const pGap = target.protein - t.protein
  if (t.kcal === 0) {
    out.push({ level: 'info', title: 'Nothing logged yet', body: `Your target today is ${target.kcal} kcal and ${target.protein} g protein.` })
    return out
  }
  if (gap > 150) out.push({ level: isToday ? 'warn' : 'bad', title: `${gap} kcal ${isToday ? 'still to eat' : 'short'}`, body: isToday ? 'See the suggestions above to close the gap without forcing huge meals.' : 'Missing calories is the #1 reason people fail to gain. Try adding one liquid meal (shake) daily.' })
  else if (gap < -400) out.push({ level: 'warn', title: `${-gap} kcal over target`, body: 'A little over is fine on a bulk, but consistently +400 adds extra fat. Keep the surplus moderate.' })
  else out.push({ level: 'good', title: 'Calories on target', body: 'Nice — this is exactly how weight gain happens: consistency.' })

  if (pGap > 15) out.push({ level: 'warn', title: `Protein low by ${pGap} g`, body: `Aim for ${target.protein} g (≈2 g/kg). ${p.dietType === 'vegan' ? 'Tofu, soy chunks, tempeh, legumes.' : p.dietType === 'vegetarian' ? 'Paneer, curd, milk, soy chunks, dal.' : 'Eggs, chicken, fish, curd, paneer.'}${p.usesWhey ? ' A whey scoop gives ~24 g.' : ''}` })
  else out.push({ level: 'good', title: 'Protein target hit', body: 'Protein + training is what turns the surplus into muscle.' })

  const junk = (t.byTag.junk ?? 0) + (t.byTag.sugary ?? 0)
  if (junk > t.kcal * 0.25) out.push({ level: 'warn', title: `${Math.round((junk / t.kcal) * 100)}% of calories from junk/sugar`, body: 'Junk fills the calorie gap but is low in protein and micronutrients. Swap some for nuts, peanut butter, milk, bananas, dates, ghee-rice.' })
  if ((t.byTag.fried ?? 0) > t.kcal * 0.3) out.push({ level: 'warn', title: 'Lots of fried food', body: 'Deep-fried food is fine occasionally. Prefer healthy fats: nuts, seeds, olive oil, ghee in moderation.' })
  if ((t.byTag.alcohol ?? 0) > 0) out.push({ level: 'bad', title: 'Alcohol logged', body: 'Alcohol hurts muscle protein synthesis and sleep. Keep it rare during a bulk.' })
  if (t.fiber > 45 && gap > 200) out.push({ level: 'info', title: 'Very high fibre', body: 'High-fibre, high-volume food fills you up fast. Swap some salad/veg volume for calorie-dense foods to eat more easily.' })
  if (t.sugar > 90) out.push({ level: 'warn', title: `${t.sugar} g sugar`, body: 'Try to get carbs from rice, roti, oats, potatoes and fruit rather than sweets and soft drinks.' })
  const fatPct = (t.fat * 9) / Math.max(1, t.kcal)
  if (fatPct > 0.45 && t.kcal > target.kcal * 0.5) out.push({ level: 'info', title: 'High fat share', body: `${Math.round(fatPct * 100)}% of calories from fat. Fine for calories, but add carbs around workouts for better training.` })
  if (p.mealsPerDay <= 2) out.push({ level: 'info', title: `You eat ${p.mealsPerDay} meals/day`, body: 'Hitting a surplus in 2 meals is hard. Add 1–2 easy "liquid" or snack meals: banana-peanut-butter milkshake, a handful of nuts + dates, curd with honey and oats.' })

  const last7 = Object.entries(history).filter(([d]) => d < today()).sort().slice(-7)
  if (last7.length >= 4) {
    const short = last7.filter(([, k]) => k < target.kcal - 250).length
    if (short >= 4) out.push({ level: 'bad', title: `Short on calories ${short} of the last ${last7.length} days`, body: 'Make it easier: eat by the clock (not hunger), use liquid calories, add 1 tbsp ghee/oil to meals, keep nuts handy at your desk.' })
  }
  return out
}

export const AVOID_LIST = [
  'Drinking lots of water right before/with meals — it fills you up. Drink between meals.',
  'Skipping breakfast when you only eat 2 meals — that\'s ~30% of your day gone.',
  'Relying on junk food/sweets for calories — gains will be mostly fat.',
  'Too much salad/raw veg volume if appetite is your limit — cook veg and add fat.',
  'Alcohol, and caffeine late in the day (hurts sleep → hurts recovery).',
  'Waiting until you feel hungry — set fixed meal times and reminders.',
]
