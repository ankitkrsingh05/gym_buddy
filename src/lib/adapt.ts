/**
 * Cross-domain adaptation: activities + food habits change workouts, and workouts + activities change food advice.
 */
import type { Activity, FoodItem, FoodLog, Muscle, Plan, Profile, Session } from '../types'
import { activityDef, activityLoad } from './activities'
import { alternatives, EXERCISES, MUSCLE_LABEL } from './exercises'
import { allowed, BUILTIN_FOODS } from './foods'
import type { Advice, Macros } from './nutrition'
import { addDays, avg, daysBetween, parseDate, today } from './util'

// ───────────────────────────── Workouts ─────────────────────────────

export interface TrainingAdapt {
  muscleDelta: Partial<Record<Muscle, number>>
  isolationDelta: number
  rirDelta: number
  notes: string[]
  /** Notes about specific muscles; only relevant if the day trains them */
  muscleNotes: { muscles: Muscle[]; text: string }[]
}

/** Notes that apply to a given plan day (drops muscle notes for muscles the day doesn't train). */
export function notesForDay(adapt: TrainingAdapt, plan: Plan, dayIdx: number): string[] {
  const used = new Set(plan.days[dayIdx % plan.days.length].slots.map((s) => EXERCISES[s.exerciseId].primary))
  return [...adapt.muscleNotes.filter((n) => n.muscles.some((m) => used.has(m))).map((n) => n.text), ...adapt.notes]
}

/** If today's planned day mostly hits fatigued muscles, find a better day to do instead. */
export function betterDay(plan: Plan, adapt: TrainingAdapt): { idx: number; name: string; why: string } | null {
  const tired = (Object.keys(adapt.muscleDelta) as Muscle[])
  if (!tired.length) return null
  const hits = (di: number) => plan.days[di].slots.filter((s) => tired.includes(EXERCISES[s.exerciseId].primary)).length
  const cur = plan.nextDayIdx % plan.days.length
  if (hits(cur) < 2) return null
  const best = plan.days.map((_, i) => i).filter((i) => i !== cur).sort((a, b) => hits(a) - hits(b) || ((a - cur + plan.days.length) % plan.days.length) - ((b - cur + plan.days.length) % plan.days.length))[0]
  if (best === undefined || hits(best) >= hits(cur)) return null
  return { idx: best, name: plan.days[best].name, why: `${plan.days[cur].name} hits ${hits(cur)} exercises for muscles that are still tired; ${plan.days[best].name} hits ${hits(best)}.` }
}

