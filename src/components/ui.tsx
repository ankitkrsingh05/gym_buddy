import { useEffect, type ReactNode } from 'react'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={cx('rounded-2xl border border-slate-800 bg-slate-900/70 p-4', className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold tracking-wide text-slate-300 uppercase">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' | 'soft'; size?: 'sm' | 'md' | 'lg' }
export function Button({ variant = 'primary', size = 'md', className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2.5',
        size === 'lg' && 'px-5 py-3.5 text-lg',
        variant === 'primary' && 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
        variant === 'soft' && 'bg-slate-800 text-slate-100 hover:bg-slate-700',
        variant === 'ghost' && 'text-slate-300 hover:bg-slate-800',
        variant === 'danger' && 'bg-rose-600/90 text-white hover:bg-rose-500',
        className,
      )}
    />
  )
}

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export const inputCls = 'w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-emerald-500'

export function NumInput({ value, onChange, step = 1, min, max, suffix, className }: { value: number | undefined; onChange: (n: number) => void; step?: number; min?: number; max?: number; suffix?: string; className?: string }) {
  return (
    <div className={cx('relative', className)}>
      <input
        type="number" inputMode="decimal" step={step} min={min} max={max}
        className={cx(inputCls, suffix && 'pr-12')}
        value={value === undefined || Number.isNaN(value) ? '' : value}
        onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
      />
      {suffix && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-slate-500">{suffix}</span>}
    </div>
  )
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 999, format, compact }: { value: number; onChange: (n: number) => void; step?: number; min?: number; max?: number; format?: (n: number) => string; compact?: boolean }) {
  const set = (n: number) => onChange(Math.min(max, Math.max(min, Math.round(n * 100) / 100)))
  const btn = compact ? 'px-2 py-1.5 text-lg text-slate-400 active:text-white' : 'px-3 py-2 text-lg text-slate-400 active:text-white'
  return (
    <div className="flex min-w-0 items-center justify-between rounded-xl border border-slate-700 bg-slate-950">
      <button type="button" className={btn} onClick={() => set(value - step)}>−</button>
      <input
        type="number" inputMode="decimal"
        className={cx('min-w-0 bg-transparent text-center font-semibold outline-none', compact ? 'w-10' : 'w-14')}
        value={Number.isNaN(value) ? '' : value}
        onChange={(e) => set(Number(e.target.value))}
      />
      {format && <span className="pr-1 text-xs text-slate-500">{format(value)}</span>}
      <button type="button" className={btn} onClick={() => set(value + step)}>+</button>
    </div>
  )
}

export function Chips<T extends string>({ options, value, onChange, multi = true }: { options: { value: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; multi?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value)
        return (
          <button
            type="button" key={o.value}
            onClick={() => onChange(multi ? (on ? value.filter((v) => v !== o.value) : [...value, o.value]) : [o.value])}
            className={cx('rounded-full border px-3 py-1.5 text-sm transition', on ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-slate-700 text-slate-300 hover:border-slate-500')}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Segmented<T extends string | number>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl border border-slate-700 bg-slate-950 p-1">
      {options.map((o) => (
        <button
          type="button" key={String(o.value)} onClick={() => onChange(o.value)}
          className={cx('flex-1 rounded-lg px-2 py-1.5 text-sm font-medium transition', value === o.value ? 'bg-slate-700 text-white' : 'text-slate-400')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** 1-5 scale with emoji-free labels */
export function Scale({ value, onChange, labels }: { value: number; onChange: (n: number) => void; labels: [string, string] }) {
  return (
    <div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button" key={n} onClick={() => onChange(n)}
            className={cx('h-10 flex-1 rounded-lg border text-sm font-semibold', value === n ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-slate-700 text-slate-400')}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-500"><span>{labels[0]}</span><span>{labels[1]}</span></div>
    </div>
  )
}

export function Ring({ value, max, size = 120, stroke = 12, color = '#22c55e', children }: { value: number; max: number; size?: number; stroke?: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(1, max ? value / max : 0)
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1e293b" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={value > max * 1.1 ? '#f59e0b' : color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset .5s' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

export function Bar({ value, max, color = 'bg-emerald-500', label, unit = 'g' }: { value: number; max: number; color?: string; label: string; unit?: string }) {
  const pct = Math.min(100, max ? (value / max) * 100 : 0)
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs"><span className="text-slate-400">{label}</span><span className="text-slate-300">{Math.round(value)} / {Math.round(max)} {unit}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className={cx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-800 bg-slate-900 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button className="rounded-full px-2 text-2xl leading-none text-slate-400" onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'amber' | 'rose' | 'sky' }) {
  const t = { slate: 'bg-slate-800 text-slate-300', green: 'bg-emerald-500/15 text-emerald-300', amber: 'bg-amber-500/15 text-amber-300', rose: 'bg-rose-500/15 text-rose-300', sky: 'bg-sky-500/15 text-sky-300' }[tone]
  return <span className={cx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', t)}>{children}</span>
}

export function AdviceList({ items }: { items: { level: 'good' | 'warn' | 'bad' | 'info'; title: string; body: string }[] }) {
  const col = { good: 'border-emerald-500/40 bg-emerald-500/5', warn: 'border-amber-500/40 bg-amber-500/5', bad: 'border-rose-500/40 bg-rose-500/5', info: 'border-sky-500/40 bg-sky-500/5' }
  const dot = { good: 'bg-emerald-400', warn: 'bg-amber-400', bad: 'bg-rose-400', info: 'bg-sky-400' }
  return (
    <ul className="space-y-2">
      {items.map((a, i) => (
        <li key={i} className={cx('rounded-xl border p-3', col[a.level])}>
          <div className="flex items-center gap-2 font-semibold"><span className={cx('h-2 w-2 rounded-full', dot[a.level])} />{a.title}</div>
          <p className="mt-1 text-sm text-slate-300">{a.body}</p>
        </li>
      ))}
    </ul>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">{children}</div>
}
