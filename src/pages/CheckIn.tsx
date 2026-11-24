import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Card, Chips, Field, inputCls, NumInput, Scale } from '../components/ui'
import { db, save } from '../db'
import { useProfile } from '../hooks'
import { ALL_MUSCLES, MUSCLE_LABEL } from '../lib/exercises'
import { fmtDate, today } from '../lib/util'
import type { CheckIn as CI } from '../types'

export default function CheckIn() {
  const [params] = useSearchParams()
  const date = params.get('date') ?? today()
  const profile = useProfile()
  const existing = useLiveQuery(() => db.checkins.get(date), [date])
  const weight = useLiveQuery(() => db.weights.get(date), [date])
  const nav = useNavigate()
  const [c, setC] = useState<CI | null>(null)
  const [kg, setKg] = useState<number>(NaN)

  useEffect(() => {
    if (c || !profile) return
    setC(existing ?? {
      id: date, date, updatedAt: 0, sleepHours: profile.typicalSleep, sleepQuality: 3, energy: 3, stress: 2, soreness: 2,
      soreMuscles: [], mood: 3, steps: profile.typicalSteps, waterL: 2, hunger: 3, notes: '',
    })
  }, [existing, profile, c, date])
  useEffect(() => { if (weight) setKg(weight.kg) }, [weight])

  if (!c || !profile) return null
  const set = (p: Partial<CI>) => setC({ ...c, ...p })

  async function submit() {
    await save('checkins', c!)
    if (!Number.isNaN(kg) && kg > 30) await save('weights', { id: date, date, kg, updatedAt: 0 })
    nav('/')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Daily check-in <span className="text-base font-normal text-slate-400">· {fmtDate(date, { weekday: 'short', day: 'numeric', month: 'short' })}</span></h1>
      <p className="text-sm text-slate-400">30 seconds. This adjusts today's workout and your calorie target.</p>

      {profile.hasScale && (
        <Card title="Morning weight">
          <NumInput value={kg} onChange={setKg} step={0.1} suffix="kg" />
          <p className="mt-2 text-xs text-slate-500">Best: after the toilet, before food/water, same scale. Daily jumps of ±1 kg are just water — the app uses the smoothed trend.</p>
        </Card>
      )}

      <Card title="Sleep">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hours slept"><NumInput value={c.sleepHours} step={0.5} onChange={(sleepHours) => set({ sleepHours })} suffix="hrs" /></Field>
          <Field label="Quality"><Scale value={c.sleepQuality} onChange={(sleepQuality) => set({ sleepQuality })} labels={['poor', 'great']} /></Field>
        </div>
      </Card>

      <Card title="How do you feel?">
        <div className="space-y-4">
          <Field label="Energy"><Scale value={c.energy} onChange={(energy) => set({ energy })} labels={['exhausted', 'full of energy']} /></Field>
          <Field label="Overall soreness"><Scale value={c.soreness} onChange={(soreness) => set({ soreness })} labels={['none', 'very sore']} /></Field>
          {c.soreness >= 3 && (
            <Field label="Which muscles are still sore?" hint="Sore muscles get less volume in today's session.">
              <Chips options={ALL_MUSCLES.map((m) => ({ value: m, label: MUSCLE_LABEL[m] }))} value={c.soreMuscles} onChange={(soreMuscles) => set({ soreMuscles })} />
            </Field>
          )}
          <Field label="Stress"><Scale value={c.stress} onChange={(stress) => set({ stress })} labels={['relaxed', 'very stressed']} /></Field>
          <Field label="Mood"><Scale value={c.mood} onChange={(mood) => set({ mood })} labels={['low', 'great']} /></Field>
          <Field label="Hunger / appetite today"><Scale value={c.hunger} onChange={(hunger) => set({ hunger })} labels={['no appetite', 'starving']} /></Field>
        </div>
      </Card>

      <Card title="Activity & water">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Steps" hint="Update in the evening from your phone's Health app"><NumInput value={c.steps} step={500} onChange={(steps) => set({ steps })} /></Field>
          <Field label="Water"><NumInput value={c.waterL} step={0.25} onChange={(waterL) => set({ waterL })} suffix="L" /></Field>
        </div>
      </Card>

      <Field label="Notes"><textarea className={inputCls} rows={2} value={c.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Anything unusual? (travel, illness, late night…)" /></Field>

      <Button size="lg" className="w-full" onClick={submit}>Save check-in</Button>
    </div>
  )
}
