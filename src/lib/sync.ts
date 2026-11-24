import { createClient, type SupabaseClient, type Session as AuthSession } from '@supabase/supabase-js'
import { db, onLocalWrite, SYNC_TABLES, type SyncTable } from '../db'
import type { Photo } from '../types'
import { getSettings } from './settings'

let client: SupabaseClient | null = null
let clientKey = ''

export function supabase(): SupabaseClient | null {
  const { supabaseUrl, supabaseAnonKey } = getSettings()
  if (!supabaseUrl || !supabaseAnonKey) return null
  const k = supabaseUrl + supabaseAnonKey
  if (!client || clientKey !== k) {
    client = createClient(supabaseUrl, supabaseAnonKey, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true } })
    clientKey = k
  }
  return client
}

export async function authSession(): Promise<AuthSession | null> {
  const sb = supabase()
  if (!sb) return null
  const { data } = await sb.auth.getSession()
  return data.session
}

type Status = { state: 'off' | 'idle' | 'syncing' | 'error'; last?: number; message?: string }
let status: Status = { state: 'off' }
const statusListeners = new Set<(s: Status) => void>()
export const onSyncStatus = (fn: (s: Status) => void) => { statusListeners.add(fn); fn(status); return () => { statusListeners.delete(fn) } }
const setStatus = (s: Status) => { status = s; statusListeners.forEach((f) => f(s)) }

const LS_PUSH = 'gainlab.lastPush'
const LS_PULL = 'gainlab.lastPull'
const getNum = (k: string) => Number(localStorage.getItem(k) ?? 0)

function stripLocal(tbl: SyncTable, rec: any) {
  if (tbl === 'photos') { const { blob: _b, ...rest } = rec as Photo; return rest }
  return rec
}

async function uploadPhotos(sb: SupabaseClient, userId: string) {
  const pending = await db.photos.filter((p) => !!p.blob && !p.remotePath).toArray()
  for (const p of pending) {
    const path = `${userId}/${p.id}.jpg`
    const { error } = await sb.storage.from('photos').upload(path, p.blob!, { upsert: true, contentType: 'image/jpeg' })
    if (!error) await db.photos.update(p.id, { remotePath: path, updatedAt: Date.now() })
  }
}

let running = false
export async function syncNow(): Promise<void> {
  const sb = supabase()
  if (!sb) { setStatus({ state: 'off' }); return }
  const session = await authSession()
  if (!session) { setStatus({ state: 'off', message: 'Not signed in' }); return }
  if (running) return
  running = true
  setStatus({ state: 'syncing', last: status.last })
  try {
    const userId = session.user.id
    await uploadPhotos(sb, userId)
    // ---- push ----
    const since = getNum(LS_PUSH)
    const pushStart = Date.now()
    const rows: any[] = []
    for (const tbl of SYNC_TABLES) {
      const changed = await (db[tbl] as any).where('updatedAt').above(since).toArray()
      for (const r of changed) rows.push({ user_id: userId, tbl, id: r.id, data: stripLocal(tbl, r), deleted: false, updated_at: r.updatedAt })
    }
    const tombs = await db.tombstones.where('updatedAt').above(since).toArray()
    for (const t of tombs) rows.push({ user_id: userId, tbl: t.tbl, id: t.recId, data: null, deleted: true, updated_at: t.updatedAt })
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await sb.from('records').upsert(rows.slice(i, i + 200), { onConflict: 'user_id,tbl,id' })
      if (error) throw error
    }
    localStorage.setItem(LS_PUSH, String(pushStart))

    // ---- pull (by server timestamp to avoid clock skew) ----
    const lastPull = localStorage.getItem(LS_PULL) ?? '1970-01-01T00:00:00Z'
    let maxSeen = lastPull
    let from = 0
    for (;;) {
      const { data, error } = await sb.from('records').select('*').gt('server_updated_at', lastPull).order('server_updated_at').range(from, from + 499)
      if (error) throw error
      if (!data?.length) break
      for (const row of data) {
        maxSeen = row.server_updated_at > maxSeen ? row.server_updated_at : maxSeen
        const tbl = row.tbl as SyncTable
        if (!SYNC_TABLES.includes(tbl)) continue
        const table = db[tbl] as any
        const local = await table.get(row.id)
        if (row.deleted) {
          if (!local || local.updatedAt <= row.updated_at) await table.delete(row.id)
          continue
        }
        if (!local || local.updatedAt < row.updated_at) {
          const merged = tbl === 'photos' && local?.blob ? { ...row.data, blob: local.blob } : row.data
          await table.put(merged) // direct put: does not re-trigger a push
        }
      }
      if (data.length < 500) break
      from += 500
    }
    localStorage.setItem(LS_PULL, maxSeen)
    setStatus({ state: 'idle', last: Date.now() })
  } catch (e: any) {
    setStatus({ state: 'error', last: status.last, message: e?.message ?? String(e) })
  } finally {
    running = false
  }
}

/** Lazily fetch a photo's image from cloud storage if this device doesn't have it. */
export async function photoBlob(p: Photo): Promise<Blob | null> {
  if (p.blob) return p.blob
  const sb = supabase()
  if (!sb || !p.remotePath) return null
  const { data } = await sb.storage.from('photos').download(p.remotePath)
  if (data) await db.photos.update(p.id, { blob: data })
  return data ?? null
}

export async function deleteRemotePhoto(p: Photo) {
  const sb = supabase()
  if (sb && p.remotePath) await sb.storage.from('photos').remove([p.remotePath])
}

let timer: number | undefined
export function startAutoSync() {
  const kick = () => { clearTimeout(timer); timer = window.setTimeout(syncNow, 2500) }
  onLocalWrite(kick)
  window.addEventListener('online', kick)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') kick() })
  setInterval(syncNow, 3 * 60 * 1000)
  supabase()?.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_IN') kick() })
  syncNow()
}

export function resetSyncCursors() {
  localStorage.removeItem(LS_PUSH)
  localStorage.removeItem(LS_PULL)
}
