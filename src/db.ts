import Dexie, { type Table } from 'dexie'
import type {
  Activity, CheckIn, FoodItem, FoodLog, Measurement, Photo, Plan, Profile, Session, Tombstone, WeightEntry,
} from './types'

class GainDB extends Dexie {
  profile!: Table<Profile, string>
  plan!: Table<Plan, string>
  sessions!: Table<Session, string>
  foods!: Table<FoodItem, string>
  foodLogs!: Table<FoodLog, string>
  weights!: Table<WeightEntry, string>
  measurements!: Table<Measurement, string>
  checkins!: Table<CheckIn, string>
  activities!: Table<Activity, string>
  photos!: Table<Photo, string>
  tombstones!: Table<Tombstone, string>

  constructor() {
    super('gainlab')
    this.version(1).stores({
      profile: 'id, updatedAt',
      plan: 'id, updatedAt',
      sessions: 'id, date, updatedAt',
      foods: 'id, name, updatedAt',
      foodLogs: 'id, date, updatedAt',
      weights: 'id, date, updatedAt',
      measurements: 'id, date, updatedAt',
      checkins: 'id, date, updatedAt',
      activities: 'id, date, updatedAt',
      photos: 'id, date, pose, updatedAt',
      tombstones: 'id, tbl, updatedAt',
    })
  }
}

export const db = new GainDB()

export const SYNC_TABLES = [
  'profile', 'plan', 'sessions', 'foods', 'foodLogs', 'weights', 'measurements', 'checkins', 'activities', 'photos',
] as const
export type SyncTable = (typeof SYNC_TABLES)[number]

type Listener = () => void
const listeners = new Set<Listener>()
/** Subscribe to local writes (used by the sync engine). */
export function onLocalWrite(fn: Listener) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
const notify = () => listeners.forEach((l) => l())

/** Upsert a record, stamping updatedAt. Always use this instead of table.put so sync sees the change. */
export async function save<T extends { id: string }>(tbl: SyncTable, rec: T): Promise<T & { updatedAt: number }> {
  const withTs = { ...rec, updatedAt: Date.now() }
  await (db[tbl] as unknown as Table<T & { updatedAt: number }, string>).put(withTs)
  notify()
  return withTs
}

export async function remove(tbl: SyncTable, id: string) {
  await db.transaction('rw', db[tbl], db.tombstones, async () => {
    await db[tbl].delete(id)
    await db.tombstones.put({ id: `${tbl}:${id}`, tbl, recId: id, updatedAt: Date.now() })
  })
  notify()
}
