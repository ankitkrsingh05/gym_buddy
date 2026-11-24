/** Device-local settings (API keys are never synced to the cloud). */
export interface Settings {
  supabaseUrl: string
  supabaseAnonKey: string
  geminiKey: string
  geminiModel: string
  usdaKey: string
  aiPhotoReview: boolean // allow sending progress photos to Gemini (opt-in)
  restCompound: number // seconds
  restIsolation: number
  sound: boolean
  autoAdvance: boolean // start next set automatically when rest ends
}

const KEY = 'gainlab.settings'
/** True when the deployed build ships with Supabase config, so the keys never need to be shown. */
export const BUILT_IN_SYNC = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
const DEFAULTS: Settings = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  geminiKey: '',
  geminiModel: 'gemini-2.5-flash',
  usdaKey: 'DEMO_KEY',
  aiPhotoReview: false,
  restCompound: 150,
  restIsolation: 90,
  sound: true,
  autoAdvance: true,
}

export function getSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    // Empty saved values must not hide the built-in Supabase config
    for (const k of Object.keys(saved)) if (saved[k] === '') delete saved[k]
    if (BUILT_IN_SYNC) { delete saved.supabaseUrl; delete saved.supabaseAnonKey }
    return { ...DEFAULTS, ...saved }
  } catch {
    return DEFAULTS
  }
}

export function setSettings(s: Partial<Settings>) {
  const next = { ...getSettings(), ...s }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch { /* storage blocked */ }
  window.dispatchEvent(new Event('gainlab-settings'))
  return next
}