export function trainingAdaptations(opts: {
  activities: Activity[]
  logs: FoodLog[]
  targetFor: (d: string) => Macros
}): TrainingAdapt {
  const out: TrainingAdapt = { muscleDelta: {}, isolationDelta: 0, rirDelta: 0, notes: [], muscleNotes: [] }
  const t = today(), y = addDays(t, -1)

  // 1) Other activities in the last ~36 h load specific muscles → trim those muscles today
  const recent = opts.activities.filter((a) => a.date === t || a.date === y)
  const perMuscle: Partial<Record<Muscle, { load: number; from: Set<string> }>> = {}
  let totalLoad = 0
  for (const a of recent) {
    const load = activityLoad(a) * (a.date === y ? 0.8 : 1)
    totalLoad += load
    for (const m of activityDef(a.type).muscles) {
      const e = (perMuscle[m] ??= { load: 0, from: new Set() })
      e.load += load
      e.from.add(a.type.split(' –')[0])
    }
  }
  const groups: Record<string, { muscles: Muscle[]; d: number; from: string }> = {}
  for (const [m, e] of Object.entries(perMuscle) as [Muscle, { load: number; from: Set<string> }][]) {
    if (e.load >= 0.75) {
      const d = e.load >= 1.6 ? -2 : -1
      out.muscleDelta[m] = d
      const from = [...e.from].join(' + ')
      const g = (groups[`${from}|${d}`] ??= { muscles: [], d, from })
      g.muscles.push(m)
    }
  }
  for (const g of Object.values(groups)) {
    const names = g.muscles.map((m) => MUSCLE_LABEL[m].toLowerCase()).join(', ')
    out.muscleNotes.push({ muscles: g.muscles, text: `${g.from} worked your ${names} → ${-g.d} set${g.d < -1 ? 's' : ''} less for ${g.muscles.length > 1 ? 'each' : 'it'} today.` })
  }
  if (totalLoad >= 2) {
    out.rirDelta += 1
    out.notes.push('A lot of other activity in the last day — stop each set 1 rep earlier than usual today.')
  }
  const recovery = recent.filter((a) => activityDef(a.type).recovery)
  if (recovery.length && !out.notes.length && !out.muscleNotes.length) out.notes.push(`Nice — ${recovery[0].type.split(' –')[0].toLowerCase()} helps recovery. Plan unchanged.`)

  // 2) Fuel: how well you've eaten over the last 3 days
  const intake: Record<string, { kcal: number; protein: number }> = {}
  for (const l of opts.logs) {
    const e = (intake[l.date] ??= { kcal: 0, protein: 0 })
    e.kcal += l.kcal
    e.protein += l.protein
  }
  const days = [1, 2, 3].map((i) => addDays(t, -i)).filter((d) => (intake[d]?.kcal ?? 0) > 600)
  if (days.length >= 2) {
    const kPct = avg(days.map((d) => intake[d].kcal / opts.targetFor(d).kcal))
    const pPct = avg(days.map((d) => intake[d].protein / opts.targetFor(d).protein))
    if (kPct < 0.8) {
      out.isolationDelta = -1
      out.notes.push(`You've eaten ~${Math.round(kPct * 100)}% of your calorie target lately → 1 set less on isolation moves. Focus on matching last time's numbers, not beating them. Eat more today!`)
    } else if (kPct >= 0.95 && pPct >= 0.9) {
      out.notes.push('Well fuelled over the last few days — great day to push for extra reps.')
    }
    if (pPct < 0.75) out.notes.push(`Protein has been low (~${Math.round(pPct * 100)}% of target). Muscle growth needs it — have a protein-rich meal within 2 h after training.`)
  }
  return out
}

export interface PlanSuggestion {
  id: string
  level: 'info' | 'warn'
  title: string
  body: string
  action?: { label: string; kind: 'days'; value: number } | { label: string; kind: 'minutes'; value: number } | { label: string; kind: 'swap'; slotDayIdx: number; slotKey: string; exerciseId: string }
}

