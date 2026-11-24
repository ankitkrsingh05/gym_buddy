import type { Equipment, Injury, Muscle } from '../types'

export interface Exercise {
  id: string
  name: string
  primary: Muscle
  secondary: Muscle[]
  equipment: Equipment[] // all required
  compound: boolean
  avoidIf: Injury[]
  increment: number // kg per progression step
  /** Beginner starting load as fraction of bodyweight (total load, e.g. both dumbbells). 0 = bodyweight move */
  startBw: number
  perHand?: boolean // weight shown per dumbbell
  cues: string[]
}

const E = (e: Exercise) => e

export const EXERCISES: Record<string, Exercise> = Object.fromEntries(
  [
    // ---------- squat pattern ----------
    E({ id: 'bb_squat', name: 'Barbell Back Squat', primary: 'quads', secondary: ['glutes', 'abs'], equipment: ['barbell', 'rack'], compound: true, avoidIf: ['knee', 'lower_back'], increment: 2.5, startBw: 0.5, cues: ['Brace your core before every rep', 'Knees track over toes', 'Sit down between your hips, chest up', 'Depth: hip crease at or below knee if mobility allows'] }),
    E({ id: 'smith_squat', name: 'Smith Machine Squat', primary: 'quads', secondary: ['glutes'], equipment: ['smith'], compound: true, avoidIf: ['knee'], increment: 2.5, startBw: 0.4, cues: ['Feet slightly in front of the bar', 'Control the lowering for 2 seconds'] }),
    E({ id: 'leg_press', name: 'Leg Press', primary: 'quads', secondary: ['glutes'], equipment: ['machine'], compound: true, avoidIf: [], increment: 5, startBw: 1.0, cues: ['Lower back stays glued to the pad', 'Go as deep as you can without your hips rolling up', "Don't lock out knees hard"] }),
    E({ id: 'goblet_squat', name: 'Goblet Squat', primary: 'quads', secondary: ['glutes', 'abs'], equipment: ['dumbbell'], compound: true, avoidIf: [], increment: 2, startBw: 0.2, cues: ['Hold one dumbbell at your chest', 'Elbows inside knees at the bottom', 'Stay tall'] }),
    E({ id: 'bw_squat', name: 'Bodyweight Tempo Squat', primary: 'quads', secondary: ['glutes'], equipment: [], compound: true, avoidIf: [], increment: 0, startBw: 0, cues: ['3 seconds down, 1 second pause, up', 'Add a backpack with books to progress'] }),
    // ---------- hinge ----------
    E({ id: 'bb_rdl', name: 'Barbell Romanian Deadlift', primary: 'hamstrings', secondary: ['glutes', 'back'], equipment: ['barbell'], compound: true, avoidIf: ['lower_back'], increment: 2.5, startBw: 0.5, cues: ['Push hips back, soft knees', 'Bar stays close to legs', 'Stop when you feel a strong hamstring stretch', 'Neutral spine, no rounding'] }),
    E({ id: 'db_rdl', name: 'Dumbbell Romanian Deadlift', primary: 'hamstrings', secondary: ['glutes'], equipment: ['dumbbell'], compound: true, avoidIf: ['lower_back'], increment: 2, startBw: 0.3, perHand: true, cues: ['Hips back, dumbbells slide down thighs', 'Flat back, squeeze glutes at the top'] }),
    E({ id: 'deadlift', name: 'Conventional Deadlift', primary: 'hamstrings', secondary: ['glutes', 'back', 'quads'], equipment: ['barbell'], compound: true, avoidIf: ['lower_back', 'hip'], increment: 5, startBw: 0.7, cues: ['Bar over mid-foot', 'Pull the slack out, brace, then push the floor away', 'Lock out with glutes, not by leaning back'] }),
    E({ id: 'hip_thrust', name: 'Hip Thrust', primary: 'glutes', secondary: ['hamstrings'], equipment: ['bench'], compound: true, avoidIf: [], increment: 5, startBw: 0.4, cues: ['Upper back on bench, chin tucked', 'Drive through heels, full lockout', 'Pause 1 second at top'] }),
    E({ id: 'back_ext', name: 'Back Extension (45°)', primary: 'glutes', secondary: ['hamstrings'], equipment: ['machine'], compound: false, avoidIf: [], increment: 2.5, startBw: 0, cues: ['Hinge at hips, not lower back', 'Hold a plate to progress'] }),
    E({ id: 'glute_bridge', name: 'Single-leg Glute Bridge', primary: 'glutes', secondary: ['hamstrings'], equipment: [], compound: false, avoidIf: [], increment: 0, startBw: 0, cues: ['Drive through heel', '2 second squeeze at top'] }),
    // ---------- lunge ----------
    E({ id: 'bss', name: 'Bulgarian Split Squat', primary: 'quads', secondary: ['glutes'], equipment: ['dumbbell', 'bench'], compound: true, avoidIf: ['knee'], increment: 2, startBw: 0.1, perHand: true, cues: ['Rear foot on bench', 'Front shin stays fairly vertical for glutes, forward for quads', 'Slow on the way down'] }),
    E({ id: 'db_lunge', name: 'Dumbbell Walking Lunge', primary: 'quads', secondary: ['glutes'], equipment: ['dumbbell'], compound: true, avoidIf: ['knee'], increment: 2, startBw: 0.1, perHand: true, cues: ['Long stride, back knee kisses the floor', 'Reps are per leg'] }),
    E({ id: 'step_up', name: 'Step-up', primary: 'quads', secondary: ['glutes'], equipment: ['bench'], compound: true, avoidIf: [], increment: 2, startBw: 0, perHand: true, cues: ['Push through the top leg only', 'Control the step down'] }),
    E({ id: 'rev_lunge', name: 'Reverse Lunge (bodyweight)', primary: 'quads', secondary: ['glutes'], equipment: [], compound: true, avoidIf: [], increment: 0, startBw: 0, cues: ['Step back, drop straight down', 'Reps per leg'] }),
    // ---------- horizontal push ----------
    E({ id: 'bb_bench', name: 'Barbell Bench Press', primary: 'chest', secondary: ['triceps', 'shoulders'], equipment: ['barbell', 'bench'], compound: true, avoidIf: ['shoulder'], increment: 2.5, startBw: 0.4, cues: ['Shoulder blades pinched and down', 'Feet planted, slight arch', 'Bar touches lower chest, elbows ~45°', 'Use a spotter or safeties'] }),
    E({ id: 'db_bench', name: 'Dumbbell Bench Press', primary: 'chest', secondary: ['triceps', 'shoulders'], equipment: ['dumbbell', 'bench'], compound: true, avoidIf: [], increment: 2, startBw: 0.15, perHand: true, cues: ['Deep stretch at the bottom', 'Press up and slightly in', 'Wrists stacked over elbows'] }),
    E({ id: 'machine_press', name: 'Machine Chest Press', primary: 'chest', secondary: ['triceps'], equipment: ['machine'], compound: true, avoidIf: [], increment: 5, startBw: 0.3, cues: ['Handles at mid-chest height', 'Keep shoulder blades back'] }),
    E({ id: 'pushup', name: 'Push-up', primary: 'chest', secondary: ['triceps', 'shoulders', 'abs'], equipment: [], compound: true, avoidIf: ['wrist'], increment: 0, startBw: 0, cues: ['Body in a straight line', 'Chest to fist height', 'Elevate feet or add backpack to progress'] }),
    // ---------- incline ----------
    E({ id: 'incline_db', name: 'Incline Dumbbell Press', primary: 'chest', secondary: ['shoulders', 'triceps'], equipment: ['dumbbell', 'bench'], compound: true, avoidIf: [], increment: 2, startBw: 0.12, perHand: true, cues: ['Bench at 30°', 'Lower to upper chest', 'Full stretch'] }),
    E({ id: 'incline_bb', name: 'Incline Barbell Press', primary: 'chest', secondary: ['shoulders', 'triceps'], equipment: ['barbell', 'bench'], compound: true, avoidIf: ['shoulder'], increment: 2.5, startBw: 0.3, cues: ['Bench at 30°', 'Touch upper chest'] }),
    E({ id: 'incline_smith', name: 'Incline Smith Press', primary: 'chest', secondary: ['shoulders'], equipment: ['smith', 'bench'], compound: true, avoidIf: [], increment: 2.5, startBw: 0.3, cues: ['Bench at 30°', 'Bar path to upper chest'] }),
    E({ id: 'decline_pushup', name: 'Feet-elevated Push-up', primary: 'chest', secondary: ['shoulders', 'triceps'], equipment: [], compound: true, avoidIf: ['wrist'], increment: 0, startBw: 0, cues: ['Feet on a chair/bench', 'Straight body line'] }),
    // ---------- vertical push ----------
    E({ id: 'db_ohp', name: 'Seated Dumbbell Shoulder Press', primary: 'shoulders', secondary: ['triceps'], equipment: ['dumbbell', 'bench'], compound: true, avoidIf: ['shoulder'], increment: 2, startBw: 0.1, perHand: true, cues: ['Bench almost upright', 'Lower to ear level', "Don't flare ribs"] }),
    E({ id: 'bb_ohp', name: 'Standing Overhead Press', primary: 'shoulders', secondary: ['triceps', 'abs'], equipment: ['barbell'], compound: true, avoidIf: ['shoulder', 'lower_back'], increment: 2.5, startBw: 0.3, cues: ['Squeeze glutes, brace', 'Head through once bar passes forehead'] }),
    E({ id: 'machine_ohp', name: 'Machine Shoulder Press', primary: 'shoulders', secondary: ['triceps'], equipment: ['machine'], compound: true, avoidIf: [], increment: 5, startBw: 0.2, cues: ['Handles start at shoulder height'] }),
    E({ id: 'pike_pushup', name: 'Pike Push-up', primary: 'shoulders', secondary: ['triceps'], equipment: [], compound: true, avoidIf: ['shoulder', 'wrist'], increment: 0, startBw: 0, cues: ['Hips high, head goes in front of hands'] }),
    // ---------- horizontal pull ----------
    E({ id: 'cs_row', name: 'Chest-supported Dumbbell Row', primary: 'back', secondary: ['biceps', 'shoulders'], equipment: ['dumbbell', 'bench'], compound: true, avoidIf: [], increment: 2, startBw: 0.15, perHand: true, cues: ['Lie face down on incline bench', 'Pull elbows toward hips', 'Pause and squeeze'] }),
    E({ id: 'bb_row', name: 'Barbell Bent-over Row', primary: 'back', secondary: ['biceps'], equipment: ['barbell'], compound: true, avoidIf: ['lower_back'], increment: 2.5, startBw: 0.4, cues: ['Hinge to ~45°', 'Pull to lower ribs', 'No body swing'] }),
    E({ id: 'cable_row', name: 'Seated Cable Row', primary: 'back', secondary: ['biceps'], equipment: ['cable'], compound: true, avoidIf: [], increment: 2.5, startBw: 0.4, cues: ['Tall chest', 'Stretch forward, pull to belly button'] }),
    E({ id: 'one_arm_row', name: 'One-arm Dumbbell Row', primary: 'back', secondary: ['biceps'], equipment: ['dumbbell', 'bench'], compound: true, avoidIf: [], increment: 2, startBw: 0.2, perHand: true, cues: ['Knee and hand on bench', 'Pull dumbbell to hip'] }),
    E({ id: 'band_row', name: 'Band Row', primary: 'back', secondary: ['biceps'], equipment: ['bands'], compound: true, avoidIf: [], increment: 0, startBw: 0, cues: ['Anchor band at chest height', 'Squeeze shoulder blades'] }),
    E({ id: 'inverted_row', name: 'Inverted Row (table/bar)', primary: 'back', secondary: ['biceps'], equipment: [], compound: true, avoidIf: [], increment: 0, startBw: 0, cues: ['Body straight, pull chest to bar/table edge'] }),
    // ---------- vertical pull ----------
    E({ id: 'pulldown', name: 'Lat Pulldown', primary: 'back', secondary: ['biceps'], equipment: ['cable'], compound: true, avoidIf: [], increment: 2.5, startBw: 0.5, cues: ['Pull elbows down to your sides', 'Bar to upper chest', 'Control the way up'] }),
    E({ id: 'pullup', name: 'Pull-up / Chin-up', primary: 'back', secondary: ['biceps'], equipment: ['pullupbar'], compound: true, avoidIf: ['shoulder', 'elbow'], increment: 0, startBw: 0, cues: ['Full hang to chin over bar', 'If you cannot do 5, use a band or slow negatives'] }),
    E({ id: 'band_pulldown', name: 'Band Lat Pulldown', primary: 'back', secondary: ['biceps'], equipment: ['bands'], compound: true, avoidIf: [], increment: 0, startBw: 0, cues: ['Anchor high', 'Elbows to ribs'] }),
    // ---------- isolation: chest ----------
    E({ id: 'cable_fly', name: 'Cable Fly', primary: 'chest', secondary: [], equipment: ['cable'], compound: false, avoidIf: [], increment: 2.5, startBw: 0.1, cues: ['Slight bend in elbows', 'Hug a tree'] }),
    E({ id: 'pec_deck', name: 'Pec Deck', primary: 'chest', secondary: [], equipment: ['machine'], compound: false, avoidIf: [], increment: 5, startBw: 0.2, cues: ['Big stretch, squeeze at the front'] }),
    E({ id: 'db_fly', name: 'Dumbbell Fly', primary: 'chest', secondary: [], equipment: ['dumbbell', 'bench'], compound: false, avoidIf: ['shoulder'], increment: 1, startBw: 0.06, perHand: true, cues: ['Light weight, deep controlled stretch'] }),
    // ---------- isolation: shoulders ----------
    E({ id: 'db_lateral', name: 'Dumbbell Lateral Raise', primary: 'shoulders', secondary: [], equipment: ['dumbbell'], compound: false, avoidIf: [], increment: 1, startBw: 0.06, perHand: true, cues: ['Lead with elbows', 'Raise to shoulder height', 'No swinging'] }),
    E({ id: 'cable_lateral', name: 'Cable Lateral Raise', primary: 'shoulders', secondary: [], equipment: ['cable'], compound: false, avoidIf: [], increment: 1.25, startBw: 0.05, cues: ['Cable behind you', 'Smooth tension the whole way'] }),
    E({ id: 'band_lateral', name: 'Band Lateral Raise', primary: 'shoulders', secondary: [], equipment: ['bands'], compound: false, avoidIf: [], increment: 0, startBw: 0, cues: ['Stand on band', 'Slow and controlled'] }),
    E({ id: 'rear_delt_fly', name: 'Rear-delt Dumbbell Fly', primary: 'shoulders', secondary: ['back'], equipment: ['dumbbell'], compound: false, avoidIf: [], increment: 1, startBw: 0.05, perHand: true, cues: ['Hinge forward', 'Arms out wide, pinkies up'] }),
    E({ id: 'face_pull', name: 'Cable Face Pull', primary: 'shoulders', secondary: ['back'], equipment: ['cable'], compound: false, avoidIf: [], increment: 2.5, startBw: 0.15, cues: ['Rope to forehead', 'Thumbs back, elbows high'] }),
    E({ id: 'reverse_pec', name: 'Reverse Pec Deck', primary: 'shoulders', secondary: ['back'], equipment: ['machine'], compound: false, avoidIf: [], increment: 5, startBw: 0.15, cues: ['Arms straight, sweep back'] }),
    E({ id: 'band_pullapart', name: 'Band Pull-apart', primary: 'shoulders', secondary: ['back'], equipment: ['bands'], compound: false, avoidIf: [], increment: 0, startBw: 0, cues: ['Arms straight, band to chest'] }),
    // ---------- arms ----------
    E({ id: 'db_curl', name: 'Incline Dumbbell Curl', primary: 'biceps', secondary: [], equipment: ['dumbbell', 'bench'], compound: false, avoidIf: ['elbow'], increment: 1, startBw: 0.08, perHand: true, cues: ['Arms hang behind you', 'No shoulder swing', 'Slow negatives'] }),
    E({ id: 'standing_curl', name: 'Dumbbell Curl', primary: 'biceps', secondary: [], equipment: ['dumbbell'], compound: false, avoidIf: [], increment: 1, startBw: 0.1, perHand: true, cues: ['Elbows pinned', 'Squeeze at top'] }),
    E({ id: 'hammer_curl', name: 'Hammer Curl', primary: 'biceps', secondary: [], equipment: ['dumbbell'], compound: false, avoidIf: [], increment: 1, startBw: 0.1, perHand: true, cues: ['Neutral grip', 'Builds forearms and arm thickness'] }),
    E({ id: 'cable_curl', name: 'Cable Curl', primary: 'biceps', secondary: [], equipment: ['cable'], compound: false, avoidIf: [], increment: 2.5, startBw: 0.15, cues: ['Constant tension', 'Elbows still'] }),
    E({ id: 'bb_curl', name: 'Barbell Curl', primary: 'biceps', secondary: [], equipment: ['barbell'], compound: false, avoidIf: ['wrist', 'elbow'], increment: 2.5, startBw: 0.25, cues: ['No hip swing'] }),
    E({ id: 'band_curl', name: 'Band Curl', primary: 'biceps', secondary: [], equipment: ['bands'], compound: false, avoidIf: [], increment: 0, startBw: 0, cues: ['Stand on band'] }),
    E({ id: 'pushdown', name: 'Cable Triceps Pushdown', primary: 'triceps', secondary: [], equipment: ['cable'], compound: false, avoidIf: [], increment: 2.5, startBw: 0.25, cues: ['Elbows pinned to sides', 'Full lockout'] }),
    E({ id: 'oh_ext', name: 'Overhead Dumbbell Triceps Extension', primary: 'triceps', secondary: [], equipment: ['dumbbell'], compound: false, avoidIf: ['elbow', 'shoulder'], increment: 2, startBw: 0.15, cues: ['Hold one dumbbell with both hands', 'Deep stretch behind head'] }),
    E({ id: 'skull', name: 'Dumbbell Skull Crusher', primary: 'triceps', secondary: [], equipment: ['dumbbell', 'bench'], compound: false, avoidIf: ['elbow'], increment: 1, startBw: 0.08, perHand: true, cues: ['Lower beside your head', 'Upper arms stay still'] }),
    E({ id: 'bench_dip', name: 'Bench Dip', primary: 'triceps', secondary: ['chest'], equipment: [], compound: false, avoidIf: ['shoulder'], increment: 0, startBw: 0, cues: ['Hands on chair edge', 'Elbows go back, not out'] }),
    E({ id: 'cg_pushup', name: 'Close-grip Push-up', primary: 'triceps', secondary: ['chest'], equipment: [], compound: false, avoidIf: ['wrist'], increment: 0, startBw: 0, cues: ['Hands under shoulders, elbows tucked'] }),
    // ---------- legs isolation ----------
    E({ id: 'leg_ext', name: 'Leg Extension', primary: 'quads', secondary: [], equipment: ['machine'], compound: false, avoidIf: ['knee'], increment: 5, startBw: 0.3, cues: ['Pause at top', 'Slow 3 second lowering'] }),
    E({ id: 'spanish_squat', name: 'Wall Sit / Spanish Squat', primary: 'quads', secondary: [], equipment: [], compound: false, avoidIf: [], increment: 0, startBw: 0, cues: ['Count seconds as reps'] }),
    E({ id: 'leg_curl', name: 'Lying/Seated Leg Curl', primary: 'hamstrings', secondary: [], equipment: ['machine'], compound: false, avoidIf: [], increment: 5, startBw: 0.25, cues: ['Hips pressed down', 'Control the return'] }),
    E({ id: 'db_leg_curl', name: 'Dumbbell Leg Curl', primary: 'hamstrings', secondary: [], equipment: ['dumbbell', 'bench'], compound: false, avoidIf: [], increment: 1, startBw: 0.08, cues: ['Dumbbell between feet, lie face down'] }),
    E({ id: 'slider_curl', name: 'Slider / Towel Leg Curl', primary: 'hamstrings', secondary: ['glutes'], equipment: [], compound: false, avoidIf: [], increment: 0, startBw: 0, cues: ['Hips up, slide heels in and out'] }),
    E({ id: 'calf_machine', name: 'Standing Calf Raise (machine)', primary: 'calves', secondary: [], equipment: ['machine'], compound: false, avoidIf: [], increment: 5, startBw: 0.5, cues: ['Full stretch at bottom, 1 sec pause', 'Rise as high as possible'] }),
    E({ id: 'db_calf', name: 'Single-leg Dumbbell Calf Raise', primary: 'calves', secondary: [], equipment: ['dumbbell'], compound: false, avoidIf: [], increment: 2, startBw: 0.1, cues: ['On a step for full range'] }),
    E({ id: 'bw_calf', name: 'Bodyweight Calf Raise', primary: 'calves', secondary: [], equipment: [], compound: false, avoidIf: [], increment: 0, startBw: 0, cues: ['On a step, slow and full range'] }),
    // ---------- abs ----------
    E({ id: 'cable_crunch', name: 'Cable Crunch', primary: 'abs', secondary: [], equipment: ['cable'], compound: false, avoidIf: [], increment: 2.5, startBw: 0.3, cues: ['Curl ribs to pelvis', 'Hips stay still'] }),
    E({ id: 'hanging_knee', name: 'Hanging Knee Raise', primary: 'abs', secondary: [], equipment: ['pullupbar'], compound: false, avoidIf: ['shoulder'], increment: 0, startBw: 0, cues: ['Curl pelvis up, no swinging'] }),
    E({ id: 'dead_bug', name: 'Dead Bug', primary: 'abs', secondary: [], equipment: [], compound: false, avoidIf: [], increment: 0, startBw: 0, cues: ['Lower back pressed into floor', 'Reps per side'] }),
  ].map((e) => [e.id, e]),
)

