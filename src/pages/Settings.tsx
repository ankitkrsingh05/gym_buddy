import { useEffect, useState } from 'react'
import { BodySection, FoodSection, LifestyleSection, TrainingSection } from '../components/ProfileForm'
import { Button, Card, Field, inputCls, Segmented } from '../components/ui'
import { db, save, SYNC_TABLES } from '../db'
import { usePlan, useProfile } from '../hooks'
import { blobToBase64 } from '../lib/gemini'
import { generatePlan } from '../lib/plan'
import { BUILT_IN_SYNC, getSettings, setSettings, type Settings as S } from '../lib/settings'
import { authSession, onSyncStatus, resetSyncCursors, supabase, syncNow } from '../lib/sync'
import { today } from '../lib/util'
import type { Profile } from '../types'

const TRAINING_KEYS: (keyof Profile)[] = ['experience', 'equipment', 'daysPerWeek', 'sessionMinutes', 'injuries', 'focus', 'knownLifts']

export default function Settings() {
  const profile = useProfile()
  const plan = usePlan()
  const [p, setP] = useState<Profile | null>(null)
  const [sec, setSec] = useState<'body' | 'training' | 'food' | 'life'>('body')
  const [msg, setMsg] = useState('')
  useEffect(() => { if (profile && !p) setP(profile) }, [profile, p])
  if (!p || !profile) return null

  async function saveProfile() {
    const trainingChanged = TRAINING_KEYS.some((k) => JSON.stringify(profile![k]) !== JSON.stringify(p![k]))
    const saved = await save('profile', p!)
    if (trainingChanged) await save('plan', generatePlan(saved, plan))
    setMsg(trainingChanged ? 'Saved. Your training plan was rebuilt (progress kept).' : 'Saved.')
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card title="Profile & goals">
        <Segmented value={sec} onChange={setSec} options={[{ value: 'body', label: 'Body' }, { value: 'training', label: 'Training' }, { value: 'food', label: 'Food' }, { value: 'life', label: 'Lifestyle' }]} />
        <div className="mt-4">
          {sec === 'body' && <BodySection p={p} set={(x) => setP({ ...p, ...x })} />}
          {sec === 'training' && <TrainingSection p={p} set={(x) => setP({ ...p, ...x })} />}
          {sec === 'food' && <FoodSection p={p} set={(x) => setP({ ...p, ...x })} />}
          {sec === 'life' && <LifestyleSection p={p} set={(x) => setP({ ...p, ...x })} />}
        </div>
        <Button className="mt-4 w-full" onClick={saveProfile}>Save profile</Button>
        {msg && <p className="mt-2 text-center text-sm text-emerald-400">{msg}</p>}
      </Card>
      <SyncSettings />
      <AiSettings />
      <DataSettings />
    </div>
  )
}

function useSettings(): [S, (s: Partial<S>) => void] {
  const [s, setS] = useState(getSettings())
  return [s, (x) => setS(setSettings(x))]
}

function SyncSettings() {
  const [s, set] = useSettings()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [user, setUser] = useState<string | null>(null)
  const [status, setStatus] = useState<{ state: string; last?: number; message?: string }>({ state: 'off' })
  const [note, setNote] = useState('')
  useEffect(() => onSyncStatus(setStatus), [])
  useEffect(() => { authSession().then((x) => setUser(x?.user.email ?? null)) }, [s.supabaseUrl, s.supabaseAnonKey, status.state])

  async function auth(kind: 'in' | 'up' | 'link') {
    const sb = supabase()
    if (!sb) return setNote('Enter your Supabase URL and anon key first.')
    setNote('')
    const redirect = location.origin + location.pathname
    const r = kind === 'up' ? await sb.auth.signUp({ email, password: pw, options: { emailRedirectTo: redirect } })
      : kind === 'in' ? await sb.auth.signInWithPassword({ email, password: pw })
        : await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect } })
    if (r.error) return setNote(r.error.message)
    if (kind === 'link') return setNote('Check your email and open the link on this device.')
    if (kind === 'up' && !r.data.session) return setNote('Account created — confirm via the email, then sign in.')
    setUser(r.data.session?.user.email ?? null)
    resetSyncCursors()
    syncNow()
  }

  return (
    <Card title="Cloud sync (phone + web)">
      <div className="space-y-3">
        {BUILT_IN_SYNC ? (
          <p className="text-sm text-slate-400">Connected to your GainLab cloud. Sign in with the same account on your phone and laptop to keep them in sync.</p>
        ) : (
          <>
            <p className="text-sm text-slate-400">Free with Supabase. Create a project at supabase.com, run <code className="text-emerald-300">supabase/schema.sql</code> in its SQL editor, then paste the Project URL and publishable key here.</p>
            <Field label="Project URL"><input className={inputCls} placeholder="https://xxxx.supabase.co" value={s.supabaseUrl} onChange={(e) => set({ supabaseUrl: e.target.value.trim() })} /></Field>
            <Field label="Publishable key"><input className={inputCls} type="password" autoComplete="off" value={s.supabaseAnonKey} onChange={(e) => set({ supabaseAnonKey: e.target.value.trim() })} /></Field>
          </>
        )}
        {user ? (
          <div className="space-y-2">
            <p className="text-sm">Signed in as <b>{user}</b> · {status.state === 'error' ? <span className="text-rose-400">{status.message}</span> : status.last ? `last sync ${new Date(status.last).toLocaleTimeString()}` : status.state}</p>
            <div className="flex gap-2">
              <Button variant="soft" onClick={() => syncNow()}>Sync now</Button>
              <Button variant="ghost" onClick={async () => { await supabase()?.auth.signOut(); setUser(null) }}>Sign out</Button>
            </div>
          </div>
        ) : s.supabaseUrl && s.supabaseAnonKey ? (
          <div className="space-y-2">
            <input className={inputCls} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className={inputCls} type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              <Button disabled={!email || pw.length < 6} onClick={() => auth('in')}>Sign in</Button>
              <Button variant="soft" disabled={!email || pw.length < 6} onClick={() => auth('up')}>Create account</Button>
              <Button variant="ghost" disabled={!email} onClick={() => auth('link')}>Email me a link</Button>
            </div>
          </div>
        ) : null}
        {note && <p className="text-sm text-amber-300">{note}</p>}
      </div>
    </Card>
  )
}