/** Longer-term suggestions from your actual habits (attendance, session length, skipped exercises, pain). */
export function planSuggestions(p: Profile, plan: Plan, sessions: Session[], activities: Activity[], logs: FoodLog[], targetFor: (d: string) => Macros): PlanSuggestion[] {
  const out: PlanSuggestion[] = []
  const t = today()
  const done = sessions.filter((s) => s.completed).sort((a, b) => b.date.localeCompare(a.date))
  const age = daysBetween(new Date(plan.createdAt).toISOString().slice(0, 10), t)

  // Attendance over the last 3 weeks
  if (age >= 14) {
    const window = Math.min(21, age)
    const expected = (p.daysPerWeek * window) / 7
    const got = done.filter((s) => daysBetween(s.date, t) < window).length
    if (got < expected * 0.6 && p.daysPerWeek > 2) {
      out.push({
        id: `days-${p.daysPerWeek}`, level: 'warn', title: `You're averaging ${((got / window) * 7).toFixed(1)} workouts/week (plan: ${p.daysPerWeek})`,
        body: `A plan you can actually follow beats a perfect one. Switching to ${p.daysPerWeek - 1} days rebuilds the split so each muscle is still trained enough.`,
        action: { label: `Switch to ${p.daysPerWeek - 1} days/week`, kind: 'days', value: p.daysPerWeek - 1 },
      })
    }
  }

  // Sessions running long
  const durs = done.slice(0, 5).filter((s) => s.endedAt).map((s) => (s.endedAt! - s.startedAt) / 60000).filter((m) => m > 10 && m < 240)
  if (durs.length >= 3) {
    const m = avg(durs)
    if (m > p.sessionMinutes * 1.3) {
      const realistic = [30, 45, 60, 75, 90].find((o) => o >= m - 5) ?? 90
      out.push({
        id: `long-${p.sessionMinutes}`, level: 'info', title: `Workouts take ~${Math.round(m)} min (planned ${p.sessionMinutes})`,
        body: realistic > p.sessionMinutes
          ? `Either stick to the rest timer to finish in ${p.sessionMinutes} min, or plan for ${realistic}-minute sessions so the plan matches your real gym time.`
          : 'Try keeping rests to the timer.',
        action: realistic > p.sessionMinutes ? { label: `Plan for ${realistic} min sessions`, kind: 'minutes', value: realistic } : undefined,
      })
    }
  }

  // Exercises you keep skipping → offer a swap
  plan.days.forEach((d, di) => {
    for (const slot of d.slots) {
      const hist = done.filter((s) => s.dayId === d.id).slice(0, 3).map((s) => s.exercises.find((e) => e.slotKey === slot.key && e.exerciseId === slot.exerciseId)).filter(Boolean)
      if (hist.length >= 2 && hist.filter((e) => e!.sets.every((x) => !x.done)).length >= 2) {
        const alt = alternatives(slot.pool, p.equipment, p.injuries).find((a) => a.id !== slot.exerciseId)
        if (alt) out.push({
          id: `swap-${slot.key}`, level: 'info', title: `You often skip ${EXERCISES[slot.exerciseId].name}`,
          body: `Swap it for ${alt.name}? It trains the same muscles.`,
          action: { label: `Swap to ${alt.name}`, kind: 'swap', slotDayIdx: di, slotKey: slot.key, exerciseId: alt.id },
        })
      }
    }
  })

  // Pain reports
  const pain = done.filter((s) => s.feeling === 'pain' && daysBetween(s.date, t) <= 14)
  if (pain.length) out.push({ id: `pain-${pain[0].id}`, level: 'warn', title: `Pain reported after ${pain.length} recent workout${pain.length > 1 ? 's' : ''}`, body: `${pain[0].painNote ? `"${pain[0].painNote}". ` : ''}Swap the exercise that hurts (tap it in the plan) and tell the app about the injury in Settings so similar moves are avoided. See a physio if it persists.` })

  // Lots of other activity → energy demand
  const weekActs = activities.filter((a) => daysBetween(a.date, t) < 7)
  const hours = weekActs.reduce((x, a) => x + (activityDef(a.type).recovery ? 0 : a.minutes / 60), 0)
  if (hours >= 4) {
    const logged = [1, 2, 3, 4, 5, 6, 7].map((i) => addDays(t, -i))
    const short = logged.filter((d) => {
      const k = logs.filter((l) => l.date === d).reduce((x, l) => x + l.kcal, 0)
      return k > 600 && k < targetFor(d).kcal - 250
    }).length
    out.push({
      id: `cardio-${t}`, level: short >= 3 ? 'warn' : 'info', title: `${hours.toFixed(1)} h of sports/cardio this week`,
      body: short >= 3 ? 'That burns a lot — and you were short on food several days. Eat back those calories (your target already includes them) or the scale won\'t move.' : 'Great for heart health. Your food target already includes it — keep eating to it.',
    })
  }
  return out
}

// ───────────────────────────── Food ─────────────────────────────

export interface Staple { name: string; count: number; perServing: FoodItem }

