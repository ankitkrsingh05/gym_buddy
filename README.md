# GainLab: adaptive weight-gain planner

A free, installable web app (a PWA that works on phone and desktop) that builds and adapts a muscle-gain plan. It covers:

- **Onboarding questionnaire**: body, goal, pace, gym equipment, days and minutes per session, injuries, focus muscles, diet, cuisine, allergies, meals, appetite, supplements, job, steps and sleep. Everything can be edited later in Settings.
- **Progressive training**: the split matches your training days (Full Body, Upper/Lower or Push/Pull/Legs). Training runs in 5–6 week blocks where effort ramps up and then drops for a deload week.
  - Every set is rated Easy / OK / Hard / Very hard / Max. Hitting the top of the rep range at the target effort adds weight, and an easy session adds double. Missing the range twice drops the weight 10% so you can build back up.
  - A daily readiness score (sleep, energy, soreness, stress) changes the sets, effort and load for that session. Muscles that are still sore get less volume.
  - Rating the whole workout from 1 to 10 and fatigue tracking can trigger an early deload.
  - Exercises can be swapped, and there's a rest timer, a plate calculator and an estimated 1-rep-max chart.
- **Nutrition**: food search covers about 110 built-in foods (Indian and general), USDA, Open Food Facts and barcode scanning. You can also describe or photograph a meal and AI estimates it (Gemini, optional).
  - Calorie and macro targets **learn your real maintenance** by comparing what you ate with your weight trend.
  - "Close the gap" suggestions, coaching notes (protein, junk food, sugar, fried food, fibre, 2-meal days) and a "what to avoid" list.
- **Weight**: weight is smoothed into a trend line, compared against a goal-pace line, and used for a 30-day forecast and an "on track?" verdict. The app accounts for creatine water weight.
- **Progress photos**: a guided camera with a ghost overlay of your last photo, a 10-second timer, slider and side-by-side comparison.
  - **On-device body-shape analysis** (MediaPipe) tracks shoulder, waist and hip width relative to torso length, so you can see whether gains look like muscle or fat.
  - Optional AI photo review.
- **Activity**: steps, sports and cardio calories are added to that day's food target.
- **Daily check-in, measurements, a whey and creatine health guide, an AI weekly coach, backup export/import, and Supabase cloud sync** (phone and web).

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

## Free deployment (to use it on your phone)

1. Push this folder to a GitHub repo.
2. Import it on **Vercel** or **Netlify** (free). Build command `npm run build`, output folder `dist`.
3. Open the URL on your phone:
   - iPhone: Safari → Share → **Add to Home Screen**.
   - Android: Chrome → **Install app**.

The camera and barcode scanner need HTTPS, which these hosts provide.

## Cloud sync (optional, free)

1. Create a project at [supabase.com](https://supabase.com).
2. SQL Editor → paste and run [`supabase/schema.sql`](supabase/schema.sql). This creates the `records` table with row-level security and a private `photos` bucket.
3. In the app: **More → Settings → Cloud sync**. Paste the Project URL and anon key, then create an account or sign in. Repeat on each device.
   You can also set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` before building.
4. For magic-link email sign-in, add your deployed URL under Supabase → Authentication → URL Configuration → Redirect URLs.

## AI features (optional, free)

Get a Gemini API key at [aistudio.google.com](https://aistudio.google.com) and paste it in **Settings → AI**. The key is stored only on that device.

- Free-tier requests may be used by Google to improve its models.
- Sending progress photos to AI is a separate opt-in. Body-shape tracking runs on your device without it.

## Tech

React 19 + TypeScript + Vite, Tailwind CSS 4, Dexie (IndexedDB, offline-first), Recharts, vite-plugin-pwa, Supabase (auth, Postgres and storage), MediaPipe Pose (on-device), ZXing (barcodes), Open Food Facts, USDA FoodData Central, Gemini API.

Key logic lives in:

- `src/lib/progression.ts`: autoregulated progressive overload, readiness, deloads
- `src/lib/plan.ts`: plan generation from your profile and equipment
- `src/lib/nutrition.ts`: calorie and macro targets, the calorie model that learns from your data, forecast, food advice
- `src/lib/pose.ts`: body-shape metrics from photos
- `src/lib/sync.ts`: Supabase sync (last-write-wins, works offline)
