import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import Photos from '../components/Photos'
import { AdviceList, Button, Card, Empty, Field, NumInput, Segmented } from '../components/ui'
import { db, remove, save } from '../db'
import { useEnergy, usePlan, useProfile } from '../hooks'
import { aiEnabled, aiWeeklyCoach } from '../lib/gemini'
import { summaryForAi, verdict, weeklyStats } from '../lib/insights'
import { KCAL_PER_KG, weightTrend } from '../lib/nutrition'
import { addDays, fmtDate, today, uid } from '../lib/util'
import type { Measurement, Profile } from '../types'

type Tab = 'insights' | 'weight' | 'photos' | 'body'

export default function Progress() {
  const [tab, setTab] = useState<Tab>('insights')
  const profile = useProfile()
  const energy = useEnergy(profile)
  if (!profile || !energy) return null
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Progress</h1>
      <Segmented value={tab} onChange={setTab} options={[{ value: 'insights', label: 'Insights' }, { value: 'weight', label: 'Weight' }, { value: 'photos', label: 'Photos' }, { value: 'body', label: 'Measure' }]} />
      {tab === 'insights' && <Insights profile={profile} energy={energy} />}
      {tab === 'weight' && <Weight energy={energy} />}
      {tab === 'photos' && <Photos currentKg={energy.forecast.current} />}
      {tab === 'body' && <Body />}
    </div>
  )
}

type Energy = NonNullable<ReturnType<typeof useEnergy>>

