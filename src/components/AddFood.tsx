import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useRef, useState } from 'react'
import { db, save } from '../db'
import { allowed, BUILTIN_FOODS } from '../lib/foods'
import { offBarcode, offSearch, per100ToFood, usdaSearch, type Per100 } from '../lib/foodApi'
import { aiEnabled, aiFoodFromPhoto, aiFoodFromText, type AiFood } from '../lib/gemini'
import { normalizeImage } from '../lib/pose'
import { uid } from '../lib/util'
import type { FoodItem, FoodLog, MealSlot, Profile } from '../types'
import { Button, Field, inputCls, NumInput, Segmented, Stepper } from './ui'

type Tab = 'search' | 'online' | 'scan' | 'ai' | 'quick'

export function defaultMeal(): MealSlot {
  const h = new Date().getHours()
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 19 ? 'snack' : 'dinner'
}

export function logFromFood(f: FoodItem, servings: number, date: string, meal: MealSlot): FoodLog {
  const m = (x: number | undefined) => Math.round((x ?? 0) * servings * 10) / 10
  return {
    id: uid(), updatedAt: 0, date, meal, name: f.name, servings, serving: f.serving,
    kcal: Math.round(f.kcal * servings), protein: m(f.protein), carbs: m(f.carbs), fat: m(f.fat), fiber: m(f.fiber), sugar: m(f.sugar),
    tags: f.tags, source: f.source, time: Date.now(),
  }
}

