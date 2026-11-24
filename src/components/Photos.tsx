import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db, remove, save } from '../db'
import { aiEnabled, aiPhotoReview } from '../lib/gemini'
import { analyzePose, normalizeImage } from '../lib/pose'
import { getSettings } from '../lib/settings'
import { deleteRemotePhoto, photoBlob } from '../lib/sync'
import { daysBetween, fmtDate, today, uid } from '../lib/util'
import type { Photo } from '../types'
import { Button, Card, Empty, Segmented, Sheet } from './ui'

type Pose = Photo['pose']

function usePhotoUrl(p?: Photo) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let u = ''
    let alive = true
    if (p) photoBlob(p).then((b) => { if (b && alive) { u = URL.createObjectURL(b); setUrl(u) } })
    return () => { alive = false; if (u) URL.revokeObjectURL(u) }
  }, [p?.id, p?.blob])
  return url
}

export default function Photos({ currentKg }: { currentKg: number }) {
  const [pose, setPose] = useState<Pose>('front')
  const photos = useLiveQuery(() => db.photos.where('pose').equals(pose).sortBy('date'), [pose], [])
  const [capture, setCapture] = useState(false)
  const [aId, setAId] = useState<string>()
  const [bId, setBId] = useState<string>()
  const a = photos.find((p) => p.id === aId) ?? photos[photos.length - 2]
  const b = photos.find((p) => p.id === bId) ?? photos[photos.length - 1]
  const latest = photos[photos.length - 1]
  const takenToday = latest?.date === today()

  const metricData = photos.filter((p) => p.metrics && p.metrics.confidence > 0.5).map((p) => ({
    date: fmtDate(p.date), 'Shoulder : waist': p.metrics!.shoulderToWaist, 'Shoulder width': p.metrics!.shoulderWidth, 'Waist width': p.metrics!.waistWidth,
  }))

  return (
    <div className="space-y-4">
      <Segmented value={pose} onChange={setPose} options={[{ value: 'front', label: 'Front' }, { value: 'side', label: 'Side' }, { value: 'back', label: 'Back' }]} />
      <Button size="lg" className="w-full" onClick={() => setCapture(true)}>{takenToday ? 'Retake today\'s photo' : `📸 Take today's ${pose} photo`}</Button>
      <p className="text-xs text-slate-500">Same spot, same light, same time of day (morning, before eating), arms slightly away from your body. The camera shows a ghost of your last photo so you can line up.</p>

      {photos.length >= 2 && a && b ? (
        <Card title="Compare">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <select className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm" value={a.id} onChange={(e) => setAId(e.target.value)}>
              {photos.map((p) => <option key={p.id} value={p.id}>{fmtDate(p.date)}{p.weightKg ? ` · ${p.weightKg} kg` : ''}</option>)}
            </select>
            <select className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm" value={b.id} onChange={(e) => setBId(e.target.value)}>
              {photos.map((p) => <option key={p.id} value={p.id}>{fmtDate(p.date)}{p.weightKg ? ` · ${p.weightKg} kg` : ''}</option>)}
            </select>
          </div>
          <CompareSlider a={a} b={b} />
          <CompareStats a={a} b={b} />
          <AiReview a={a} b={b} />
        </Card>
      ) : photos.length === 1 ? (
        <Card title="Your first photo"><SinglePhoto p={photos[0]} /><p className="mt-2 text-sm text-slate-400">Take another tomorrow to start comparing.</p></Card>
      ) : <Empty>No {pose} photos yet.</Empty>}

      {pose === 'front' && metricData.length >= 2 && (
        <Card title="Body-shape trend (from photos)">
          <p className="mb-2 text-xs text-slate-500">Widths measured from your silhouette, divided by torso length so camera distance doesn't matter. Want: shoulders ↑, shoulder:waist ↑, waist roughly flat.</p>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={metricData}>
                <CartesianGrid stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line dataKey="Shoulder : waist" stroke="#22c55e" dot={false} strokeWidth={2} />
                <Line dataKey="Shoulder width" stroke="#38bdf8" dot={false} />
                <Line dataKey="Waist width" stroke="#f59e0b" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {photos.length > 0 && (
        <Card title="All photos">
          <div className="grid grid-cols-3 gap-2">
            {[...photos].reverse().map((p) => <Thumb key={p.id} p={p} />)}
          </div>
        </Card>
      )}

      <Sheet open={capture} onClose={() => setCapture(false)} title={`${pose[0].toUpperCase() + pose.slice(1)} photo`}>
        {capture && <Capture pose={pose} ghost={latest} currentKg={currentKg} onDone={() => setCapture(false)} />}
      </Sheet>
    </div>
  )
}

function SinglePhoto({ p }: { p: Photo }) {
  const url = usePhotoUrl(p)
  return url ? <img src={url} className="max-h-96 w-full rounded-xl object-contain" /> : <div className="h-64 animate-pulse rounded-xl bg-slate-800" />
}

function Thumb({ p }: { p: Photo }) {
  const url = usePhotoUrl(p)
  return (
    <div className="relative">
      {url ? <img src={url} className="aspect-[3/4] w-full rounded-lg object-cover" /> : <div className="aspect-[3/4] rounded-lg bg-slate-800" />}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between rounded-b-lg bg-black/60 px-1.5 py-0.5 text-[10px]">
        <span>{fmtDate(p.date)}</span>
        <button onClick={async () => { if (confirm('Delete this photo?')) { await deleteRemotePhoto(p); await remove('photos', p.id) } }}>🗑</button>
      </div>
    </div>
  )
}

function CompareSlider({ a, b }: { a: Photo; b: Photo }) {
  const ua = usePhotoUrl(a), ub = usePhotoUrl(b)
  const [pos, setPos] = useState(50)
  const [mode, setMode] = useState<'slider' | 'side'>('slider')
  return (
    <div className="space-y-2">
      <Segmented value={mode} onChange={setMode} options={[{ value: 'slider', label: 'Slider' }, { value: 'side', label: 'Side by side' }]} />
      {mode === 'side' ? (
        <div className="grid grid-cols-2 gap-2">
          {[[ua, a], [ub, b]].map(([u, p]) => (
            <div key={(p as Photo).id}>{u ? <img src={u as string} className="aspect-[3/4] w-full rounded-lg object-cover" /> : <div className="aspect-[3/4] rounded-lg bg-slate-800" />}<div className="mt-1 text-center text-xs text-slate-400">{fmtDate((p as Photo).date)}</div></div>
          ))}
        </div>
      ) : (
        <>
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-800 select-none">
            {ub && <img src={ub} className="absolute inset-0 h-full w-full object-cover" />}
            {ua && <img src={ua} className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />}
            <div className="absolute inset-y-0 w-0.5 bg-white/80" style={{ left: `${pos}%` }} />
            <span className="absolute top-2 left-2 rounded bg-black/60 px-1.5 text-xs">{fmtDate(a.date)}</span>
            <span className="absolute top-2 right-2 rounded bg-black/60 px-1.5 text-xs">{fmtDate(b.date)}</span>
          </div>
          <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} className="w-full accent-emerald-500" />
        </>
      )}
    </div>
  )
}

function CompareStats({ a, b }: { a: Photo; b: Photo }) {
  const days = Math.abs(daysBetween(a.date, b.date))
  const dw = a.weightKg && b.weightKg ? b.weightKg - a.weightKg : null
  const ma = a.metrics, mb = b.metrics
  const pct = (x: number, y: number) => `${((y / x - 1) * 100).toFixed(1)}%`
  let verdict = ''
  if (ma && mb && ma.confidence > 0.5 && mb.confidence > 0.5) {
    const sh = mb.shoulderWidth / ma.shoulderWidth - 1
    const wa = mb.waistWidth / ma.waistWidth - 1
    if (days < 7) verdict = 'Less than a week apart — day-to-day differences are mostly lighting, pump and water. Look at 2–4 week gaps for real change.'
    else if (sh > 0.01 && wa <= sh) verdict = '✅ Upper body growing at least as fast as your waist — good, lean-looking gain.'
    else if (wa > 0.03 && wa > sh + 0.02) verdict = '⚠️ Waist is growing faster than shoulders. Consider a smaller surplus (switch to Lean pace) and make sure you hit protein and train hard.'
    else verdict = 'Shape roughly stable. Normal for early weeks — keep going and compare monthly.'
  }
  return (
    <div className="mt-3 space-y-2 text-sm">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-slate-800 p-2"><div className="font-bold">{days} d</div><div className="text-xs text-slate-400">apart</div></div>
        <div className="rounded-xl bg-slate-800 p-2"><div className="font-bold">{dw === null ? '–' : `${dw > 0 ? '+' : ''}${dw.toFixed(1)} kg`}</div><div className="text-xs text-slate-400">weight</div></div>
        <div className="rounded-xl bg-slate-800 p-2"><div className="font-bold">{ma && mb ? pct(ma.shoulderToWaist, mb.shoulderToWaist) : '–'}</div><div className="text-xs text-slate-400">V-taper</div></div>
      </div>
      {ma && mb && <div className="text-xs text-slate-400">Shoulders {pct(ma.shoulderWidth, mb.shoulderWidth)} · Waist {pct(ma.waistWidth, mb.waistWidth)} · Hips {pct(ma.hipWidth, mb.hipWidth)}</div>}
      {verdict && <p className="rounded-xl bg-slate-800/60 p-2 text-slate-200">{verdict}</p>}
    </div>
  )
}

function AiReview({ a, b }: { a: Photo; b: Photo }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  if (!aiEnabled()) return null
  if (!getSettings().aiPhotoReview) return <p className="mt-3 text-xs text-slate-500">AI photo review is off. Enable it in Settings if you're OK sending these photos to Google Gemini.</p>
  async function run() {
    setBusy(true); setErr('')
    try {
      const [ba, bb] = await Promise.all([photoBlob(a), photoBlob(b)])
      const ctx = `Earlier ${a.date}${a.weightKg ? ` at ${a.weightKg} kg` : ''}, latest ${b.date}${b.weightKg ? ` at ${b.weightKg} kg` : ''}. Pose: ${b.pose}.`
      const text = await aiPhotoReview(bb!, ba, ctx)
      await save('photos', { ...b, aiReview: text })
    } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="mt-3 space-y-2">
      {b.aiReview && <div className="rounded-xl border border-violet-500/40 bg-violet-500/5 p-3 text-sm whitespace-pre-wrap text-slate-200">{b.aiReview}</div>}
      <Button size="sm" variant="soft" disabled={busy} onClick={run}>{busy ? 'Reviewing…' : '✨ AI review of these two'}</Button>
      {err && <p className="text-sm text-rose-400">{err}</p>}
    </div>
  )
}

function Capture({ pose, ghost, currentKg, onDone }: { pose: Pose; ghost?: Photo; currentKg: number; onDone: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [countdown, setCountdown] = useState(0)
  const [shot, setShot] = useState<Blob | null>(null)
  const [busy, setBusy] = useState('')
  const [camErr, setCamErr] = useState('')
  const ghostUrl = usePhotoUrl(ghost)
  const shotUrl = useMemo(() => (shot ? URL.createObjectURL(shot) : ''), [shot])

  useEffect(() => {
    let s: MediaStream | null = null
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: facing, width: { ideal: 1080 }, height: { ideal: 1440 } }, audio: false })
      .then((st) => { s = st; setStream(st); if (video.current) { video.current.srcObject = st; video.current.play() } })
      .catch(() => setCamErr('Camera not available — upload a photo instead.'))
    return () => s?.getTracks().forEach((t) => t.stop())
  }, [facing])

  function snap() {
    const v = video.current!
    const c = document.createElement('canvas')
    c.width = v.videoWidth; c.height = v.videoHeight
    const ctx = c.getContext('2d')!
    if (facing === 'user') { ctx.translate(c.width, 0); ctx.scale(-1, 1) }
    ctx.drawImage(v, 0, 0)
    c.toBlob(async (b) => b && setShot(await normalizeImage(b)), 'image/jpeg', 0.9)
  }
  function timer() {
    let n = 10
    setCountdown(n)
    const t = setInterval(() => { n--; setCountdown(n); if (n <= 0) { clearInterval(t); snap() } }, 1000)
  }

  async function keep() {
    if (!shot) return
    setBusy('Analysing body shape…')
    let metrics
    try { if (pose === 'front') metrics = (await analyzePose(shot)) ?? undefined } catch { /* model offline — still save */ }
    const existing = await db.photos.where('date').equals(today()).filter((p) => p.pose === pose).first()
    if (existing) { await deleteRemotePhoto(existing); await remove('photos', existing.id) }
    await save('photos', { id: uid(), updatedAt: 0, date: today(), pose, blob: shot, weightKg: currentKg, metrics })
    stream?.getTracks().forEach((t) => t.stop())
    onDone()
  }

  return (
    <div className="space-y-3">
      {shot ? (
        <img src={shotUrl} className="max-h-[60dvh] w-full rounded-xl object-contain" />
      ) : (
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-black">
          <video ref={video} playsInline muted className={`h-full w-full object-cover ${facing === 'user' ? '-scale-x-100' : ''}`} />
          {ghostUrl && <img src={ghostUrl} className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30" />}
          {countdown > 0 && <div className="absolute inset-0 flex items-center justify-center text-7xl font-extrabold text-white drop-shadow">{countdown}</div>}
          {camErr && <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-slate-300">{camErr}</div>}
        </div>
      )}
      {busy && <p className="text-sm text-slate-400">{busy}</p>}
      {shot ? (
        <div className="flex gap-2"><Button variant="soft" onClick={() => setShot(null)}>Retake</Button><Button className="flex-1" disabled={!!busy} onClick={keep}>Save photo</Button></div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button disabled={!stream} onClick={snap}>Snap</Button>
          <Button variant="soft" disabled={!stream} onClick={timer}>10 s timer</Button>
          <Button variant="ghost" onClick={() => setFacing(facing === 'user' ? 'environment' : 'user')}>Flip</Button>
          <label className="cursor-pointer rounded-xl px-4 py-2.5 font-semibold text-slate-300 hover:bg-slate-800">
            Upload
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setShot(await normalizeImage(f)) }} />
          </label>
        </div>
      )}
    </div>
  )
}
