import type { CheckIn, FoodLog, Photo, Plan, Profile, Session } from '../types'
import type { EnergyModel, Forecast, Macros } from './nutrition'
import { intakeByDate } from './nutrition'
import { addDays, avg, today } from './util'

export interface Insight { level: 'good' | 'warn' | 'bad' | 'info'; title: string; body: string }

export interface Verdict { status: 'on-track' | 'slow' | 'fast' | 'early'; headline: string; insights: Insight[] }

export function weeklyStats(logs: FoodLog[], checkins: CheckIn[], sessions: Session[], targetFor: (d: string) => Macros) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), -6 + i))
  const intake = intakeByDate(logs)
  const protein: Record<string, number> = {}
  for (const l of logs) protein[l.date] = (protein[l.date] ?? 0) + l.protein
  const logged = days.filter((d) => (intake[d] ?? 0) > 600)
  const kcalHit = logged.filter((d) => intake[d] >= targetFor(d).kcal - 200).length
  const proteinHit = logged.filter((d) => protein[d] >= targetFor(d).protein - 15).length
  const ci = checkins.filter((c) => days.includes(c.date))
  const done = sessions.filter((s) => s.completed && days.includes(s.date))
  return {
    days, logged: logged.length, kcalHit, proteinHit,
    avgKcal: Math.round(avg(logged.map((d) => intake[d]))),
    avgProtein: Math.round(avg(logged.map((d) => protein[d] ?? 0))),
    avgSleep: ci.length ? Math.round(avg(ci.map((c) => c.sleepHours)) * 10) / 10 : null,
    avgSteps: ci.length ? Math.round(avg(ci.map((c) => c.steps))) : null,
    avgEnergy: ci.length ? Math.round(avg(ci.map((c) => c.energy)) * 10) / 10 : null,
    sessions: done.length,
    avgSessionRpe: done.length ? Math.round(avg(done.map((s) => s.sessionRpe ?? 7)) * 10) / 10 : null,
  }
}