export default function AddFood({ profile, date, onDone }: { profile: Profile; date: string; onDone: () => void }) {
  const [tab, setTab] = useState<Tab>('search')
  const [meal, setMeal] = useState<MealSlot>(defaultMeal())
  const [picked, setPicked] = useState<FoodItem | null>(null)

  async function add(f: FoodItem, servings: number) {
    await save('foodLogs', logFromFood(f, servings, date, meal))
    // Remember foods from online/AI so they show up in search next time
    if (f.source !== 'builtin' && f.source !== 'custom') {
      const exists = await db.foods.where('name').equals(f.name).first()
      if (!exists) await save('foods', { ...f, id: uid(), source: 'custom' })
    }
    setPicked(null)
    onDone()
  }

  return (
    <div className="space-y-4">
      <Segmented value={meal} onChange={setMeal} options={[{ value: 'breakfast', label: 'Breakfast' }, { value: 'lunch', label: 'Lunch' }, { value: 'dinner', label: 'Dinner' }, { value: 'snack', label: 'Snack' }]} />
      {picked ? (
        <ServingPicker food={picked} onCancel={() => setPicked(null)} onAdd={add} />
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto">
            {([['search', 'Search'], ['ai', '✨ AI'], ['scan', 'Barcode'], ['online', 'Online DB'], ['quick', 'Quick add']] as [Tab, string][]).map(([t, l]) => (
              <button key={t} onClick={() => setTab(t)} className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${tab === t ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>{l}</button>
            ))}
          </div>
          {tab === 'search' && <LocalSearch profile={profile} onPick={setPicked} />}
          {tab === 'online' && <OnlineSearch onPick={setPicked} />}
          {tab === 'scan' && <BarcodeScan onPick={setPicked} />}
          {tab === 'ai' && <AiLog onAddMany={async (items) => { for (const f of items) await save('foodLogs', logFromFood(f, 1, date, meal)); onDone() }} />}
          {tab === 'quick' && <QuickAdd onPick={(f, saveIt) => { if (saveIt) save('foods', f); add(f, 1) }} />}
        </>
      )}
    </div>
  )
}

function FoodRow({ f, onPick }: { f: FoodItem; onPick: (f: FoodItem) => void }) {
  return (
    <button onClick={() => onPick(f)} className="flex w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-left hover:bg-slate-800">
      <div className="min-w-0">
        <div className="truncate font-medium">{f.name}</div>
        <div className="text-xs text-slate-500">{f.serving}</div>
      </div>
      <div className="shrink-0 text-right text-sm"><div className="font-semibold">{f.kcal} kcal</div><div className="text-xs text-slate-400">{Math.round(f.protein)} g protein</div></div>
    </button>
  )
}

function LocalSearch({ profile, onPick }: { profile: Profile; onPick: (f: FoodItem) => void }) {
  const [q, setQ] = useState('')
  const custom = useLiveQuery(() => db.foods.toArray(), [], [])
  const recentLogs = useLiveQuery(() => db.foodLogs.orderBy('updatedAt').reverse().limit(60).toArray(), [], [])
  const all = useMemo(() => [...custom, ...BUILTIN_FOODS.filter((f) => allowed(f, profile))], [custom, profile])
  const recent = useMemo(() => {
    const names = [...new Set(recentLogs.map((l) => l.name))].slice(0, 8)
    return names.map((n) => all.find((f) => f.name === n)).filter(Boolean) as FoodItem[]
  }, [recentLogs, all])
  const results = q.trim() ? all.filter((f) => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 30) : []
  return (
    <div className="space-y-2">
      <input autoFocus className={inputCls} placeholder="Search e.g. roti, paneer, eggs…" value={q} onChange={(e) => setQ(e.target.value)} />
      {!q && recent.length > 0 && <div className="text-xs font-semibold text-slate-500 uppercase">Recent</div>}
      <div className="max-h-[45dvh] overflow-y-auto">
        {(q ? results : recent.length ? recent : all.slice(0, 20)).map((f) => <FoodRow key={f.id} f={f} onPick={onPick} />)}
        {q && results.length === 0 && <p className="p-3 text-sm text-slate-400">Not found — try “Online DB”, “AI” or “Quick add”.</p>}
      </div>
    </div>
  )
}

function Per100Picker({ items, onPick }: { items: Per100[]; onPick: (f: FoodItem) => void }) {
  return (
    <div className="max-h-[45dvh] overflow-y-auto">
      {items.map((p, i) => (
        <button key={i} onClick={() => onPick(per100ToFood(p, p.servingGrams ?? 100))} className="flex w-full justify-between gap-2 rounded-xl px-2 py-2 text-left hover:bg-slate-800">
          <div className="min-w-0"><div className="truncate font-medium">{p.name}</div><div className="truncate text-xs text-slate-500">{p.brand ?? (p.source === 'usda' ? 'USDA' : 'Open Food Facts')} · per 100 g</div></div>
          <div className="shrink-0 text-right text-sm"><div className="font-semibold">{Math.round(p.kcal)} kcal</div><div className="text-xs text-slate-400">{Math.round(p.protein)} g P</div></div>
        </button>
      ))}
    </div>
  )
}

function OnlineSearch({ onPick }: { onPick: (f: FoodItem) => void }) {
  const [q, setQ] = useState('')
  const [src, setSrc] = useState<'usda' | 'off'>('usda')
  const [items, setItems] = useState<Per100[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function go() {
    if (!q.trim()) return
    setBusy(true); setErr('')
    try { setItems(src === 'usda' ? await usdaSearch(q) : await offSearch(q)) } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  return (
    <div className="space-y-2">
      <Segmented value={src} onChange={setSrc} options={[{ value: 'usda', label: 'USDA (generic foods)' }, { value: 'off', label: 'Packaged products' }]} />
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); go() }}>
        <input className={inputCls} placeholder="e.g. chicken breast, oats" value={q} onChange={(e) => setQ(e.target.value)} />
        <Button disabled={busy}>{busy ? '…' : 'Go'}</Button>
      </form>
      {err && <p className="text-sm text-rose-400">{err}</p>}
      <Per100Picker items={items} onPick={onPick} />
    </div>
  )
}