/** Ordered preference lists. The first exercise that fits equipment + injuries wins. */
export const POOLS: Record<string, string[]> = {
  squat: ['bb_squat', 'leg_press', 'smith_squat', 'goblet_squat', 'bw_squat'],
  squat2: ['leg_press', 'smith_squat', 'goblet_squat', 'bb_squat', 'bw_squat'],
  hinge: ['bb_rdl', 'db_rdl', 'hip_thrust', 'back_ext', 'glute_bridge'],
  hinge2: ['hip_thrust', 'deadlift', 'db_rdl', 'back_ext', 'glute_bridge'],
  lunge: ['bss', 'db_lunge', 'step_up', 'rev_lunge'],
  hpush: ['bb_bench', 'db_bench', 'machine_press', 'pushup'],
  hpush2: ['db_bench', 'machine_press', 'bb_bench', 'pushup'],
  incline: ['incline_db', 'incline_smith', 'incline_bb', 'decline_pushup'],
  vpush: ['db_ohp', 'machine_ohp', 'bb_ohp', 'pike_pushup'],
  hpull: ['cs_row', 'cable_row', 'bb_row', 'one_arm_row', 'band_row', 'inverted_row'],
  hpull2: ['cable_row', 'one_arm_row', 'bb_row', 'cs_row', 'band_row', 'inverted_row'],
  vpull: ['pulldown', 'pullup', 'band_pulldown', 'inverted_row'],
  vpull2: ['pullup', 'pulldown', 'band_pulldown', 'inverted_row'],
  chestIso: ['cable_fly', 'pec_deck', 'db_fly', 'pushup'],
  lateral: ['db_lateral', 'cable_lateral', 'band_lateral', 'pike_pushup'],
  rearDelt: ['face_pull', 'reverse_pec', 'rear_delt_fly', 'band_pullapart'],
  biceps: ['db_curl', 'cable_curl', 'standing_curl', 'bb_curl', 'band_curl'],
  biceps2: ['hammer_curl', 'bb_curl', 'cable_curl', 'band_curl'],
  triceps: ['pushdown', 'oh_ext', 'skull', 'cg_pushup', 'bench_dip'],
  triceps2: ['oh_ext', 'skull', 'pushdown', 'bench_dip', 'cg_pushup'],
  quadIso: ['leg_ext', 'goblet_squat', 'spanish_squat'],
  hamIso: ['leg_curl', 'db_leg_curl', 'slider_curl'],
  calves: ['calf_machine', 'db_calf', 'bw_calf'],
  abs: ['cable_crunch', 'hanging_knee', 'dead_bug'],
}

