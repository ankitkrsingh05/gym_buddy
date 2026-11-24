import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from './db'
import { dailyTarget, energyModel, extraActivityByDate, forecast, latestWeight, stepsKcal } from './lib/nutrition'
import { addDays, today } from './lib/util'
import type { Profile } from './types'

export const useProfile = () => useLiveQuery(() => db.profile.get('me'), [], null as Profile | null | undefined)
export const usePlan = () => useLiveQuery(() => db.plan.get('current'))

/** Everything needed for calorie targets, the adaptive model and forecasts. */
export function useEnergy(profile: Profile | null | undefined) {
  const since = addDays(today(), -60)
  const weights = useLiveQuery(() => db.weights.toArray(), [], [])
  const logs = useLiveQuery(() => db.foodLogs.where('date').aboveOrEqual(since).toArray(), [since], [])
  const checkins = useLiveQuery(() => db.checkins.where('date').aboveOrEqual(since).toArray(), [since], [])
  const acts = useLiveQuery(() => db.activities.where('date').aboveOrEqual(since).toArray(), [since], [])
  const sessions = useLiveQuery(() => db.sessions.where('date').aboveOrEqual(since).toArray(), [since], [])

  return useMemo(() => {
    if (!profile) return null
    const kg = latestWeight(profile, weights)
    const extras = extraActivityByDate(profile, kg, checkins, acts, sessions)
    const em = energyModel(profile, weights, logs, extras)
    const targetFor = (date: string) => {
      const hasSteps = checkins.some((c) => c.date === date)
      // If no steps logged yet for the day, assume typical steps so the target isn't too low
      const extra = (extras[date] ?? 0) + (hasSteps ? 0 : stepsKcal(profile.typicalSteps, kg))
      return dailyTarget(profile, em, extra, kg)
    }
    return { kg, em, extras, targetFor, forecast: forecast(profile, weights, em), weights, logs, checkins, acts, sessions }
  }, [profile, weights, logs, checkins, acts, sessions])
}