function BarcodeScan({ onPick }: { onPick: (f: FoodItem) => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [code, setCode] = useState('')
  const [msg, setMsg] = useState('Point the camera at a barcode')
  const [found, setFound] = useState<Per100 | null>(null)
  useEffect(() => {
    let controls: { stop: () => void } | undefined
    let cancelled = false
    ;(async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const reader = new BrowserMultiFormatReader()
        controls = await reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, video.current!, (res) => {
          if (res && !cancelled) { controls?.stop(); lookup(res.getText()) }
        })
      } catch { setMsg('Camera unavailable — type the barcode number below.') }
    })()
    return () => { cancelled = true; controls?.stop() }
  }, [])
  async function lookup(c: string) {
    setCode(c); setMsg(`Looking up ${c}…`)
    const p = await offBarcode(c).catch(() => null)
    if (p) { setFound(p); setMsg('Found!') } else setMsg('Not in Open Food Facts. Try Quick add with the label values.')
  }
  return (
    <div className="space-y-2">
      {!found && <video ref={video} className="aspect-video w-full rounded-xl bg-black object-cover" muted playsInline />}
      <p className="text-sm text-slate-400">{msg}</p>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); lookup(code) }}>
        <input className={inputCls} inputMode="numeric" placeholder="Barcode number" value={code} onChange={(e) => setCode(e.target.value)} />
        <Button>Look up</Button>
      </form>
      {found && <Per100Picker items={[found]} onPick={onPick} />}
    </div>
  )
}

function AiLog({ onAddMany }: { onAddMany: (f: FoodItem[]) => void }) {
  const [text, setText] = useState('')
  const [img, setImg] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [res, setRes] = useState<{ items: AiFood[]; notes: string } | null>(null)
  const preview = useMemo(() => (img ? URL.createObjectURL(img) : ''), [img])
  if (!aiEnabled()) return <p className="rounded-xl bg-slate-800 p-3 text-sm text-slate-300">Add your free Gemini API key in <b>More → Settings</b> to log meals from a photo or a sentence like “2 rotis, dal and 150 g chicken curry”.</p>
  async function run() {
    setBusy(true); setErr('')
    try { setRes(img ? await aiFoodFromPhoto(img, text) : await aiFoodFromText(text)) } catch (e: any) { setErr(e.message) } finally { setBusy(false) }
  }
  const toFood = (a: AiFood): FoodItem => ({ id: uid(), updatedAt: 0, name: a.name, serving: a.serving, grams: a.grams, kcal: Math.round(a.kcal), protein: a.protein, carbs: a.carbs, fat: a.fat, fiber: a.fiber ?? 0, sugar: a.sugar ?? 0, diet: 'nonveg', allergens: [], tags: a.tags ?? [], source: 'ai' })
  return (
    <div className="space-y-3">
      <textarea className={inputCls} rows={2} placeholder="Describe your meal, or add a photo (optional note helps: 'cooked in 2 tbsp oil')" value={text} onChange={(e) => setText(e.target.value)} />
      <div className="flex gap-2">
        <label className="flex-1 cursor-pointer rounded-xl bg-slate-800 px-4 py-2.5 text-center font-semibold">
          📷 {img ? 'Change photo' : 'Photo'}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImg(await normalizeImage(f, 1024)) }} />
        </label>
        <Button className="flex-1" disabled={busy || (!text.trim() && !img)} onClick={run}>{busy ? 'Analysing…' : 'Estimate'}</Button>
      </div>
      {preview && <img src={preview} className="max-h-48 w-full rounded-xl object-cover" />}
      {err && <p className="text-sm text-rose-400">{err}</p>}
      {res && (
        <div className="space-y-2">
          {res.items.map((a, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-800/60 p-2">
              <div className="min-w-0 flex-1"><div className="font-medium">{a.name}</div><div className="text-xs text-slate-400">{a.serving}</div></div>
              <NumInput className="w-24" value={a.kcal} onChange={(kcal) => setRes({ ...res, items: res.items.map((x, j) => (j === i ? { ...x, kcal } : x)) })} suffix="kcal" />
              <button className="px-2 text-slate-400" onClick={() => setRes({ ...res, items: res.items.filter((_, j) => j !== i) })}>×</button>
            </div>
          ))}
          {res.notes && <p className="text-xs text-slate-400">{res.notes}</p>}
          <p className="text-xs text-slate-500">AI estimates can be off by 20–30%. Edit calories if you know better.</p>
          <Button className="w-full" onClick={() => onAddMany(res.items.map(toFood))}>Add {res.items.length} items</Button>
        </div>
      )}
    </div>
  )
}