export function fits(ex: Exercise, equipment: Equipment[], injuries: Injury[]) {
  return ex.equipment.every((e) => equipment.includes(e)) && !ex.avoidIf.some((i) => injuries.includes(i))
}

export function pickFromPool(pool: string, equipment: Equipment[], injuries: Injury[], exclude: string[] = []): Exercise {
  const ids = POOLS[pool] ?? []
  const ok = ids.map((id) => EXERCISES[id]).filter((e) => fits(e, equipment, injuries))
  return ok.find((e) => !exclude.includes(e.id)) ?? ok[0] ?? EXERCISES[ids[ids.length - 1]]
}

export function alternatives(pool: string, equipment: Equipment[], injuries: Injury[]): Exercise[] {
  return (POOLS[pool] ?? []).map((id) => EXERCISES[id]).filter((e) => fits(e, equipment, injuries))
}

export const MUSCLE_LABEL: Record<Muscle, string> = {
  chest: 'Chest', back: 'Back', shoulders: 'Shoulders', biceps: 'Biceps', triceps: 'Triceps',
  quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves', abs: 'Abs',
}
export const ALL_MUSCLES = Object.keys(MUSCLE_LABEL) as Muscle[]

/** Demo photos (start + end position) from free-exercise-db (public domain, github.com/yuhonas/free-exercise-db). */
const IMAGE_IDS: Record<string, string> = {
  "bb_squat": "Barbell_Squat",
  "smith_squat": "Smith_Machine_Squat",
  "leg_press": "Leg_Press",
  "goblet_squat": "Goblet_Squat",
  "bw_squat": "Bodyweight_Squat",
  "bb_rdl": "Romanian_Deadlift",
  "db_rdl": "Stiff-Legged_Dumbbell_Deadlift",
  "deadlift": "Barbell_Deadlift",
  "hip_thrust": "Barbell_Hip_Thrust",
  "back_ext": "Hyperextensions_Back_Extensions",
  "glute_bridge": "Single_Leg_Glute_Bridge",
  "bss": "Split_Squat_with_Dumbbells",
  "db_lunge": "Dumbbell_Lunges",
  "step_up": "Dumbbell_Step_Ups",
  "rev_lunge": "Dumbbell_Rear_Lunge",
  "bb_bench": "Barbell_Bench_Press_-_Medium_Grip",
  "db_bench": "Dumbbell_Bench_Press",
  "machine_press": "Machine_Bench_Press",
  "pushup": "Pushups",
  "incline_db": "Incline_Dumbbell_Press",
  "incline_bb": "Barbell_Incline_Bench_Press_-_Medium_Grip",
  "incline_smith": "Smith_Machine_Incline_Bench_Press",
  "decline_pushup": "Push-Ups_With_Feet_Elevated",
  "db_ohp": "Dumbbell_Shoulder_Press",
  "bb_ohp": "Standing_Military_Press",
  "machine_ohp": "Machine_Shoulder_Military_Press",
  "pike_pushup": "Handstand_Push-Ups",
  "cs_row": "Dumbbell_Incline_Row",
  "bb_row": "Bent_Over_Barbell_Row",
  "cable_row": "Seated_Cable_Rows",
  "one_arm_row": "One-Arm_Dumbbell_Row",
  "band_row": "Suspended_Row",
  "inverted_row": "Inverted_Row",
  "pulldown": "Wide-Grip_Lat_Pulldown",
  "pullup": "Pullups",
  "band_pulldown": "Straight-Arm_Pulldown",
  "cable_fly": "Flat_Bench_Cable_Flyes",
  "pec_deck": "Butterfly",
  "db_fly": "Dumbbell_Flyes",
  "db_lateral": "Side_Lateral_Raise",
  "cable_lateral": "Cable_Seated_Lateral_Raise",
  "band_lateral": "Lateral_Raise_-_With_Bands",
  "rear_delt_fly": "Seated_Bent-Over_Rear_Delt_Raise",
  "face_pull": "Face_Pull",
  "reverse_pec": "Reverse_Machine_Flyes",
  "band_pullapart": "Band_Pull_Apart",
  "db_curl": "Incline_Dumbbell_Curl",
  "standing_curl": "Dumbbell_Bicep_Curl",
  "hammer_curl": "Hammer_Curls",
  "cable_curl": "Standing_Biceps_Cable_Curl",
  "bb_curl": "Barbell_Curl",
  "band_curl": "Standing_Biceps_Cable_Curl",
  "pushdown": "Triceps_Pushdown",
  "oh_ext": "Standing_Dumbbell_Triceps_Extension",
  "skull": "Decline_Dumbbell_Triceps_Extension",
  "bench_dip": "Bench_Dips",
  "cg_pushup": "Push-Ups_-_Close_Triceps_Position",
  "leg_ext": "Leg_Extensions",
  "spanish_squat": "Weighted_Sissy_Squat",
  "leg_curl": "Lying_Leg_Curls",
  "db_leg_curl": "Ball_Leg_Curl",
  "slider_curl": "Ball_Leg_Curl",
  "calf_machine": "Standing_Calf_Raises",
  "db_calf": "Standing_Dumbbell_Calf_Raise",
  "bw_calf": "Standing_Dumbbell_Calf_Raise",
  "cable_crunch": "Cable_Crunch",
  "hanging_knee": "Hanging_Leg_Raise",
  "dead_bug": "Dead_Bug"
}

export function exerciseImages(id: string): string[] {
  const img = IMAGE_IDS[id]
  if (!img) return []
  const base = `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/${img}`
  return [`${base}/0.jpg`, `${base}/1.jpg`]
}
