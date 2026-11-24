export type Sex = 'male' | 'female'
export type Pace = 'lean' | 'moderate' | 'aggressive'
export type Experience = 'beginner' | 'novice' | 'intermediate' | 'advanced'
export type Equipment =
  | 'barbell' | 'dumbbell' | 'bench' | 'rack' | 'cable' | 'machine'
  | 'pullupbar' | 'smith' | 'kettlebell' | 'bands'
export type Injury = 'lower_back' | 'knee' | 'shoulder' | 'elbow' | 'wrist' | 'hip' | 'neck'
export type Muscle =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'abs'
export type DietType = 'nonveg' | 'eggetarian' | 'vegetarian' | 'vegan'
export type Allergen = 'dairy' | 'egg' | 'nuts' | 'peanut' | 'gluten' | 'soy' | 'fish' | 'shellfish'
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

/** Every synced record carries an id and a client-side updatedAt (ms). */
export interface Base {
  id: string
  updatedAt: number
}

export interface Profile extends Base {
  id: 'me'
  name: string
  age: number
  sex: Sex
  heightCm: number
  startWeightKg: number
  targetWeightKg: number
  pace: Pace
  // training
  experience: Experience
  equipment: Equipment[]
  gymNote: string
  daysPerWeek: number
  sessionMinutes: number
  injuries: Injury[]
  healthNotes: string
  focus: Muscle[]
  knownLifts: { bench?: number; squat?: number; deadlift?: number; row?: number; ohp?: number }
  // food
  dietType: DietType
  cuisines: string[]
  allergies: Allergen[]
  mealsPerDay: number
  appetite: 'low' | 'normal' | 'high'
  usesWhey: boolean
  usesCreatine: boolean
  creatineStartDate?: string
  // lifestyle
  jobType: 'desk' | 'standing' | 'active'
  typicalSteps: number
  sports: string
  typicalSleep: number
  // app
  device: 'iphone' | 'android' | 'desktop'
  hasScale: boolean
  weighDaily: boolean
  createdAt: number
}

export interface PlanSlot {
  key: string // unique within day
  pool: string
  exerciseId: string
  sets: number
  repMin: number
  repMax: number
}

export interface PlanDay {
  id: string
  name: string
  slots: PlanSlot[]
}

export interface ExerciseState {
  exerciseId: string
  weight: number // working weight (kg). 0 = bodyweight
  targetReps: number
  failures: number
  calibrated: boolean
  lastNote?: string
  lastDate?: string
}

export interface Plan extends Base {
  id: 'current'
  createdAt: number
  split: string
  days: PlanDay[]
  nextDayIdx: number
  mesoNumber: number
  mesoSessionCount: number // sessions completed in current mesocycle
  mesoWeeks: number // includes deload week
  exerciseState: Record<string, ExerciseState>
  muscleAdj: Partial<Record<Muscle, number>> // +/- sets from recovery feedback
  deloadRemaining?: number // >0 = early deload sessions left (fatigue-triggered)
}

export interface LoggedSet {
  reps: number
  weight: number
  rpe: number // 6..10 (10 = could not do another rep)
  done: boolean
}

export interface SessionExercise {
  slotKey: string
  exerciseId: string
  targetSets: number
  repMin: number
  repMax: number
  targetReps: number
  targetWeight: number
  targetRir: number
  sets: LoggedSet[]
  note?: string
  progressionNote?: string
}

export interface Readiness {
  sleepHours: number
  energy: number // 1-5
  soreness: number // 1-5 (5 = very sore)
  stress: number // 1-5 (5 = very stressed)
  soreMuscles: Muscle[]
  score: number // 0-100
}

export interface Session extends Base {
  date: string
  dayId: string
  dayName: string
  week: number // 1-based week in mesocycle
  meso: number
  deload: boolean
  readiness: Readiness
  adjustments: string[]
  exercises: SessionExercise[]
  sessionRpe?: number // overall how heavy 1-10
  feeling?: 'great' | 'good' | 'ok' | 'drained' | 'pain'
  painNote?: string
  startedAt: number
  endedAt?: number
  completed: boolean
}

export interface FoodItem extends Base {
  name: string
  serving: string // e.g. "1 cup (240 ml)"
  grams?: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar?: number
  diet: DietType // most restrictive diet this fits (vegan fits all)
  allergens: Allergen[]
  tags: string[] // dense, protein, junk, fried, sugary, alcohol, drink, staple
  cuisine?: string
  source: 'builtin' | 'custom' | 'usda' | 'off' | 'ai'
}

export interface FoodLog extends Base {
  date: string
  meal: MealSlot
  name: string
  servings: number
  serving: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar?: number
  tags: string[]
  source: FoodItem['source'] | 'quick'
  time: number
}

export interface WeightEntry extends Base {
  date: string // id == date
  kg: number
}

export interface Measurement extends Base {
  date: string
  waist?: number
  chest?: number
  arm?: number
  thigh?: number
  hips?: number
  neck?: number
}

export interface CheckIn extends Base {
  date: string // id == date
  sleepHours: number
  sleepQuality: number // 1-5
  energy: number
  stress: number
  soreness: number
  soreMuscles: Muscle[]
  mood: number
  steps: number
  waterL: number
  hunger: number // 1-5
  notes: string
}

export interface Activity extends Base {
  date: string
  type: string
  minutes: number
  intensity: 'light' | 'moderate' | 'vigorous'
  kcal: number
  notes?: string
}

export interface PoseMetrics {
  shoulderWidth: number // normalized by torso length
  waistWidth: number
  hipWidth: number
  shoulderToWaist: number
  confidence: number
}

export interface Photo extends Base {
  date: string
  pose: 'front' | 'side' | 'back'
  blob?: Blob // local only, never synced in the record
  remotePath?: string
  weightKg?: number
  metrics?: PoseMetrics
  aiReview?: string
}

export interface Tombstone {
  id: string // `${tbl}:${recId}`
  tbl: string
  recId: string
  updatedAt: number
}
