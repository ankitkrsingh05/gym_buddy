/**
 * Warm-up and cool-down builder.
 * Warm-up follows the RAMP method used by strength coaches (NSCA): Raise → Activate → Mobilise (dynamic stretches)
 * → Potentiate (lighter ramp-up sets of the first big lift). Static stretching is kept for the cool-down.
 */
import type { Activity, Muscle, PlanDay, Profile, RoutineItem } from '../types'
import { activityDef } from './activities'
import { EXERCISES } from './exercises'

const R = (x: Omit<RoutineItem, 'id'> & { id?: string }): RoutineItem => ({ id: x.id ?? x.name.toLowerCase().replace(/\W+/g, '-'), ...x })

const UPPER: Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps']
const LOWER: Muscle[] = ['quads', 'hamstrings', 'glutes', 'calves']

function dayMuscles(day: PlanDay) {
  const set = new Set<Muscle>()
  for (const s of day.slots) {
    const ex = EXERCISES[s.exerciseId]
    set.add(ex.primary)
    ex.secondary.forEach((m) => set.add(m))
  }
  return set
}

export function buildWarmup(p: Profile, day: PlanDay, weights: Record<string, number>, recentActs: Activity[]): RoutineItem[] {
  const ms = dayMuscles(day)
  const upper = UPPER.some((m) => ms.has(m))
  const lower = LOWER.some((m) => ms.has(m))
  const has = (e: string) => p.equipment.includes(e as never)
  const inj = (i: string) => p.injuries.includes(i as never)
  const legsTired = recentActs.some((a) => activityDef(a.type).muscles.some((m) => LOWER.includes(m)))
  const items: RoutineItem[] = []

  // R — Raise: get warm and sweating lightly
  items.push(has('machine') || has('cable')
    ? R({ phase: 'raise', name: legsTired ? 'Easy bike' : 'Bike, treadmill walk or rower', seconds: 300, cue: 'Easy pace — you can chat. Get warm, slightly sweaty.', image: 'Bicycling_Stationary' })
    : R({ phase: 'raise', name: 'Brisk march / light jumping jacks', seconds: 180, cue: 'Light and bouncy, raise your heart rate gradually.', image: 'Rope_Jumping' }))

  // M — Mobilise: dynamic stretches for today's joints
  if (upper) {
    items.push(R({ phase: 'mobilise', name: 'Arm circles', reps: '10 forward + 10 back', cue: 'Start small, get bigger. Relax the neck.', image: 'Arm_Circles' }))
    items.push(R({ phase: 'mobilise', name: 'Dynamic chest opener', reps: '10', cue: 'Swing arms open and hug yourself, alternating arm on top.', image: 'Dynamic_Chest_Stretch' }))
    items.push(R({ phase: 'mobilise', name: 'Cat–cow', reps: '8 slow', cue: 'Round, then arch your back. Great after sitting at a desk.', image: 'Cat_Stretch' }))
  }
  if (lower) {
    items.push(R({ phase: 'mobilise', name: 'Leg swings', reps: '10 each leg', perSide: true, cue: 'Hold a rack; swing front-to-back, gradually higher.', image: 'Front_Leg_Raises' }))
    items.push(R({ phase: 'mobilise', name: "World's greatest stretch", reps: '4 each side', perSide: true, cue: 'Lunge, elbow to instep, rotate and reach up.', image: 'Worlds_Greatest_Stretch' }))
    items.push(R({ phase: 'mobilise', name: inj('knee') ? 'Box squat to bench' : 'Bodyweight squats', reps: '10', cue: 'Slow and deep as comfortable, knees tracking toes.', image: inj('knee') ? 'Sit_Squats' : 'Bodyweight_Squat' }))
  }
  if (!upper || !lower) items.push(R({ phase: 'mobilise', name: 'Inchworm', reps: '5', cue: 'Walk hands out to a plank, walk feet in. Warms the whole chain.', image: 'Inchworm' }))
  if (inj('lower_back')) items.push(R({ phase: 'mobilise', name: 'Pelvic tilt into bridge', reps: '8', cue: 'Gently wake up the lower back and glutes.', image: 'Pelvic_Tilt_Into_Bridge' }))
  if (inj('wrist')) items.push(R({ phase: 'mobilise', name: 'Wrist circles', reps: '10 each way', cue: 'Interlace fingers, roll the wrists.', image: 'Wrist_Circles' }))
  if (inj('hip')) items.push(R({ phase: 'mobilise', name: 'Standing hip circles', reps: '8 each way', cue: 'Big slow circles.', image: 'Standing_Hip_Circles' }))
  if (inj('knee')) items.push(R({ phase: 'mobilise', name: 'Knee circles', reps: '10 each way', cue: 'Feet together, hands on knees, gentle circles.', image: 'Knee_Circles' }))

  // A — Activate: switch on the muscles that protect joints
  if (lower) items.push(R({ phase: 'activate', name: 'Glute bridge', reps: '12', cue: 'Squeeze glutes 1 s at the top.', image: 'Single_Leg_Glute_Bridge' }))
  if (upper) items.push(has('bands')
    ? R({ phase: 'activate', name: 'Band pull-aparts', reps: '15', cue: 'Arms straight, squeeze shoulder blades.', image: 'Band_Pull_Apart' })
    : has('pullupbar')
      ? R({ phase: 'activate', name: 'Scapular pull-ups', reps: '8', cue: 'Hang, then pull shoulders down without bending the arms.', image: 'Scapular_Pull-Up' })
      : R({ phase: 'activate', name: 'Elbows back squeeze', reps: '12', cue: 'Pull elbows back, squeeze shoulder blades together.', image: 'Elbows_Back' }))
  items.push(R({ phase: 'activate', name: 'Dead bug', reps: '6 each side', perSide: true, cue: 'Lower back stays pressed down. Slow.', image: 'Dead_Bug' }))

  // P — Potentiate: ramp-up sets of the first loaded compound lift
  const first = day.slots.map((s) => EXERCISES[s.exerciseId]).find((e) => e.compound && e.increment > 0)
  if (first) {
    const w = weights[first.id] ?? 0
    const step = first.increment >= 2.5 ? 2.5 : first.increment || 1
    const r = (x: number) => Math.max(first.equipment.includes('barbell') ? 20 : step, Math.round(x / step) * step)
    const ramp: [number, number][] = w >= 20 ? [[0.4, 10], [0.6, 6], [0.8, 3]] : [[0.5, 10], [0.75, 5]]
    for (const [pct, reps] of ramp) {
      if (w <= 0) break
      items.push(R({ id: `ramp-${pct}`, phase: 'potentiate', name: `Warm-up set: ${first.name}`, reps: `${reps} reps × ${r(w * pct)} kg${first.perHand ? ' each' : ''}`, cue: pct < 0.7 ? 'Smooth, fast reps. Practise perfect form.' : 'Feel the weight — but stay crisp. Then rest 1–2 min.', exerciseId: first.id }))
    }
  }
  return items
}

