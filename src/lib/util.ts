export const uid = () =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`)

/** Local date as YYYY-MM-DD */
export function today(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return today(d)
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / 86400000)
}

export function fmtDate(s: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  return parseDate(s).toLocaleDateString(undefined, opts)
}

export const round = (n: number, step = 1) => Math.round(n / step) * step
export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
export const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)
export const avg = (a: number[]) => (a.length ? sum(a) / a.length : 0)

export function cmToFtIn(cm: number) {
  const totalIn = cm / 2.54
  const ft = Math.floor(totalIn / 12)
  const inch = Math.round(totalIn - ft * 12)
  return inch === 12 ? `${ft + 1}'0"` : `${ft}'${inch}"`
}
