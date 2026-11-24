// Vercel serverless function: forwards AI requests to Gemini using a key that lives only on the server.
// Env vars (Vercel → Project → Settings → Environment Variables):
//   GEMINI_API_KEY   – your Gemini key (never sent to the browser)
//   ALLOWED_EMAILS   – comma-separated emails allowed to use it (your Supabase sign-in email)
//   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY – already set for sync; used to verify the caller

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const key = process.env.GEMINI_API_KEY
  const allowed = (process.env.ALLOWED_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (!key) return res.status(501).json({ error: 'AI is not set up on the server yet (GEMINI_API_KEY missing).' })
  if (!allowed.length) return res.status(501).json({ error: 'AI is locked: set ALLOWED_EMAILS on the server.' })

  // Verify the Supabase session of the caller
  const auth = req.headers.authorization || ''
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Sign in (Settings → Cloud sync) to use AI.' })
  const u = await fetch(`${process.env.VITE_SUPABASE_URL}/auth/v1/user`, {
    headers: { Authorization: auth, apikey: process.env.VITE_SUPABASE_ANON_KEY },
  })
  if (!u.ok) return res.status(401).json({ error: 'Your session expired — sign in again.' })
  const user = await u.json()
  if (!allowed.includes(String(user.email || '').toLowerCase())) return res.status(403).json({ error: 'This account is not allowed to use AI.' })

  const { model = 'gemini-2.5-flash', payload } = req.body || {}
  if (!/^[\w.-]+$/.test(model) || !payload) return res.status(400).json({ error: 'Bad request' })
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(payload),
  })
  res.status(r.status).setHeader('Content-Type', 'application/json').send(await r.text())
}