function AiSettings() {
  const [s, set] = useSettings()
  return (
    <Card title="AI & food database">
      <div className="space-y-3">
        {BUILT_IN_SYNC && <p className="text-sm text-slate-400">AI uses the Gemini key stored securely on the server. Just sign in above (with an allowed email) — no key needed on this device.</p>}
        <Field label={BUILT_IN_SYNC ? 'Personal Gemini key (optional)' : 'Gemini API key (free)'} hint="Only if you don't use the server key. Stored only on this device. Google may use free-tier requests to improve its models.">
          <input className={inputCls} type="password" value={s.geminiKey} onChange={(e) => set({ geminiKey: e.target.value.trim() })} />
        </Field>
        <Field label="Gemini model" hint="Change if Google retires this model name."><input className={inputCls} value={s.geminiModel} onChange={(e) => set({ geminiModel: e.target.value.trim() })} /></Field>
        <label className="flex items-start gap-2 text-sm text-slate-300">
          <input type="checkbox" className="mt-1" checked={s.aiPhotoReview} onChange={(e) => set({ aiPhotoReview: e.target.checked })} />
          <span>Allow sending <b>progress photos</b> to Gemini for AI review. Off by default for privacy. Body-shape tracking works without it (it runs on your device).</span>
        </label>
        <Field label="USDA FoodData Central key" hint="Optional. DEMO_KEY works but is rate-limited; a free key is at fdc.nal.usda.gov/api-key-signup."><input className={inputCls} value={s.usdaKey} onChange={(e) => set({ usdaKey: e.target.value.trim() })} /></Field>
      </div>
    </Card>
  )
}

function DataSettings() {
  const [busy, setBusy] = useState(false)
  async function exportAll() {
    setBusy(true)
    const out: Record<string, unknown[]> = {}
    for (const t of SYNC_TABLES) {
      const rows = await (db[t] as any).toArray()
      out[t] = t === 'photos' ? await Promise.all(rows.map(async (r: any) => ({ ...r, blob: r.blob ? await blobToBase64(r.blob) : undefined }))) : rows
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: 'gainlab', version: 1, exportedAt: Date.now(), data: out })], { type: 'application/json' }))
    a.download = `gainlab-backup-${today()}.json`
    a.click()
    setBusy(false)
  }
  async function importAll(f: File) {
    if (!confirm('Import will merge this backup into your data (newer records win). Continue?')) return
    const j = JSON.parse(await f.text())
    for (const t of SYNC_TABLES) {
      for (const r of j.data?.[t] ?? []) {
        if (t === 'photos' && typeof r.blob === 'string') r.blob = await (await fetch(`data:image/jpeg;base64,${r.blob}`)).blob()
        const cur = await (db[t] as any).get(r.id)
        if (!cur || cur.updatedAt < r.updatedAt) await (db[t] as any).put({ ...r, updatedAt: Date.now() })
      }
    }
    alert('Imported.')
  }
  return (
    <Card title="Your data">
      <div className="flex flex-wrap gap-2">
        <Button variant="soft" disabled={busy} onClick={exportAll}>{busy ? 'Exporting…' : 'Export backup'}</Button>
        <label className="cursor-pointer rounded-xl bg-slate-800 px-4 py-2.5 font-semibold">Import backup<input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importAll(e.target.files[0])} /></label>
        <Button variant="danger" onClick={async () => { if (confirm('Delete ALL data on this device? This cannot be undone (cloud copy, if any, stays).') && confirm('Really delete everything?')) { await db.delete(); localStorage.clear(); location.reload() } }}>Reset app</Button>
      </div>
    </Card>
  )
}
