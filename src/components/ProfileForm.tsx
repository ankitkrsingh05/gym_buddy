import type { ReactNode } from 'react'
import { ALL_MUSCLES, MUSCLE_LABEL } from '../lib/exercises'
import { PACE_INFO } from '../lib/nutrition'
import { cmToFtIn } from '../lib/util'
import type { Allergen, Equipment, Injury, Profile } from '../types'
import { Chips, Field, inputCls, NumInput, Segmented } from './ui'

export const EQUIPMENT_OPTS: { value: Equipment; label: string }[] = [
  { value: 'dumbbell', label: 'Dumbbells' }, { value: 'bench', label: 'Adjustable bench' }, { value: 'barbell', label: 'Barbell + plates' },
  { value: 'rack', label: 'Squat rack' }, { value: 'smith', label: 'Smith machine' }, { value: 'cable', label: 'Cable / pulley' },
  { value: 'machine', label: 'Machines (leg press, curls…)' }, { value: 'pullupbar', label: 'Pull-up bar' },
  { value: 'kettlebell', label: 'Kettlebells' }, { value: 'bands', label: 'Resistance bands' },
]
const INJURY_OPTS: { value: Injury; label: string }[] = [
  { value: 'lower_back', label: 'Lower back' }, { value: 'knee', label: 'Knee' }, { value: 'shoulder', label: 'Shoulder' },
  { value: 'elbow', label: 'Elbow' }, { value: 'wrist', label: 'Wrist' }, { value: 'hip', label: 'Hip' }, { value: 'neck', label: 'Neck' },
]
const ALLERGY_OPTS: { value: Allergen; label: string }[] = [
  { value: 'dairy', label: 'Dairy / lactose' }, { value: 'egg', label: 'Egg' }, { value: 'nuts', label: 'Tree nuts' }, { value: 'peanut', label: 'Peanut' },
  { value: 'gluten', label: 'Gluten' }, { value: 'soy', label: 'Soy' }, { value: 'fish', label: 'Fish' }, { value: 'shellfish', label: 'Shellfish' },
]
const CUISINES = ['North Indian', 'South Indian', 'Bengali', 'Maharashtrian', 'Gujarati', 'Indo-Chinese', 'Continental', 'Mediterranean', 'East Asian', 'Middle Eastern']

export const DEFAULT_PROFILE: Profile = {
  id: 'me', updatedAt: 0, createdAt: 0, name: '', age: 31, sex: 'male', heightCm: 178, startWeightKg: 62, targetWeightKg: 70, pace: 'lean',
  experience: 'beginner', equipment: ['dumbbell', 'bench'], gymNote: '', daysPerWeek: 4, sessionMinutes: 60, injuries: [], healthNotes: '', focus: [],
  knownLifts: {}, dietType: 'nonveg', cuisines: ['North Indian'], allergies: [], mealsPerDay: 2, appetite: 'low', usesWhey: false, usesCreatine: false,
  jobType: 'desk', typicalSteps: 4000, sports: '', typicalSleep: 7, device: 'iphone', hasScale: true, weighDaily: true,
}

type P = { p: Profile; set: (patch: Partial<Profile>) => void }

function Group({ title, children }: { title: string; children: ReactNode }) {
  return <div className="space-y-4"><h3 className="text-lg font-bold">{title}</h3>{children}</div>
}