/** What you actually eat: frequency of foods over the last 30 days, normalised to one serving. */
export function staples(logs: FoodLog[]): Staple[] {
  const since = addDays(today(), -30)
  const m = new Map<string, FoodLog[]>()
  for (const l of logs) if (l.date >= since) m.set(l.name, [...(m.get(l.name) ?? []), l])
  return [...m.entries()].map(([name, ls]) => {
    const l = ls[ls.length - 1]
    const k = 1 / (l.servings || 1)
    const r = (x: number | undefined) => Math.round((x ?? 0) * k * 10) / 10
    return {
      name, count: ls.length,
      perServing: {
        id: `staple-${name}`, updatedAt: 0, name, serving: l.serving, kcal: Math.round(l.kcal * k), protein: r(l.protein), carbs: r(l.carbs), fat: r(l.fat),
        fiber: r(l.fiber), sugar: r(l.sugar), diet: 'vegan' as const, allergens: [], tags: l.tags, source: 'custom' as const,
      },
    }
  }).sort((a, b) => b.count - a.count)
}

export interface DayContext { workedOut: boolean; workoutEndedAt?: number; activityKcal: number; activityNames: string[] }

export function dayContext(date: string, sessions: Session[], activities: Activity[]): DayContext {
  const s = sessions.find((x) => x.date === date && x.completed)
  const acts = activities.filter((a) => a.date === date)
  return {
    workedOut: !!s, workoutEndedAt: s?.endedAt,
    activityKcal: acts.reduce((x, a) => x + a.kcal, 0),
    activityNames: acts.map((a) => a.type.split(' –')[0]),
  }
}

export interface Suggestion { title: string; why?: string; items: FoodItem[]; kcal: number; protein: number }

function fill(pool: FoodItem[], kcalLeft: number, proteinFirst: boolean, max = 3) {
  const chosen: FoodItem[] = []
  let k = 0, pr = 0
  const sorted = proteinFirst ? [...pool].sort((a, b) => b.protein / Math.max(1, b.kcal) - a.protein / Math.max(1, a.kcal)) : pool
  for (const f of sorted) {
    if (k >= kcalLeft - 60 || chosen.length >= max) break
    if (f.kcal < 40 || k + f.kcal > kcalLeft + 150 || chosen.some((c) => c.name === f.name)) continue
    chosen.push(f); k += f.kcal; pr += f.protein
  }
  return { items: chosen, kcal: Math.round(k), protein: Math.round(pr) }
}