export function verdict(p: Profile, em: EnergyModel, fc: Forecast, plan: Plan | undefined, ws: ReturnType<typeof weeklyStats>, photos: Photo[]): Verdict {
  const ins: Insight[] = []
  let status: Verdict['status'] = 'early'
  let headline = 'Collecting data — log weight daily and food for 2 weeks for an accurate verdict.'
  if (em.weeklyRateKg !== null) {
    const r = em.weeklyRateKg, t = em.targetRateKg
    if (r < t * 0.5) {
      status = 'slow'
      const add = Math.round(((t - r) * 7000) / 7 / 50) * 50
      headline = `Gaining ${r.toFixed(2)} kg/week — below your ${t.toFixed(2)} kg/week goal.`
      ins.push({ level: 'bad', title: `Eat ~${Math.max(100, add)} kcal more per day`, body: 'Your scale trend is slower than planned. The calorie target has been nudged up — the easiest fix is one extra shake or snack daily.' })
    } else if (r > t * 1.6) {
      status = 'fast'
      headline = `Gaining ${r.toFixed(2)} kg/week — faster than your ${t.toFixed(2)} kg/week goal.`
      ins.push({ level: 'warn', title: 'Slightly reduce the surplus', body: 'Gaining much faster than planned usually means more fat. Trim ~150–200 kcal (often junk/sugary items) unless you are in the first 2 weeks or just started creatine.' })
    } else {
      status = 'on-track'
      headline = `On track: +${r.toFixed(2)} kg/week (goal ${t.toFixed(2)}).`
      ins.push({ level: 'good', title: 'Rate of gain is right', body: 'Keep doing exactly what you are doing.' })
    }
  }
  if (fc.waterNote) ins.push({ level: 'info', title: 'Creatine water weight', body: fc.waterNote })

  if (ws.logged < 4) ins.push({ level: 'warn', title: `Food logged only ${ws.logged}/7 days`, body: 'The app learns your true maintenance from food + weight. More logging = smarter targets.' })
  else ins.push({ level: ws.kcalHit >= 5 ? 'good' : 'warn', title: `Calorie target hit ${ws.kcalHit}/${ws.logged} days`, body: ws.kcalHit >= 5 ? 'Great consistency.' : 'Consistency beats perfection: aim for 5+ days a week.' })
  if (ws.logged >= 3) ins.push({ level: ws.proteinHit >= 5 ? 'good' : 'warn', title: `Protein target hit ${ws.proteinHit}/${ws.logged} days (avg ${ws.avgProtein} g)`, body: 'Protein is what turns your surplus into muscle instead of fat.' })

  const planned = plan?.days.length ?? p.daysPerWeek
  ins.push({ level: ws.sessions >= planned ? 'good' : ws.sessions >= planned - 1 ? 'info' : 'warn', title: `${ws.sessions}/${planned} workouts this week`, body: ws.sessions >= planned ? 'All sessions done.' : 'Missed sessions slow muscle gain. Shorter sessions beat skipped ones.' })
  if (ws.avgSessionRpe !== null && ws.avgSessionRpe >= 9) ins.push({ level: 'warn', title: 'Workouts feel very hard', body: `Average ${ws.avgSessionRpe}/10. If this continues the plan will add a deload. Check sleep and food first.` })
  if (ws.avgSleep !== null && ws.avgSleep < 7) ins.push({ level: 'warn', title: `Sleep averaging ${ws.avgSleep} h`, body: 'Under 7 h noticeably reduces muscle gain and increases fat gain. Even 30 min more helps.' })
  if (ws.avgSteps !== null && ws.avgSteps > 12000) ins.push({ level: 'info', title: `High activity (${ws.avgSteps} steps)`, body: 'Great for health — your calorie target includes it. Make sure you eat for it.' })

  const front = photos.filter((x) => x.pose === 'front' && x.metrics && x.metrics.confidence > 0.5).sort((a, b) => a.date.localeCompare(b.date))
  if (front.length >= 2) {
    const a = front[0].metrics!, b = front[front.length - 1].metrics!
    const sh = b.shoulderWidth / a.shoulderWidth - 1, wa = b.waistWidth / a.waistWidth - 1
    if (wa > 0.04 && wa > sh + 0.02) ins.push({ level: 'warn', title: 'Photos: waist growing faster than shoulders', body: 'Consider switching to Lean pace and prioritise protein + training effort.' })
    else if (sh > 0.015) ins.push({ level: 'good', title: 'Photos: shoulders/upper body getting wider', body: `+${(sh * 100).toFixed(1)}% shoulder width vs your first photo.` })
  } else ins.push({ level: 'info', title: 'Take progress photos', body: 'Weekly front photos let the app check whether you are gaining muscle (shoulders ↑) or mostly fat (waist ↑).' })

  return { status, headline, insights: ins }
}

export function summaryForAi(ws: ReturnType<typeof weeklyStats>, em: EnergyModel, fc: Forecast) {
  return [
    `Food logged ${ws.logged}/7 days, avg ${ws.avgKcal} kcal, ${ws.avgProtein} g protein. Calorie target hit ${ws.kcalHit} days, protein hit ${ws.proteinHit} days.`,
    `Estimated maintenance ${Math.round(em.maintenance)} kcal, target surplus ${em.surplus}.`,
    `Weight trend ${fc.current} kg, rate ${em.weeklyRateKg?.toFixed(2) ?? 'unknown'} kg/week vs goal ${em.targetRateKg.toFixed(2)}.`,
    `Workouts ${ws.sessions}, avg session difficulty ${ws.avgSessionRpe ?? 'n/a'}/10. Avg sleep ${ws.avgSleep ?? 'n/a'} h, steps ${ws.avgSteps ?? 'n/a'}, energy ${ws.avgEnergy ?? 'n/a'}/5.`,
  ].join('\n')
}