export function BodySection({ p, set }: P) {
  const ft = Math.floor(p.heightCm / 30.48)
  const inch = Math.round((p.heightCm / 2.54) - ft * 12)
  return (
    <Group title="About you">
      <Field label="Name (optional)"><input className={inputCls} value={p.name} onChange={(e) => set({ name: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Age"><NumInput value={p.age} onChange={(age) => set({ age })} suffix="yrs" /></Field>
        <Field label="Sex"><Segmented value={p.sex} onChange={(sex) => set({ sex })} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} /></Field>
      </div>
      <Field label={`Height — ${cmToFtIn(p.heightCm)} / ${Math.round(p.heightCm)} cm`}>
        <div className="grid grid-cols-2 gap-3">
          <NumInput value={ft} onChange={(f) => set({ heightCm: Math.round((f * 12 + inch) * 2.54) })} suffix="ft" />
          <NumInput value={inch} onChange={(i) => set({ heightCm: Math.round((ft * 12 + i) * 2.54) })} suffix="in" />
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Current weight"><NumInput value={p.startWeightKg} step={0.1} onChange={(startWeightKg) => set({ startWeightKg })} suffix="kg" /></Field>
        <Field label="Target weight" hint="Change anytime"><NumInput value={p.targetWeightKg} step={0.5} onChange={(targetWeightKg) => set({ targetWeightKg })} suffix="kg" /></Field>
      </div>
      <Field label="How fast do you want to gain?">
        <div className="grid gap-2">
          {(Object.keys(PACE_INFO) as Profile['pace'][]).map((k) => (
            <button type="button" key={k} onClick={() => set({ pace: k })} className={`rounded-xl border p-3 text-left ${p.pace === k ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700'}`}>
              <div className="font-semibold">{PACE_INFO[k].label} <span className="text-sm font-normal text-slate-400">+{PACE_INFO[k].surplus} kcal/day</span></div>
              <div className="text-sm text-slate-400">{PACE_INFO[k].desc}</div>
            </button>
          ))}
        </div>
      </Field>
    </Group>
  )
}

export function TrainingSection({ p, set }: P) {
  return (
    <Group title="Training">
      <Field label="Gym experience">
        <Segmented value={p.experience} onChange={(experience) => set({ experience })} options={[
          { value: 'beginner', label: 'New' }, { value: 'novice', label: '<1 yr' }, { value: 'intermediate', label: '1–3 yr' }, { value: 'advanced', label: '3+ yr' },
        ]} />
      </Field>
      <Field label="What equipment does your gym have?" hint="Society/home gyms vary a lot — tick everything available. The plan only uses what you have.">
        <Chips options={EQUIPMENT_OPTS} value={p.equipment} onChange={(equipment) => set({ equipment })} />
      </Field>
      <Field label="Anything else about your gym? (optional)"><input className={inputCls} placeholder="e.g. dumbbells only up to 20 kg" value={p.gymNote} onChange={(e) => set({ gymNote: e.target.value })} /></Field>
      <div className="grid gap-3">
        <Field label="Days per week"><Segmented value={p.daysPerWeek} onChange={(daysPerWeek) => set({ daysPerWeek })} options={[2, 3, 4, 5, 6].map((n) => ({ value: n, label: String(n) }))} /></Field>
        <Field label="Minutes per session"><Segmented value={p.sessionMinutes} onChange={(sessionMinutes) => set({ sessionMinutes })} options={[30, 45, 60, 75, 90].map((n) => ({ value: n, label: String(n) }))} /></Field>
      </div>
      <Field label="Any injuries or pain?" hint="Exercises that commonly aggravate these are swapped for safer options.">
        <Chips options={INJURY_OPTS} value={p.injuries} onChange={(injuries) => set({ injuries })} />
      </Field>
      <Field label="Health conditions / notes (optional)"><input className={inputCls} placeholder="e.g. asthma, BP medication…" value={p.healthNotes} onChange={(e) => set({ healthNotes: e.target.value })} /></Field>
      <Field label="Muscles you want to prioritise" hint="Gets +1 set and kept even in shorter sessions.">
        <Chips options={ALL_MUSCLES.map((m) => ({ value: m, label: MUSCLE_LABEL[m] }))} value={p.focus} onChange={(focus) => set({ focus })} />
      </Field>
      {p.experience !== 'beginner' && (
        <Field label="Known working weights (optional, kg for ~8 reps)" hint="Leave blank — the app calibrates in your first sessions.">
          <div className="grid grid-cols-3 gap-2">
            {(['bench', 'squat', 'deadlift', 'row', 'ohp'] as const).map((k) => (
              <NumInput key={k} value={p.knownLifts[k]} onChange={(v) => set({ knownLifts: { ...p.knownLifts, [k]: Number.isNaN(v) ? undefined : v } })} suffix={k} />
            ))}
          </div>
        </Field>
      )}
    </Group>
  )
}

export function FoodSection({ p, set }: P) {
  return (
    <Group title="Food">
      <Field label="Diet">
        <Segmented value={p.dietType} onChange={(dietType) => set({ dietType })} options={[
          { value: 'nonveg', label: 'Non-veg' }, { value: 'eggetarian', label: 'Egg + veg' }, { value: 'vegetarian', label: 'Veg' }, { value: 'vegan', label: 'Vegan' },
        ]} />
      </Field>
      <Field label="Cuisines you usually eat"><Chips options={CUISINES.map((c) => ({ value: c, label: c }))} value={p.cuisines} onChange={(cuisines) => set({ cuisines })} /></Field>
      <Field label="Allergies / intolerances"><Chips options={ALLERGY_OPTS} value={p.allergies} onChange={(allergies) => set({ allergies })} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Meals per day (now)"><Segmented value={p.mealsPerDay} onChange={(mealsPerDay) => set({ mealsPerDay })} options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))} /></Field>
        <Field label="Appetite"><Segmented value={p.appetite} onChange={(appetite) => set({ appetite })} options={[{ value: 'low', label: 'Low' }, { value: 'normal', label: 'Normal' }, { value: 'high', label: 'Big' }]} /></Field>
      </div>
      <Field label="Supplements" hint="See the Supplements guide (More → Supplements) for detailed health info on both.">
        <div className="flex flex-wrap gap-2">
          <Chips options={[{ value: 'whey', label: 'I use / will use whey protein' }, { value: 'creatine', label: 'I use / will use creatine' }]}
            value={[p.usesWhey && 'whey', p.usesCreatine && 'creatine'].filter(Boolean) as string[]}
            onChange={(v) => set({ usesWhey: v.includes('whey'), usesCreatine: v.includes('creatine'), creatineStartDate: v.includes('creatine') ? p.creatineStartDate ?? new Date().toISOString().slice(0, 10) : undefined })} />
        </div>
      </Field>
      {p.usesCreatine && (
        <Field label="Creatine start date" hint="Used to explain early water-weight jumps on the scale.">
          <input type="date" className={inputCls} value={p.creatineStartDate ?? ''} onChange={(e) => set({ creatineStartDate: e.target.value })} />
        </Field>
      )}
    </Group>
  )
}

export function LifestyleSection({ p, set }: P) {
  return (
    <Group title="Lifestyle & app">
      <Field label="Job / daytime activity">
        <Segmented value={p.jobType} onChange={(jobType) => set({ jobType })} options={[{ value: 'desk', label: 'Desk' }, { value: 'standing', label: 'On feet' }, { value: 'active', label: 'Physical' }]} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Typical steps/day"><NumInput value={p.typicalSteps} step={500} onChange={(typicalSteps) => set({ typicalSteps })} /></Field>
        <Field label="Typical sleep" hint="You'll log actual sleep daily"><NumInput value={p.typicalSleep} step={0.5} onChange={(typicalSleep) => set({ typicalSleep })} suffix="hrs" /></Field>
      </div>
      <Field label="Sports / other activities (optional)"><input className={inputCls} placeholder="e.g. cricket on Sundays, cycling" value={p.sports} onChange={(e) => set({ sports: e.target.value })} /></Field>
      <Field label="Main phone"><Segmented value={p.device} onChange={(device) => set({ device })} options={[{ value: 'iphone', label: 'iPhone' }, { value: 'android', label: 'Android' }, { value: 'desktop', label: 'Computer' }]} /></Field>
      <Field label="Weighing">
        <Chips options={[{ value: 'scale', label: 'I have a bathroom scale' }, { value: 'daily', label: 'Remind me to weigh every morning' }]}
          value={[p.hasScale && 'scale', p.weighDaily && 'daily'].filter(Boolean) as string[]}
          onChange={(v) => set({ hasScale: v.includes('scale'), weighDaily: v.includes('daily') })} />
      </Field>
    </Group>
  )
}