/** Food suggestions that adapt to: your favourite foods, today's workout/activities, and what's still missing. */
export function smartSuggestions(p: Profile, kcalLeft: number, proteinLeft: number, logs: FoodLog[], ctx: DayContext, todaysLogs: FoodLog[]): Suggestion[] {
  if (kcalLeft < 120) return []
  const bad = (f: FoodItem) => f.tags.includes('junk') || f.tags.includes('alcohol') || f.tags.includes('sugary')
  const powders = ['Whey protein', 'Plant protein powder', 'Mass-gainer shake (homemade, whey)']
  const builtin = BUILTIN_FOODS.filter((f) => allowed(f, p) && !bad(f) && (p.usesWhey || !powders.includes(f.name)))
  const byName = (n: string) => builtin.find((f) => f.name === n)
  const fav = staples(logs).filter((s) => s.count >= 2 && !bad(s.perServing)).map((s) => s.perServing)
  const out: Suggestion[] = []

  // Post-workout protein if trained today and no protein-rich food logged since
  if (ctx.workedOut && proteinLeft > 15) {
    const after = todaysLogs.filter((l) => !ctx.workoutEndedAt || l.time >= ctx.workoutEndedAt)
    if (!after.some((l) => l.protein >= 20)) {
      const pool = [...fav.filter((f) => f.protein >= 15), ...['Whey protein', 'Egg bhurji', 'Chicken tikka', 'Paneer bhurji', 'Greek yogurt / hung curd', 'Soya chunks (cooked)', 'Tofu (firm)'].map(byName).filter(Boolean) as FoodItem[]]
      const r = fill(pool, Math.min(kcalLeft, 600), true, 2)
      if (r.items.length) out.push({ title: 'Post-workout protein', why: 'You trained today — 25–40 g protein in the next couple of hours helps muscle repair.', ...r })
    }
  }

  // Extra fuel for sports/cardio days: carbs first
  if (ctx.activityKcal >= 200) {
    const pool = [...fav.filter((f) => f.carbs >= 25), ...['Banana', 'Dates', 'Steamed rice', 'Roti with ghee', 'Oats porridge with milk, banana, honey', 'Potato (boiled)'].map(byName).filter(Boolean) as FoodItem[]]
    const r = fill(pool, Math.min(kcalLeft, ctx.activityKcal + 150), false)
    if (r.items.length) out.push({ title: `Refuel after ${ctx.activityNames.join(' & ').toLowerCase()}`, why: `You burned ~${ctx.activityKcal} extra kcal. Carbs refill your energy so tomorrow's gym session doesn't suffer.`, ...r })
  }

  // From foods you already eat (habit-based)
  if (fav.length) {
    const dense = fav.filter((f) => f.kcal >= 120)
    const r = fill(dense.length ? dense : fav, kcalLeft, proteinLeft > 25)
    if (r.items.length) out.push({ title: 'From foods you already eat', why: 'Picked from what you log most often — easiest to actually eat.', ...r })
  }

  // Generic ideas that fit the gap
  const liquid = [p.usesWhey ? 'Mass-gainer shake (homemade, whey)' : 'Banana-PB-oats milkshake', 'Milk (full cream)', 'Soy milk', 'Banana', 'Dates'].map(byName).filter(Boolean) as FoodItem[]
  const desk = ['Peanuts (roasted)', 'Almonds', 'Dates', 'Chikki (peanut)', 'Banana', 'Makhana roasted'].map(byName).filter(Boolean) as FoodItem[]
  const protein = ['Egg bhurji', 'Chicken tikka', 'Paneer bhurji', 'Soya chunks (cooked)', 'Greek yogurt / hung curd', 'Tofu (firm)', 'Sprouts chaat'].map(byName).filter(Boolean) as FoodItem[]
  const generic: [string, FoodItem[], boolean][] = proteinLeft > 30
    ? [['Protein-first snack', protein, true], ['Liquid calories (easiest)', liquid, false], ['Desk snack (no cooking)', desk, false]]
    : [['Liquid calories (easiest)', liquid, false], ['Desk snack (no cooking)', desk, false], ['Protein-first snack', protein, true]]
  for (const [title, pool, pf] of generic) {
    if (out.length >= 3) break
    const r = fill(pool, kcalLeft, pf)
    if (r.items.length) out.push({ title, ...r })
  }
  return out.slice(0, 3)
}

