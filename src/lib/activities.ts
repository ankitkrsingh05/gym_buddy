import type { Activity, Muscle } from '../types'

export type ActivityCategory = 'cardio' | 'water' | 'sport' | 'mind-body' | 'outdoor' | 'daily'

export interface ActivityDef {
  name: string
  icon: string
  category: ActivityCategory
  /** MET at light / moderate / vigorous effort */
  met: [number, number, number]
  /** Muscles meaningfully loaded (used to trim gym volume the next day) */
  muscles: Muscle[]
  /** Counts as recovery (mobility / relaxation) rather than fatigue */
  recovery?: boolean
  /** Supports distance logging */
  distance?: boolean
  hint?: string
}

// METs from the 2024 Adult Compendium of Physical Activities (rounded)
export const ACTIVITIES: ActivityDef[] = [
  { name: 'Walking', icon: '🚶', category: 'cardio', met: [2.8, 3.5, 4.5], muscles: [], distance: true },
  { name: 'Running', icon: '🏃', category: 'cardio', met: [7, 9.8, 11.5], muscles: ['quads', 'hamstrings', 'calves'], distance: true },
  { name: 'Cycling', icon: '🚴', category: 'cardio', met: [4, 6.8, 10], muscles: ['quads', 'glutes'], distance: true },
  { name: 'Stairs / stepper', icon: '🪜', category: 'cardio', met: [4, 6, 9], muscles: ['quads', 'glutes', 'calves'] },
  { name: 'HIIT / circuit', icon: '⚡', category: 'cardio', met: [5, 8, 10], muscles: ['quads', 'chest', 'shoulders'] },
  { name: 'Skipping rope', icon: '🪢', category: 'cardio', met: [8, 11, 12.3], muscles: ['calves'] },
  { name: 'Elliptical / rower', icon: '🚣', category: 'cardio', met: [4.5, 6, 8.5], muscles: ['back', 'quads'] },
  { name: 'Swimming – freestyle', icon: '🏊', category: 'water', met: [5.8, 8.3, 10], muscles: ['back', 'shoulders'], distance: true },
  { name: 'Swimming – breaststroke', icon: '🏊', category: 'water', met: [5.3, 8.3, 10.3], muscles: ['chest', 'quads', 'shoulders'], distance: true },
  { name: 'Swimming – leisure', icon: '🏊', category: 'water', met: [4, 6, 7], muscles: ['shoulders'] },
  { name: 'Water aerobics', icon: '💦', category: 'water', met: [3, 5.3, 6.5], muscles: [] },
  { name: 'Yoga – gentle / hatha', icon: '🧘', category: 'mind-body', met: [2, 2.5, 3], muscles: [], recovery: true, hint: 'Counts as active recovery' },
  { name: 'Yoga – power / vinyasa', icon: '🧘', category: 'mind-body', met: [3.3, 4, 5.5], muscles: ['shoulders', 'abs'] },
  { name: 'Stretching / mobility', icon: '🤸', category: 'mind-body', met: [2, 2.3, 2.8], muscles: [], recovery: true, hint: 'Counts as active recovery' },
  { name: 'Pilates', icon: '🤸', category: 'mind-body', met: [2.8, 3.5, 4.5], muscles: ['abs'] },
  { name: 'Meditation / breathwork', icon: '🕯️', category: 'mind-body', met: [1.2, 1.3, 1.5], muscles: [], recovery: true },
  { name: 'Cricket', icon: '🏏', category: 'sport', met: [4, 5, 6.5], muscles: ['shoulders', 'quads'] },
  { name: 'Football', icon: '⚽', category: 'sport', met: [6, 7, 10], muscles: ['quads', 'hamstrings', 'calves'] },
  { name: 'Badminton', icon: '🏸', category: 'sport', met: [4.5, 5.5, 7], muscles: ['shoulders', 'calves'] },
  { name: 'Tennis', icon: '🎾', category: 'sport', met: [5, 7.3, 8], muscles: ['shoulders', 'calves'] },
  { name: 'Table tennis', icon: '🏓', category: 'sport', met: [3, 4, 5], muscles: [] },
  { name: 'Basketball', icon: '🏀', category: 'sport', met: [4.5, 6.5, 8], muscles: ['quads', 'calves'] },
  { name: 'Volleyball', icon: '🏐', category: 'sport', met: [3, 4, 6], muscles: ['shoulders'] },
  { name: 'Martial arts / boxing', icon: '🥊', category: 'sport', met: [5.5, 7.8, 10.3], muscles: ['shoulders', 'abs'] },
  { name: 'Climbing / bouldering', icon: '🧗', category: 'sport', met: [5, 7.3, 8], muscles: ['back', 'biceps'] },
  { name: 'Dancing', icon: '💃', category: 'sport', met: [3.5, 5, 7.3], muscles: [] },
  { name: 'Hiking / trekking', icon: '🥾', category: 'outdoor', met: [4.5, 6, 7.8], muscles: ['quads', 'calves'], distance: true },
  { name: 'Gardening / yard work', icon: '🌱', category: 'daily', met: [3, 3.8, 5], muscles: [] },
  { name: 'Household chores', icon: '🧹', category: 'daily', met: [2.3, 3.3, 4], muscles: [] },
  { name: 'Playing with kids', icon: '🧒', category: 'daily', met: [2.5, 3.5, 5.8], muscles: [] },
  { name: 'Other', icon: '✨', category: 'daily', met: [3, 4, 6], muscles: [] },
]

export const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  cardio: 'Cardio', water: 'Water', sport: 'Sports', 'mind-body': 'Yoga & mobility', outdoor: 'Outdoor', daily: 'Everyday',
}

const LEGACY: Record<string, string> = {
  'Walking (casual)': 'Walking', 'Walking (brisk)': 'Walking', Swimming: 'Swimming – freestyle', Yoga: 'Yoga – gentle / hatha',
  Stretching: 'Stretching / mobility', Hiking: 'Hiking / trekking', Stairs: 'Stairs / stepper', HIIT: 'HIIT / circuit',
  'Martial arts': 'Martial arts / boxing',
}

export function activityDef(name: string): ActivityDef {
  return ACTIVITIES.find((a) => a.name === name) ?? ACTIVITIES.find((a) => a.name === LEGACY[name]) ?? ACTIVITIES[ACTIVITIES.length - 1]
}

const IDX = { light: 0, moderate: 1, vigorous: 2 } as const

/** Net kcal above resting: (MET − 1) × kg × hours */
export function activityKcal(type: string, minutes: number, intensity: Activity['intensity'], kg: number) {
  const met = activityDef(type).met[IDX[intensity]]
  return Math.round((met - 1) * kg * (minutes / 60))
}

/** Rough fatigue score: vigorous long sessions count more. Recovery activities count as 0. */
export function activityLoad(a: Pick<Activity, 'type' | 'minutes' | 'intensity'>) {
  const d = activityDef(a.type)
  if (d.recovery) return 0
  return (a.minutes / 60) * [0.5, 1, 1.6][IDX[a.intensity]]
}
