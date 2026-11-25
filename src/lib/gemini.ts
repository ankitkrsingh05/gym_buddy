import type { Profile } from '../types'
import { BUILT_IN_SYNC, getSettings } from './settings'
import { authSession } from './sync'

/** AI works with a personal key on this device, or through the server (key stored on Vercel) when signed in. */
export const aiEnabled = () => !!getSettings().geminiKey || BUILT_IN_SYNC

async function call(parts: any[], json = true): Promise<string> {
  const { geminiKey, geminiModel } = getSettings()
  const payload = {
    contents: [{ role: 'user', parts }],
    generationConfig: json ? { responseMimeType: 'application/json', temperature: 0.2 } : { temperature: 0.5 },
  }
  let r: Response
  if (geminiKey) {
    r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify(payload),
    })
  } else {
    const session = await authSession()
    if (!session) throw new Error('Sign in under Settings → Cloud sync to use AI features.')
    r = await fetch('api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ model: geminiModel, payload }),
    })
  }
  if (!r.ok) {
    const t = await r.text()
    let msg = t.slice(0, 200)
    try { msg = JSON.parse(t).error?.message ?? JSON.parse(t).error ?? msg } catch { /* not JSON */ }
    throw new Error(`AI error ${r.status}: ${msg}`)
  }
  const j = await r.json()
  return j.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('') ?? ''
}

export async function blobToBase64(b: Blob): Promise<string> {
  const buf = new Uint8Array(await b.arrayBuffer())
  let s = ''
  for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000))
  return btoa(s)
}

export interface AiFood { name: string; serving: string; grams: number; kcal: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; tags: string[] }

const FOOD_PROMPT = `You are a nutrition estimator. Identify every food/drink item and estimate its portion and nutrition.
Prefer realistic home-cooked portion sizes; for Indian dishes assume typical home recipes with oil/ghee.
Return ONLY JSON: {"items":[{"name":string,"serving":string,"grams":number,"kcal":number,"protein":number,"carbs":number,"fat":number,"fiber":number,"sugar":number,"tags":string[]}],"notes":string}
tags may include: "junk","fried","sugary","alcohol","dense","protein".`

export async function aiFoodFromPhoto(image: Blob, hint: string): Promise<{ items: AiFood[]; notes: string }> {
  const text = await call([
    { text: `${FOOD_PROMPT}\nUser note: ${hint || 'none'}` },
    { inline_data: { mime_type: image.type || 'image/jpeg', data: await blobToBase64(image) } },
  ])
  return JSON.parse(text)
}

export async function aiFoodFromText(desc: string): Promise<{ items: AiFood[]; notes: string }> {
  const text = await call([{ text: `${FOOD_PROMPT}\nMeal description: ${desc}` }])
  return JSON.parse(text)
}

export async function aiPhotoReview(current: Blob, previous: Blob | null, ctx: string): Promise<string> {
  const parts: any[] = [{
    text: `You are a supportive, honest physique coach. The user is trying to gain weight (lean muscle). Compare the progress photos.
Comment on visible changes in shoulders, chest, arms, waist/abdomen, legs and posture. Be specific but cautious: lighting, pump, posture and camera angle affect photos.
Do NOT guess body-fat percentage precisely. Finish with 2-3 actionable tips. Keep it under 180 words. Context: ${ctx}`,
  }]
  if (previous) {
    parts.push({ text: 'Earlier photo:' }, { inline_data: { mime_type: 'image/jpeg', data: await blobToBase64(previous) } })
  }
  parts.push({ text: 'Latest photo:' }, { inline_data: { mime_type: 'image/jpeg', data: await blobToBase64(current) } })
  return call(parts, false)
}

export async function aiWeeklyCoach(p: Profile, summary: string): Promise<string> {
  return call([{
    text: `You are an evidence-based strength & nutrition coach. Client: ${p.age}y ${p.sex}, ${p.heightCm} cm, goal ${p.targetWeightKg} kg, ${p.experience} lifter, ${p.dietType}, eats ${p.mealsPerDay} meals/day, appetite ${p.appetite}, ${p.jobType} job.
Here is their last-7-days data:\n${summary}\n
Write a short weekly review (max 200 words): what went well, the single biggest limiter, and 3 concrete actions for next week (food, training, recovery). Use simple language, bullet points.`,
  }], false)
}

/** Personal coaching cues for today's session (certified-trainer style), based on the user's profile and today's data. */
export async function aiSessionTips(p: Profile, s: import('../types').Session): Promise<string> {
  const plan = s.exercises.map((e) => `${e.exerciseId}: ${e.targetSets}x${e.targetReps} @ ${e.targetWeight}kg`).join('; ')
  return call([{
    text: `You are an NSCA-certified strength coach briefing your client before a session. Client: ${p.age}y ${p.sex}, ${p.heightCm} cm, ${p.experience} lifter, goal: gain lean weight (${p.targetWeightKg} kg target), ${p.jobType} job, injuries: ${p.injuries.join(', ') || 'none'}${p.healthNotes ? `, notes: ${p.healthNotes}` : ''}.
Today: ${s.dayName}, week ${s.week}${s.deload ? ' (deload)' : ''}, readiness ${s.readiness.score}/100 (sleep ${s.readiness.sleepHours} h, energy ${s.readiness.energy}/5, soreness ${s.readiness.soreness}/5).
Plan: ${plan}.
Adjustments already applied: ${s.adjustments.join(' ') || 'none'}.
Give a short pre-workout briefing: 1 focus for today, 2 technique cues for the hardest lift, 1 warm-up/mobility tip specific to this client, 1 safety note if relevant. Max 90 words, bullet points, no markdown headings, encouraging tone.`,
  }], false)
}