function QuickAdd({ onPick }: { onPick: (f: FoodItem, saveAsCustom: boolean) => void }) {
  const [f, setF] = useState({ name: '', serving: '1 serving', kcal: NaN, protein: NaN, carbs: NaN, fat: NaN })
  const [keep, setKeep] = useState(true)
  const n = (x: number) => (Number.isNaN(x) ? 0 : x)
  return (
    <div className="space-y-3">
      <Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Mom's chicken pulao" /></Field>
      <Field label="Serving"><input className={inputCls} value={f.serving} onChange={(e) => setF({ ...f, serving: e.target.value })} /></Field>
      <div className="grid grid-cols-2 gap-2">
        <NumInput value={f.kcal} onChange={(kcal) => setF({ ...f, kcal })} suffix="kcal" />
        <NumInput value={f.protein} onChange={(protein) => setF({ ...f, protein })} suffix="g P" />
        <NumInput value={f.carbs} onChange={(carbs) => setF({ ...f, carbs })} suffix="g C" />
        <NumInput value={f.fat} onChange={(fat) => setF({ ...f, fat })} suffix="g F" />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} /> Save to my foods</label>
      <Button className="w-full" disabled={!f.name || Number.isNaN(f.kcal)} onClick={() => onPick({ id: uid(), updatedAt: 0, name: f.name, serving: f.serving, kcal: n(f.kcal), protein: n(f.protein), carbs: n(f.carbs), fat: n(f.fat), fiber: 0, diet: 'vegan', allergens: [], tags: [], source: 'custom' }, keep)}>Add</Button>
    </div>
  )
}

function ServingPicker({ food, onAdd, onCancel }: { food: FoodItem; onAdd: (f: FoodItem, servings: number) => void; onCancel: () => void }) {
  const [servings, setServings] = useState(1)
  const [grams, setGrams] = useState(food.grams ?? 100)
  const gramMode = food.source === 'usda' || food.source === 'off'
  const base = gramMode ? { ...food, ...scale(food, grams / (food.grams ?? 100)), serving: `${grams} g`, grams } : food
  const k = gramMode ? 1 : servings
  return (
    <div className="space-y-4">
      <div><div className="text-lg font-bold">{food.name}</div><div className="text-sm text-slate-400">{food.serving}</div></div>
      {gramMode ? (
        <Field label="Amount"><NumInput value={grams} onChange={setGrams} step={10} suffix="g" /></Field>
      ) : (
        <Field label="Servings"><Stepper value={servings} step={0.5} min={0.25} onChange={setServings} /></Field>
      )}
      <div className="grid grid-cols-4 gap-2 text-center text-sm">
        {[['kcal', base.kcal], ['protein', base.protein], ['carbs', base.carbs], ['fat', base.fat]].map(([l, v]) => (
          <div key={l as string} className="rounded-xl bg-slate-800 p-2"><div className="font-bold">{Math.round((v as number) * k)}</div><div className="text-xs text-slate-400">{l}</div></div>
        ))}
      </div>
      <div className="flex gap-2"><Button variant="soft" onClick={onCancel}>Back</Button><Button className="flex-1" onClick={() => onAdd(base, k)}>Add</Button></div>
    </div>
  )
}

function scale(f: FoodItem, r: number) {
  const m = (x?: number) => Math.round((x ?? 0) * r * 10) / 10
  return { kcal: Math.round(f.kcal * r), protein: m(f.protein), carbs: m(f.carbs), fat: m(f.fat), fiber: m(f.fiber), sugar: m(f.sugar) }
}
