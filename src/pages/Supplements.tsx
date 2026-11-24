import type { ReactNode } from 'react'
import { Card } from '../components/ui'
import { useProfile } from '../hooks'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <div className="space-y-1.5"><h3 className="font-semibold text-emerald-300">{title}</h3><div className="space-y-1.5 text-sm text-slate-300">{children}</div></div>
}

export default function Supplements() {
  const p = useProfile()
  const kg = p?.startWeightKg ?? 62
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Supplements guide</h1>
      <p className="text-sm text-slate-400">General education, not medical advice. If you have kidney or liver disease, take regular medication, or have a medical condition, talk to your doctor before starting any supplement.</p>

      <Card title="Whey protein">
        <div className="space-y-4">
          <Section title="What it is">
            <p>A milk protein, separated during cheese-making and dried into powder. It's just food in a convenient form, with no "steroid" effect. One scoop (~30 g) gives about 20–25 g protein and 110–130 kcal.</p>
            <p><b>Concentrate</b> (≈70–80% protein) is cheaper and has a little lactose and fat. <b>Isolate</b> (≈90% protein) has almost no lactose, which suits people who get bloated from milk. <b>Hydrolysed</b> is pre-digested and costs more, with no real benefit for most people.</p>
          </Section>
          <Section title="Why it helps you">
            <p>For muscle growth you want roughly <b>1.6–2.2 g protein per kg</b> a day, which is about <b>{Math.round(kg * 1.6)}–{Math.round(kg * 2.2)} g</b> for you. With only 2 meals and a low appetite, that's hard to reach from food alone. Whey is fast to digest, high in leucine (the amino acid that switches on muscle building), and blends easily into a high-calorie shake.</p>
          </Section>
          <Section title="How to take it">
            <p>• 1–2 scoops a day, to fill whatever gap your food leaves, not on top of an already-high protein intake.</p>
            <p>• Timing matters much less than your daily total. Post-workout or as a mid-morning shake both work well.</p>
            <p>• Weight-gain shake: 300 ml full-cream milk + 1 scoop whey + 1 banana + 2 tbsp peanut butter + 40 g oats + 3 dates ≈ <b>800 kcal, 50 g protein</b>.</p>
          </Section>
          <Section title="Safety & side effects">
            <p>• <b>Healthy kidneys:</b> high-protein diets have not been shown to harm kidney function in healthy adults. People with <b>existing kidney disease</b> should limit protein and must ask their doctor.</p>
            <p>• <b>Bloating, gas or loose stools</b> usually come from lactose. Switch to isolate, or to a plant protein (pea + rice).</p>
            <p>• <b>Acne:</b> some people notice more breakouts with dairy or whey. Stop it and see if that helps.</p>
            <p>• <b>Quality matters most:</b> mislabelled and contaminated protein powders are common in some markets. Buy from authorised sellers, check the batch or authenticity code, and prefer brands with third-party testing (e.g. Informed Sport, NSF, Labdoor). Avoid "mass gainers" with long ingredient lists, proprietary blends or added "hormone boosters".</p>
            <p>• Whey doesn't replace meals. Real food brings fibre, vitamins and minerals.</p>
          </Section>
        </div>
      </Card>

      <Card title="Creatine monohydrate">
        <div className="space-y-4">
          <Section title="What it is">
            <p>A compound your body makes, also found in meat and fish. It's stored in muscle as phosphocreatine, which powers short, intense efforts like a heavy set. Supplementing raises muscle stores by about 20–40%. It is one of the most-researched sports supplements, with hundreds of studies.</p>
          </Section>
          <Section title="Benefits">
            <p>• Usually 1–2 extra reps per set at the same weight. Over months, that adds up to more strength and muscle.</p>
            <p>• Draws water <b>into</b> muscle cells, so muscles look fuller. This is not "bloat" under the skin.</p>
            <p>• Some evidence for benefits to brain function, especially when sleep-deprived, and for vegetarians, who start with lower stores.</p>
          </Section>
          <Section title="How to take it">
            <p>• <b>3–5 g every day</b>, training days and rest days, at any time. Taking it with a meal can be easier on the stomach.</p>
            <p>• Loading phase (optional): 20 g/day split into 4 doses for 5–7 days fills your stores faster. Skipping it is fine; 3–5 g/day reaches the same level in about 3–4 weeks.</p>
            <p>• No need to "cycle" it on and off. Buy plain <b>creatine monohydrate</b>. HCl, "buffered" or ethyl-ester forms cost more and aren't better.</p>
          </Section>
          <Section title="What to expect on the scale">
            <p>Expect about <b>0.5–1.5 kg</b> of extra weight in the first 1–3 weeks. That's water stored in muscle, not fat. The app's forecast flags this when you set a creatine start date, so it doesn't confuse your calorie targets.</p>
          </Section>
          <Section title="Safety & side effects">
            <p>• In healthy adults, long-term studies at normal doses show no kidney or liver harm.</p>
            <p>• It <b>raises blood creatinine</b>, a marker used to check kidney function, without actually harming the kidneys. Tell your doctor you take creatine before blood tests so the result isn't misread.</p>
            <p>• <b>Don't take it</b> if you have kidney disease, or without medical advice if you take drugs that affect the kidneys.</p>
            <p>• Stomach upset or cramps mostly happen with big single doses. Split doses and drink enough water (2.5–3 L a day).</p>
            <p>• <b>Hair loss:</b> one small 2009 study found a rise in DHT. It hasn't been replicated and no study has shown hair loss. If you're strongly prone to male-pattern baldness and worried, ask a dermatologist.</p>
          </Section>
        </div>
      </Card>

      <Card title="Usually not worth your money">
        <p className="text-sm text-slate-300">BCAAs (pointless if you hit your protein target), "testosterone boosters", fat burners, and mass gainers loaded with sugar (make your own shake instead). Higher priorities: <b>sleep 7–9 h</b>, <b>hit calories 5+ days a week</b>, and <b>train consistently</b>. Vitamin D can help if you're low (common with desk jobs). Get it tested first.</p>
      </Card>
    </div>
  )
}
