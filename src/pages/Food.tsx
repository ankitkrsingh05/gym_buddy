import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import AddFood, { logFromFood } from '../components/AddFood'
import { AdviceList, Bar, Button, Card, Ring, Sheet } from '../components/ui'
import { db, remove, save } from '../db'
import { useEnergy, useProfile } from '../hooks'
import { dayContext, habitInsights, smartSuggestions } from '../lib/adapt'
import { AVOID_LIST, foodAdvice, intakeByDate, totals } from '../lib/nutrition'
import { addDays, fmtDate, today } from '../lib/util'
import type { MealSlot } from '../types'

const MEALS: { key: MealSlot; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' }, { key: 'lunch', label: 'Lunch' }, { key: 'snack', label: 'Snacks' }, { key: 'dinner', label: 'Dinner' },
]

export default function Food() {
  const profile = useProfile()
  const energy = useEnergy(profile)
  const [date, setDate] = useState(today())
  const [adding, setAdding] = useState(false)
  const [showAvoid, setShowAvoid] = useState(false)
  const logs = useLiveQuery(() => db.foodLogs.where('date').equals(date).toArray(), [date], [])
  if (!profile || !energy) return null

  const t = totals(logs)
  const target = energy.targetFor(date)
  const advice = foodAdvice(profile, t, target, intakeByDate(energy.logs), date === today())
  const ctx = dayContext(date, energy.sessions, energy.acts)
  const sugg = smartSuggestions(profile, target.kcal - t.kcal, target.protein - t.protein, energy.logs, ctx, logs)
  const habits = habitInsights(profile, energy.logs, energy.targetFor, energy.sessions, energy.acts)
  const dayNotes = [
    ctx.workedOut && 'Gym day',
    ctx.activityKcal > 0 && `+${ctx.activityKcal} kcal from ${ctx.activityNames.join(', ').toLowerCase()}`,
  ].filter(Boolean) as string[]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button className="rounded-lg px-3 py-1 text-xl text-slate-400" onClick={() => setDate(addDays(date, -1))}>‹</button>
        <h1 className="text-xl font-bold">{date === today() ? 'Today' : fmtDate(date, { weekday: 'short', day: 'numeric', month: 'short' })}</h1>
        <button className="rounded-lg px-3 py-1 text-xl text-slate-400 disabled:opacity-20" disabled={date >= today()} onClick={() => setDate(addDays(date, 1))}>›</button>
      </div>

      <Card>
        <div className="flex items-center gap-5">
          <Ring value={t.kcal} max={target.kcal} size={128}>
            <div className="text-2xl font-extrabold">{t.kcal}</div>
            <div className="text-xs text-slate-400">of {target.kcal}</div>
          </Ring>
          <div className="flex-1 space-y-2.5">
            <Bar label="Protein" value={t.protein} max={target.protein} color="bg-sky-500" />
            <Bar label="Carbs" value={t.carbs} max={target.carbs} color="bg-amber-500" />
            <Bar label="Fat" value={t.fat} max={target.fat} color="bg-rose-500" />
            <Bar label="Fibre" value={t.fiber} max={target.fiber} color="bg-lime-500" />
          </div>
        </div>
        {dayNotes.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{dayNotes.map((n) => <span key={n} className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-300">{n}</span>)}</div>}
        <p className="mt-3 text-xs text-slate-500">
          Target = maintenance {Math.round(energy.em.maintenance)}{energy.em.confidence > 0.2 ? ` (learned from your data, ${Math.round(energy.em.confidence * 100)}% confidence)` : ' (formula — learns from your logs)'} + {energy.em.surplus} surplus + today's steps/sports. Gym training is averaged into maintenance.
        </p>
      </Card>

      <Button size="lg" className="w-full" onClick={() => setAdding(true)}>+ Log food</Button>

      {MEALS.map((m) => {
        const items = logs.filter((l) => l.meal === m.key)
        if (!items.length) return null
        return (
          <Card key={m.key} title={m.label} action={<span className="text-sm text-slate-400">{Math.round(items.reduce((a, b) => a + b.kcal, 0))} kcal</span>}>
            <ul className="divide-y divide-slate-800">
              {items.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <div className="truncate">{l.name}</div>
                    <div className="text-xs text-slate-500">{l.servings !== 1 ? `${l.servings} × ` : ''}{l.serving} · {Math.round(l.protein)} g P</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span className="text-sm font-semibold">{l.kcal}</span>
                    <button className="px-2 text-slate-500" title="Log again today" onClick={() => save('foodLogs', { ...l, id: crypto.randomUUID(), date: today(), time: Date.now() })}>↻</button>
                    <button className="px-2 text-slate-500" onClick={() => remove('foodLogs', l.id)}>×</button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )
      })}

      {sugg.length > 0 && (
        <Card title={`Close the gap: ${target.kcal - t.kcal} kcal · ${Math.max(0, target.protein - t.protein)} g protein`}>
          <div className="space-y-3">
            {sugg.map((s) => (
              <div key={s.title} className="rounded-xl bg-slate-800/60 p-3">
                <div className="flex items-center justify-between gap-2"><div className="font-semibold">{s.title}</div><div className="shrink-0 text-sm text-slate-400">+{s.kcal} kcal · {s.protein} g P</div></div>
                {s.why && <div className="mt-0.5 text-xs text-slate-400">{s.why}</div>}
                <div className="mt-1 text-sm text-slate-300">{s.items.map((i) => `${i.name} (${i.serving})`).join(' + ')}</div>
                <Button size="sm" variant="soft" className="mt-2" onClick={async () => { for (const f of s.items) await save('foodLogs', logFromFood(f, 1, date, 'snack')) }}>Log this</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Coach notes"><AdviceList items={advice} /></Card>

      {habits.length > 0 && <Card title="Your eating patterns (last 4 weeks)"><AdviceList items={habits} /></Card>}

      <Card title="What to avoid while bulking" action={<button className="text-sm text-emerald-400" onClick={() => setShowAvoid(!showAvoid)}>{showAvoid ? 'Hide' : 'Show'}</button>}>
        {showAvoid && <ul className="space-y-1.5 text-sm text-slate-300">{AVOID_LIST.map((a) => <li key={a}>• {a}</li>)}</ul>}
      </Card>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Log food">
        <AddFood profile={profile} date={date} onDone={() => setAdding(false)} />
      </Sheet>
    </div>
  )
}