function Insights({ profile, energy }: { profile: Profile; energy: Energy }) {
  const plan = usePlan()
  const photos = useLiveQuery(() => db.photos.toArray(), [], [])
  const [ai, setAi] = useState('')
  const [busy, setBusy] = useState(false)
  const ws = weeklyStats(energy.logs, energy.checkins, energy.sessions, energy.targetFor)
  const v = verdict(profile, energy.em, energy.forecast, plan, ws, photos)
  const fc = energy.forecast
  const tone = { 'on-track': 'border-emerald-500/50 bg-emerald-500/10', slow: 'border-rose-500/50 bg-rose-500/10', fast: 'border-amber-500/50 bg-amber-500/10', early: 'border-sky-500/50 bg-sky-500/10' }[v.status]
  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-4 ${tone}`}>
        <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Am I on track?</div>
        <div className="mt-1 text-lg font-bold">{v.headline}</div>
      </div>
      <Card title="Next 30 days forecast">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-slate-800 p-2"><div className="text-xl font-bold">{fc.current}</div><div className="text-xs text-slate-400">now (trend)</div></div>
          <div className="rounded-xl bg-slate-800 p-2"><div className="text-xl font-bold text-emerald-400">{fc.in30Plan}</div><div className="text-xs text-slate-400">if you hit target</div></div>
          <div className="rounded-xl bg-slate-800 p-2"><div className="text-xl font-bold">{fc.in30Trend ?? fc.in30Actual ?? '–'}</div><div className="text-xs text-slate-400">at current pace</div></div>
        </div>
        <p className="mt-3 text-sm text-slate-400">
          {fc.weeksToGoal ? `Goal of ${profile.targetWeightKg} kg in ≈ ${fc.weeksToGoal} weeks (${fmtDate(addDays(today(), fc.weeksToGoal * 7), { month: 'short', year: 'numeric' })}).` : 'You have reached your target weight — set a new one in Settings.'}
          {' '}Each 1 kg of new tissue needs ≈ {KCAL_PER_KG} extra kcal.
        </p>
      </Card>
      <Card title="This week"><AdviceList items={v.insights} /></Card>
      {aiEnabled() && (
        <Card title="AI weekly coach">
          {ai && <div className="mb-3 text-sm whitespace-pre-wrap text-slate-200">{ai}</div>}
          <Button variant="soft" disabled={busy} onClick={async () => { setBusy(true); try { setAi(await aiWeeklyCoach(profile, summaryForAi(ws, energy.em, fc))) } catch (e: any) { setAi(e.message) } finally { setBusy(false) } }}>
            {busy ? 'Thinking…' : '✨ Get my weekly review'}
          </Button>
          <p className="mt-2 text-xs text-slate-500">Sends only the numbers above (no photos) to Gemini.</p>
        </Card>
      )}
    </div>
  )
}

function Weight({ energy }: { energy: Energy }) {
  const [kg, setKg] = useState(NaN)
  const [date, setDate] = useState(today())
  const tr = weightTrend(energy.weights)
  const em = energy.em
  const last = tr[tr.length - 1]
  // Goal line from the first entry at the target rate
  const data = tr.map((w, i) => ({
    date: fmtDate(w.date), kg: w.kg, trend: w.trend,
    goal: tr.length ? Math.round((tr[0].trend + (em.targetRateKg / 7) * ((Date.parse(w.date) - Date.parse(tr[0].date)) / 86400000)) * 100) / 100 : undefined,
    i,
  }))
  return (
    <div className="space-y-4">
      <Card title="Log weight">
        <div className="flex gap-2">
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className="rounded-xl border border-slate-700 bg-slate-950 px-2" />
          <NumInput className="flex-1" value={kg} onChange={setKg} step={0.1} suffix="kg" />
          <Button disabled={Number.isNaN(kg) || kg < 30} onClick={async () => { await save('weights', { id: date, date, kg, updatedAt: 0 }); setKg(NaN) }}>Save</Button>
        </div>
      </Card>
      <Card title="Weight trend">
        {tr.length < 2 ? <Empty>Log your weight a few mornings to see the trend.</Empty> : (
          <>
            <div className="mb-2 grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-slate-800 p-2"><div className="font-bold">{last.trend} kg</div><div className="text-xs text-slate-400">trend</div></div>
              <div className="rounded-xl bg-slate-800 p-2"><div className="font-bold">{em.weeklyRateKg === null ? '–' : `${em.weeklyRateKg > 0 ? '+' : ''}${em.weeklyRateKg.toFixed(2)}`}</div><div className="text-xs text-slate-400">kg / week</div></div>
              <div className="rounded-xl bg-slate-800 p-2"><div className="font-bold">+{em.targetRateKg.toFixed(2)}</div><div className="text-xs text-slate-400">goal / week</div></div>
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <ComposedChart data={data}>
                  <CartesianGrid stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                  <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Scatter dataKey="kg" fill="#64748b" name="Daily" />
                  <Line dataKey="trend" stroke="#22c55e" strokeWidth={2.5} dot={false} name="Trend" />
                  <Line dataKey="goal" stroke="#38bdf8" strokeDasharray="5 5" dot={false} name="Goal pace" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Card>
      <Card title="History">
        <ul className="max-h-72 divide-y divide-slate-800 overflow-y-auto">
          {[...energy.weights].sort((a, b) => b.date.localeCompare(a.date)).map((w) => (
            <li key={w.id} className="flex justify-between py-2 text-sm"><span>{fmtDate(w.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span><span className="flex gap-3"><b>{w.kg} kg</b><button className="text-slate-500" onClick={() => remove('weights', w.id)}>×</button></span></li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

const MFIELDS: { k: keyof Omit<Measurement, 'id' | 'date' | 'updatedAt'>; label: string; hint: string }[] = [
  { k: 'chest', label: 'Chest', hint: 'At nipple line, relaxed' },
  { k: 'arm', label: 'Arm (flexed)', hint: 'Biggest point of the bicep' },
  { k: 'waist', label: 'Waist', hint: 'At belly button, relaxed, after exhaling' },
  { k: 'hips', label: 'Hips', hint: 'Widest point of the glutes' },
  { k: 'thigh', label: 'Thigh', hint: 'Mid-thigh' },
  { k: 'neck', label: 'Neck', hint: 'Below the Adam\'s apple' },
]

function Body() {
  const list = useLiveQuery(() => db.measurements.orderBy('date').toArray(), [], [])
  const [m, setM] = useState<Partial<Measurement>>({})
  const first = list[0], last = list[list.length - 1]
  return (
    <div className="space-y-4">
      <Card title="Measurements (cm) — every 2 weeks">
        <div className="grid grid-cols-2 gap-3">
          {MFIELDS.map((f) => (
            <Field key={f.k} label={f.label} hint={f.hint}><NumInput value={m[f.k] as number} step={0.5} onChange={(v) => setM({ ...m, [f.k]: Number.isNaN(v) ? undefined : v })} suffix="cm" /></Field>
          ))}
        </div>
        <Button className="mt-3 w-full" disabled={!Object.values(m).some((x) => typeof x === 'number')} onClick={async () => { await save('measurements', { id: uid(), updatedAt: 0, date: today(), ...m }); setM({}) }}>Save</Button>
      </Card>
      {list.length > 0 && (
        <Card title="Change since first entry">
          <div className="grid grid-cols-3 gap-2 text-center">
            {MFIELDS.map((f) => {
              const a = first[f.k] as number | undefined, b = last[f.k] as number | undefined
              return (
                <div key={f.k} className="rounded-xl bg-slate-800 p-2">
                  <div className="font-bold">{b ?? '–'}</div>
                  <div className="text-xs text-slate-400">{f.label}</div>
                  {a !== undefined && b !== undefined && list.length > 1 && <div className={`text-xs ${b - a >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{b - a >= 0 ? '+' : ''}{(b - a).toFixed(1)}</div>}
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">Ideal bulk: arms & chest grow, waist grows slowly (≤ ~1 cm per 2 kg gained).</p>
        </Card>
      )}
    </div>
  )
}
