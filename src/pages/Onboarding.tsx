import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BodySection, DEFAULT_PROFILE, FoodSection, LifestyleSection, TrainingSection } from '../components/ProfileForm'
import { Button, Card } from '../components/ui'
import { save } from '../db'
import { EXERCISES } from '../lib/exercises'
import { bmr, macroTargets, PACE_INFO, stepsKcal, trainingKcalPerDay } from '../lib/nutrition'
import { generatePlan } from '../lib/plan'
import { today } from '../lib/util'
import type { Profile } from '../types'

const STEPS = ['Welcome', 'Body', 'Training', 'Food', 'Lifestyle', 'Your plan'] as const

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [p, setP] = useState<Profile>(DEFAULT_PROFILE)
  const nav = useNavigate()
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }))

  const preview = useMemo(() => {
    const maint = bmr(p, p.startWeightKg) * (p.jobType === 'desk' ? 1.2 : p.jobType === 'standing' ? 1.35 : 1.5) + stepsKcal(p.typicalSteps, p.startWeightKg)
    const train = trainingKcalPerDay(p, p.startWeightKg)
    const t = macroTargets(maint + train + PACE_INFO[p.pace].surplus, p.startWeightKg)
    return { maint: Math.round(maint + train), t, plan: generatePlan(p) }
  }, [p])

  async function finish() {
    const prof = await save('profile', { ...p, createdAt: Date.now() })
    await save('weights', { id: today(), date: today(), kg: prof.startWeightKg, updatedAt: 0 })
    await save('plan', generatePlan(prof))
    nav('/', { replace: true })
  }

  const valid = p.age > 12 && p.heightCm > 120 && p.startWeightKg > 30 && p.targetWeightKg > 30

  return (
    <div className="mx-auto max-w-lg px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-28">
      <div className="mb-5 flex gap-1">
        {STEPS.map((s, i) => <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-emerald-500' : 'bg-slate-800'}`} />)}
      </div>

      {step === 0 && (
        <div className="space-y-5 pt-6">
          <div className="text-5xl">💪</div>
          <h1 className="text-3xl font-extrabold">Let's build your weight-gain plan</h1>
          <p className="text-slate-300">A few questions (about 2 minutes). Everything can be changed later in Settings, and the plan keeps adapting to:</p>
          <ul className="space-y-2 text-slate-300">
            <li>• how heavy each set and workout felt</li>
            <li>• your daily sleep, energy, soreness and steps</li>
            <li>• what you actually eat vs. how your weight moves</li>
            <li>• your progress photos and measurements</li>
          </ul>
          <p className="text-sm text-slate-500">Your data is stored on this device. Cloud sync (phone + web) is optional in Settings.</p>
        </div>
      )}
      {step === 1 && <BodySection p={p} set={set} />}
      {step === 2 && <TrainingSection p={p} set={set} />}
      {step === 3 && <FoodSection p={p} set={set} />}
      {step === 4 && <LifestyleSection p={p} set={set} />}
      {step === 5 && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Your starting plan</h3>
          <Card title="Daily nutrition (starting point)">
            <div className="text-3xl font-extrabold text-emerald-400">{preview.t.kcal} kcal</div>
            <p className="text-sm text-slate-400">Estimated maintenance ≈ {preview.maint} kcal + {PACE_INFO[p.pace].surplus} kcal surplus. This auto-corrects after ~2–3 weeks of logging food and weight.</p>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-slate-800 p-2"><div className="font-bold">{preview.t.protein} g</div><div className="text-xs text-slate-400">protein</div></div>
              <div className="rounded-xl bg-slate-800 p-2"><div className="font-bold">{preview.t.carbs} g</div><div className="text-xs text-slate-400">carbs</div></div>
              <div className="rounded-xl bg-slate-800 p-2"><div className="font-bold">{preview.t.fat} g</div><div className="text-xs text-slate-400">fat</div></div>
            </div>
            {p.mealsPerDay <= 2 && <p className="mt-3 text-sm text-amber-300">With {p.mealsPerDay} meals/day that's ~{Math.round(preview.t.kcal / p.mealsPerDay)} kcal per meal. The app will suggest easy add-ons (shakes, snacks) to make this doable.</p>}
          </Card>
          <Card title={`Training: ${preview.plan.split}`}>
            <p className="mb-3 text-sm text-slate-400">{preview.plan.mesoWeeks}-week blocks: effort ramps up each week, then a deload week. Weights go up automatically when you beat your reps at the target effort.</p>
            <div className="space-y-3">
              {preview.plan.days.map((d) => (
                <div key={d.id}>
                  <div className="font-semibold">{d.name}</div>
                  <div className="text-sm text-slate-400">{d.slots.map((s) => `${EXERCISES[s.exerciseId].name} ${s.sets}×${s.repMin}-${s.repMax}`).join(' · ')}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 border-t border-slate-800 bg-slate-950/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-lg gap-3">
          {step > 0 && <Button variant="soft" onClick={() => setStep(step - 1)}>Back</Button>}
          {step < STEPS.length - 1
            ? <Button className="flex-1" disabled={step === 1 && !valid} onClick={() => { setStep(step + 1); window.scrollTo(0, 0) }}>{step === 0 ? "Let's go" : 'Next'}</Button>
            : <Button className="flex-1" onClick={finish}>Start my plan</Button>}
        </div>
      </div>
    </div>
  )
}