/** Patterns in your eating over the last 2–4 weeks. */
export function habitInsights(p: Profile, logs: FoodLog[], targetFor: (d: string) => Macros, sessions: Session[], activities: Activity[]): Advice[] {
  const out: Advice[] = []
  const since = addDays(today(), -28)
  const recent = logs.filter((l) => l.date >= since && l.date < today())
  const byDay: Record<string, FoodLog[]> = {}
  for (const l of recent) (byDay[l.date] ??= []).push(l)
  const days = Object.keys(byDay).filter((d) => byDay[d].reduce((x, l) => x + l.kcal, 0) > 600)
  if (days.length < 5) return out
  const dayKcal = (d: string) => byDay[d].reduce((x, l) => x + l.kcal, 0)

  // Weakest meal
  const slots = ['breakfast', 'lunch', 'snack', 'dinner'] as const
  const slotAvg = slots.map((s) => ({ s, k: avg(days.map((d) => byDay[d].filter((l) => l.meal === s).reduce((x, l) => x + l.kcal, 0))) }))
  const total = slotAvg.reduce((x, s) => x + s.k, 0)
  const weakMain = slotAvg.filter((s) => s.s !== 'snack').sort((a, b) => a.k - b.k)[0]
  if (weakMain && weakMain.k < total * 0.15) {
    out.push({ level: 'warn', title: `${weakMain.s[0].toUpperCase() + weakMain.s.slice(1)} is your weakest meal (~${Math.round(weakMain.k)} kcal)`, body: `Adding ~300 kcal there is the easiest win: e.g. ${weakMain.s === 'breakfast' ? 'eggs + toast, or an oats-banana-milk bowl' : 'an extra roti with ghee and a bowl of curd'}.` })
  }

  // Weekend vs weekday
  const we = days.filter((d) => [0, 6].includes(parseDate(d).getDay())), wd = days.filter((d) => ![0, 6].includes(parseDate(d).getDay()))
  if (we.length >= 2 && wd.length >= 3) {
    const diff = avg(we.map(dayKcal)) - avg(wd.map(dayKcal))
    if (Math.abs(diff) > 350) out.push({ level: 'info', title: `Weekends: ${diff > 0 ? '+' : ''}${Math.round(diff)} kcal vs weekdays`, body: diff < 0 ? 'You eat less on weekends — plan a big brunch or keep shakes going.' : 'Weekends make up for weekday gaps — try to spread it out more evenly for better training energy.' })
  }

  // Shakes help?
  const shakeDays = days.filter((d) => byDay[d].some((l) => l.tags.includes('drink') && (l.tags.includes('dense') || l.protein >= 20)))
  const hit = (ds: string[]) => ds.filter((d) => dayKcal(d) >= targetFor(d).kcal - 200).length / Math.max(1, ds.length)
  if (shakeDays.length >= 3 && days.length - shakeDays.length >= 3 && hit(shakeDays) - hit(days.filter((d) => !shakeDays.includes(d))) > 0.25) {
    out.push({ level: 'good', title: 'Shakes work for you', body: `You hit your calories on ${Math.round(hit(shakeDays) * 100)}% of shake days vs ${Math.round(hit(days.filter((d) => !shakeDays.includes(d))) * 100)}% without. Make it a daily habit.` })
  }

  // Training days vs rest days
  const trainDays = new Set(sessions.filter((s) => s.completed).map((s) => s.date))
  const td = days.filter((d) => trainDays.has(d)), rd = days.filter((d) => !trainDays.has(d))
  if (td.length >= 2 && rd.length >= 3) {
    const diff = avg(rd.map(dayKcal)) - avg(td.map(dayKcal))
    if (diff < -300) out.push({ level: 'info', title: `Rest days: ${Math.round(-diff)} kcal less than gym days`, body: 'Muscle is built on rest days too — keep eating to target even when you don\'t train.' })
  }

  // Sports days under-eaten
  const actDays = [...new Set(activities.filter((a) => a.kcal >= 200 && days.includes(a.date)).map((a) => a.date))]
  if (actDays.length >= 2) {
    const shortActs = actDays.filter((d) => dayKcal(d) < targetFor(d).kcal - 300).length
    if (shortActs >= 2) out.push({ level: 'warn', title: `Under-eating on sports/cardio days (${shortActs}/${actDays.length})`, body: 'Those days your target is higher. Have a carb + protein snack after the activity.' })
  }

  // Variety
  const unique = new Set(recent.map((l) => l.name)).size
  if (recent.length >= 30 && unique < 12) out.push({ level: 'info', title: `Low variety (${unique} different foods in 4 weeks)`, body: 'Repeating meals is fine for consistency — add a fruit and a vegetable you like for vitamins and fibre.' })

  if (p.mealsPerDay <= 2) {
    const meals = avg(days.map((d) => new Set(byDay[d].map((l) => l.meal)).size))
    if (meals >= 3) out.push({ level: 'good', title: `You're now eating ~${meals.toFixed(1)} meals a day`, body: 'Up from 2 — this is exactly what makes a surplus doable. Update your profile so tips match.' })
  }
  return out
}
