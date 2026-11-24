import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts'
import { AdviceList, Bar, Button, Card, Pill, Ring } from '../components/ui'
import { db } from '../db'
import { useEnergy, usePlan, useProfile } from '../hooks'
import { EXERCISES } from '../lib/exercises'
import { verdict, weeklyStats } from '../lib/insights'
import { totals, weightTrend } from '../lib/nutrition'
import { currentWeek, isDeloadWeek } from '../lib/plan'
import { readinessFromCheckin, readinessScore } from '../lib/progression'
import { today } from '../lib/util'

export default function Dashboard() {
  const profile = useProfile()
  const plan = usePlan()
  const energy = useEnergy(profile)
  const d = today()
  const checkin = useLiveQuery(() => db.checkins.get(d), [d])
  const weighed = useLiveQuery(() => db.weights.get(d), [d])
  const logs = useLiveQuery(() => db.foodLogs.where('date').equals(d).toArray(), [d], [])
  const todaysSession = useLiveQuery(() => db.sessions.where('date').equals(d).first(), [d])
  const photos = useLiveQuery(() => db.photos.toArray(), [], [])
  if (!profile || !plan || !energy) return null

  const t = totals(logs)
  const target = energy.targetFor(d)
  const r = readinessFromCheckin(checkin)
  const score = checkin ? readinessScore(r) : null
  const next = plan.days[plan.nextDayIdx]
  const ws = weeklyStats(energy.logs, energy.checkins, energy.sessions, energy.targetFor)
  const v = verdict(profile, energy.em, energy.forecast, plan, ws, photos)
  const trend = weightTrend(energy.weights).slice(-30)
  const hour = new Date().getHours()
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const lastPhoto = photos.filter((p) => p.pose === 'front').sort((a, b) => b.date.localeCompare(a.date))[0]
  const photoDue = !lastPhoto || lastPhoto.date !== d

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{greet}{profile.name ? `, ${profile.name}` : ''} 👋</h1>
        <p className="text-sm text-slate-400">{v.headline}</p>
      </div>

      {(!checkin || (profile.hasScale && !weighed)) && (
        <Link to="/checkin" className="block rounded-2xl border border-emerald-500/50 bg-emerald-500/10 p-4">
          <div className="font-bold">☀️ Daily check-in</div>
          <div className="text-sm text-slate-300">{profile.hasScale && !weighed ? 'Morning weight, ' : ''}sleep, energy, soreness — 30 seconds. Tunes today's workout and calories.</div>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Today's food" action={<Link to="/food" className="text-sm text-emerald-400">Log →</Link>}>
          <div className="flex items-center gap-4">
            <Ring value={t.kcal} max={target.kcal} size={104} stroke={10}>
              <div className="text-xl font-extrabold">{Math.max(0, target.kcal - t.kcal)}</div>
              <div className="text-[10px] text-slate-400">kcal left</div>
            </Ring>
            <div className="flex-1 space-y-2">
              <Bar label="Protein" value={t.protein} max={target.protein} color="bg-sky-500" />
              <Bar label="Calories" value={t.kcal} max={target.kcal} unit="kcal" />
            </div>
          </div>
        </Card>

        <Card title="Workout" action={<Pill tone={isDeloadWeek(plan) ? 'sky' : 'green'}>Wk {currentWeek(plan)}/{plan.mesoWeeks}</Pill>}>
          {todaysSession?.completed ? (
            <div><div className="font-bold">✅ {todaysSession.dayName} done</div><div className="text-sm text-slate-400">Felt {todaysSession.sessionRpe}/10. Recover, eat and sleep well.</div></div>
          ) : (
            <>
              <div className="text-lg font-bold">{next.name}</div>
              <div className="line-clamp-2 text-sm text-slate-400">{next.slots.map((s) => EXERCISES[s.exerciseId].name).join(' · ')}</div>
              {score !== null && <div className="mt-1 text-sm">Readiness: <b className={score >= 60 ? 'text-emerald-400' : score >= 40 ? 'text-amber-400' : 'text-rose-400'}>{score}/100</b></div>}
              <Link to="/train"><Button className="mt-3 w-full">{todaysSession ? 'Resume' : 'Go to workout'}</Button></Link>
            </>
          )}
        </Card>
      </div>

      <Card title="Weight" action={<Link to="/progress" className="text-sm text-emerald-400">Details →</Link>}>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-extrabold">{energy.forecast.current} <span className="text-base text-slate-400">kg</span></div>
            <div className="text-sm text-slate-400">Goal {profile.targetWeightKg} kg · 30-day forecast <b className="text-emerald-400">{energy.forecast.in30Plan} kg</b></div>
          </div>
        </div>
        {trend.length > 1 && (
          <div className="mt-2 h-20">
            <ResponsiveContainer>
              <LineChart data={trend}><YAxis hide domain={['dataMin - 0.3', 'dataMax + 0.3']} /><Line dataKey="trend" stroke="#22c55e" strokeWidth={2} dot={false} /></LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/progress" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-2xl">📸</div><div className="font-semibold">Progress photo</div><div className="text-xs text-slate-400">{photoDue ? 'Not taken today' : 'Done today ✓'}</div>
        </Link>
        <Link to="/activity" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="text-2xl">🚶</div><div className="font-semibold">Activity</div><div className="text-xs text-slate-400">{checkin ? `${checkin.steps.toLocaleString()} steps` : 'Log steps & sports'}</div>
        </Link>
      </div>

      <Card title="Coach"><AdviceList items={v.insights.slice(0, 4)} /></Card>
    </div>
  )
}