const STRETCH: Partial<Record<Muscle, RoutineItem>> = {
  chest: R({ phase: 'cooldown', name: 'Doorway chest stretch', seconds: 30, perSide: true, cue: 'Forearm on a post, step through gently.', image: 'Chest_And_Front_Of_Shoulder_Stretch' }),
  back: R({ phase: 'cooldown', name: "Child's pose with reach", seconds: 45, cue: 'Sit hips back, reach arms long, breathe into your back.', image: 'Childs_Pose' }),
  shoulders: R({ phase: 'cooldown', name: 'Cross-body shoulder stretch', seconds: 30, perSide: true, cue: 'Pull the arm across your chest, shoulder down.', image: 'Shoulder_Stretch' }),
  biceps: R({ phase: 'cooldown', name: 'Standing biceps stretch', seconds: 30, cue: 'Hands behind you, palms down, lift gently.', image: 'Standing_Biceps_Stretch' }),
  triceps: R({ phase: 'cooldown', name: 'Overhead triceps stretch', seconds: 30, perSide: true, cue: 'Elbow up, hand down your back, gentle push.', image: 'Triceps_Stretch' }),
  quads: R({ phase: 'cooldown', name: 'Standing quad stretch', seconds: 30, perSide: true, cue: 'Heel to glute, knees together, hips forward.', image: 'Quad_Stretch' }),
  hamstrings: R({ phase: 'cooldown', name: 'Seated hamstring stretch', seconds: 30, perSide: true, cue: 'Long spine, hinge forward from the hips.', image: 'Seated_Hamstring' }),
  glutes: R({ phase: 'cooldown', name: 'Figure-4 glute stretch', seconds: 30, perSide: true, cue: 'Ankle on opposite knee, lean forward.', image: 'Seated_Glute' }),
  calves: R({ phase: 'cooldown', name: 'Wall calf stretch', seconds: 30, perSide: true, cue: 'Back heel down, lean into the wall.', image: 'Calf_Stretch_Hands_Against_Wall' }),
  abs: R({ phase: 'cooldown', name: 'Standing side stretch', seconds: 20, perSide: true, cue: 'Reach overhead and lean to the side.', image: 'Standing_Lateral_Stretch' }),
}

/** Static stretches for what you trained + desk-posture extras, then breathing to switch to recovery mode. */
export function buildCooldown(p: Profile, day: PlanDay): RoutineItem[] {
  const trained = [...new Set(day.slots.map((s) => EXERCISES[s.exerciseId].primary))]
  const items = trained.map((m) => STRETCH[m]).filter(Boolean) as RoutineItem[]
  if (p.jobType === 'desk' && !trained.includes('quads')) {
    items.push(R({ phase: 'cooldown', name: 'Kneeling hip-flexor stretch', seconds: 30, perSide: true, cue: 'Squeeze the back glute, shift hips forward. Undoes hours of sitting.', image: 'Kneeling_Hip_Flexor' }))
  }
  if (p.jobType === 'desk' && !trained.includes('back')) {
    items.push(R({ phase: 'cooldown', name: 'Upper-back stretch', seconds: 30, cue: 'Hug yourself and round the upper back.', image: 'Upper_Back_Stretch' }))
  }
  items.push(R({ phase: 'cooldown', name: 'Box breathing', seconds: 60, cue: 'In 4 s · hold 4 s · out 4 s · hold 4 s. Calms your system and starts recovery.' }))
  return items
}

/** Total seconds the routine takes (rep-based items ≈ 40 s, per-side doubles). */
export function routineSeconds(items: RoutineItem[]) {
  return items.reduce((s, i) => s + (i.seconds ?? 40) * (i.perSide && i.seconds ? 2 : 1), 0)
}
