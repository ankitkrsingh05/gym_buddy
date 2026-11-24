import type { Allergen, DietType, FoodItem, Profile } from '../types'

// Approximate values per serving. [name, serving, grams, kcal, protein, carbs, fat, fiber, sugar, diet, allergens, tags, cuisine]
type Row = [string, string, number, number, number, number, number, number, number, DietType, Allergen[], string[], string]

const V: DietType = 'vegan', VG: DietType = 'vegetarian', EG: DietType = 'eggetarian', NV: DietType = 'nonveg'

const ROWS: Row[] = [
  // ----- Indian staples -----
  ['Roti / Chapati', '1 medium (40 g)', 40, 120, 3.5, 20, 3, 3, 0.5, V, ['gluten'], ['staple'], 'Indian'],
  ['Roti with ghee', '1 medium', 45, 160, 3.5, 20, 7.5, 3, 0.5, VG, ['gluten', 'dairy'], ['staple', 'dense'], 'Indian'],
  ['Paratha (plain)', '1 medium', 80, 260, 5, 34, 12, 4, 1, VG, ['gluten', 'dairy'], ['staple', 'dense'], 'Indian'],
  ['Aloo paratha', '1 medium', 130, 330, 7, 45, 14, 5, 2, VG, ['gluten', 'dairy'], ['dense'], 'Indian'],
  ['Steamed rice', '1 cup cooked (160 g)', 160, 205, 4, 45, 0.5, 0.6, 0, V, [], ['staple'], 'Indian'],
  ['Jeera rice', '1 cup', 170, 260, 4.5, 46, 6, 1, 0, VG, ['dairy'], ['staple'], 'Indian'],
  ['Dal (toor/moong, cooked)', '1 bowl (200 g)', 200, 220, 12, 32, 5, 7, 2, V, [], ['protein'], 'Indian'],
  ['Dal makhani', '1 bowl (200 g)', 200, 340, 13, 30, 18, 8, 3, VG, ['dairy'], ['dense'], 'Indian'],
  ['Rajma (kidney bean curry)', '1 bowl (200 g)', 200, 260, 13, 38, 6, 11, 3, V, [], ['protein'], 'Indian'],
  ['Chole (chickpea curry)', '1 bowl (200 g)', 200, 300, 12, 40, 10, 11, 5, V, [], ['protein'], 'Indian'],
  ['Paneer bhurji', '1 serving (150 g)', 150, 380, 22, 8, 29, 1, 4, VG, ['dairy'], ['protein', 'dense'], 'Indian'],
  ['Palak paneer', '1 bowl (200 g)', 200, 330, 16, 12, 24, 4, 4, VG, ['dairy'], ['protein'], 'Indian'],
  ['Paneer butter masala', '1 bowl (200 g)', 200, 440, 17, 14, 35, 2, 7, VG, ['dairy', 'nuts'], ['dense'], 'Indian'],
  ['Paneer (raw)', '100 g', 100, 290, 19, 3, 22, 0, 2, VG, ['dairy'], ['protein', 'dense'], 'Indian'],
  ['Soya chunks (cooked)', '1 bowl (50 g dry)', 50, 170, 26, 16, 0.3, 6, 0, V, ['soy'], ['protein'], 'Indian'],
  ['Mixed veg sabzi', '1 bowl (150 g)', 150, 150, 4, 15, 8, 5, 6, V, [], [], 'Indian'],
  ['Aloo sabzi', '1 bowl (150 g)', 150, 200, 3, 25, 10, 3, 2, V, [], [], 'Indian'],
  ['Chicken curry', '1 bowl (200 g)', 200, 320, 30, 8, 18, 2, 3, NV, [], ['protein'], 'Indian'],
  ['Butter chicken', '1 bowl (200 g)', 200, 450, 30, 12, 31, 2, 7, NV, ['dairy', 'nuts'], ['protein', 'dense'], 'Indian'],
  ['Chicken tikka', '6 pieces (150 g)', 150, 250, 38, 5, 8, 1, 2, NV, ['dairy'], ['protein'], 'Indian'],
  ['Tandoori chicken', '2 pieces (250 g with bone)', 180, 290, 40, 4, 12, 1, 2, NV, ['dairy'], ['protein'], 'Indian'],
  ['Mutton curry', '1 bowl (200 g)', 200, 420, 32, 7, 29, 2, 3, NV, [], ['protein', 'dense'], 'Indian'],
  ['Fish curry', '1 bowl (200 g)', 200, 280, 26, 8, 16, 2, 3, NV, ['fish'], ['protein'], 'Indian'],
  ['Egg curry', '2 eggs + gravy', 220, 300, 15, 10, 22, 2, 4, EG, ['egg'], ['protein'], 'Indian'],
  ['Egg bhurji', '3 eggs', 170, 300, 19, 5, 23, 1, 2, EG, ['egg'], ['protein', 'dense'], 'Indian'],
  ['Chicken biryani', '1 plate (350 g)', 350, 600, 30, 70, 22, 3, 3, NV, ['dairy'], ['dense'], 'Indian'],
  ['Veg biryani / pulao', '1 plate (300 g)', 300, 450, 9, 68, 15, 5, 4, VG, ['dairy'], ['dense'], 'Indian'],
  ['Poha', '1 plate (200 g)', 200, 300, 6, 50, 9, 3, 3, V, ['peanut'], [], 'Indian'],
  ['Upma', '1 plate (200 g)', 200, 280, 7, 40, 10, 3, 2, VG, ['gluten', 'dairy'], [], 'Indian'],
  ['Idli', '2 pieces', 120, 160, 5, 33, 0.8, 2, 0, V, [], [], 'Indian'],
  ['Plain dosa', '1 dosa', 100, 170, 4, 28, 4, 1, 0, V, [], [], 'Indian'],
  ['Masala dosa', '1 dosa', 200, 380, 7, 52, 15, 4, 3, VG, ['dairy'], ['dense'], 'Indian'],
  ['Sambar', '1 bowl (200 g)', 200, 150, 7, 22, 4, 6, 4, V, [], [], 'Indian'],
  ['Coconut chutney', '2 tbsp', 30, 80, 1, 3, 7, 2, 1, V, [], [], 'Indian'],
  ['Khichdi', '1 bowl (250 g)', 250, 320, 11, 52, 7, 5, 1, VG, ['dairy'], [], 'Indian'],
  ['Curd / Dahi (full fat)', '1 cup (200 g)', 200, 120, 7, 9, 6.5, 0, 9, VG, ['dairy'], ['protein'], 'Indian'],
  ['Greek yogurt / hung curd', '1 cup (170 g)', 170, 170, 17, 7, 8, 0, 6, VG, ['dairy'], ['protein'], 'Any'],
  ['Lassi (sweet)', '1 glass (300 ml)', 300, 260, 9, 40, 7, 0, 36, VG, ['dairy'], ['sugary', 'drink'], 'Indian'],
  ['Chaas / buttermilk', '1 glass (250 ml)', 250, 50, 3, 5, 2, 0, 4, VG, ['dairy'], ['drink'], 'Indian'],
  ['Ghee', '1 tbsp (14 g)', 14, 125, 0, 0, 14, 0, 0, VG, ['dairy'], ['dense'], 'Indian'],
  ['Samosa', '1 piece', 100, 300, 5, 32, 17, 3, 2, V, ['gluten'], ['fried', 'junk'], 'Indian'],
  ['Pakora / bhajiya', '6 pieces', 120, 330, 7, 30, 20, 4, 2, V, [], ['fried', 'junk'], 'Indian'],
  ['Gulab jamun', '2 pieces', 80, 300, 4, 45, 12, 0.5, 35, VG, ['dairy', 'gluten'], ['sugary', 'fried'], 'Indian'],
  ['Masala chai with sugar', '1 cup', 150, 90, 3, 13, 3, 0, 11, VG, ['dairy'], ['drink'], 'Indian'],
  ['Sprouts chaat', '1 bowl (150 g)', 150, 160, 11, 26, 1.5, 7, 3, V, [], ['protein'], 'Indian'],
  ['Besan chilla', '2 pieces', 160, 280, 14, 30, 11, 6, 2, V, [], ['protein'], 'Indian'],
  ['Dry fruit laddoo', '1 piece (40 g)', 40, 180, 4, 20, 10, 3, 14, VG, ['nuts', 'dairy'], ['dense'], 'Indian'],
  ['Chikki (peanut)', '1 bar (30 g)', 30, 150, 4, 17, 8, 1.5, 12, V, ['peanut'], ['dense'], 'Indian'],
  ['Makhana roasted', '1 cup (30 g)', 30, 110, 3, 20, 1.5, 4, 0, V, [], [], 'Indian'],
  // ----- Proteins (generic) -----
  ['Whole egg (boiled)', '1 large', 50, 72, 6.3, 0.4, 4.8, 0, 0.2, EG, ['egg'], ['protein'], 'Any'],
  ['Egg omelette (3 eggs, oil)', '1 omelette', 170, 300, 19, 2, 24, 0, 1, EG, ['egg'], ['protein', 'dense'], 'Any'],
  ['Egg whites', '4 whites', 132, 68, 14, 1, 0.2, 0, 1, EG, ['egg'], ['protein'], 'Any'],
  ['Chicken breast (cooked)', '150 g', 150, 250, 46, 0, 5.5, 0, 0, NV, [], ['protein'], 'Any'],
  ['Chicken thigh (cooked)', '150 g', 150, 320, 38, 0, 18, 0, 0, NV, [], ['protein'], 'Any'],
  ['Salmon (cooked)', '150 g', 150, 310, 33, 0, 19, 0, 0, NV, ['fish'], ['protein', 'dense'], 'Any'],
  ['Tuna (canned in water)', '1 can (120 g)', 120, 130, 29, 0, 1, 0, 0, NV, ['fish'], ['protein'], 'Any'],
  ['Prawns (cooked)', '150 g', 150, 150, 32, 1, 2, 0, 0, NV, ['shellfish'], ['protein'], 'Any'],
  ['Lean beef mince (cooked)', '150 g', 150, 370, 39, 0, 23, 0, 0, NV, [], ['protein', 'dense'], 'Any'],
  ['Tofu (firm)', '150 g', 150, 215, 23, 4, 13, 3, 1, V, ['soy'], ['protein'], 'Any'],
  ['Whey protein', '1 scoop (32 g)', 32, 125, 24, 3, 1.8, 0, 2, VG, ['dairy'], ['protein'], 'Any'],
  ['Plant protein powder', '1 scoop (33 g)', 33, 125, 22, 4, 2.5, 1, 1, V, ['soy'], ['protein'], 'Any'],
  // ----- Dairy & drinks -----
  ['Milk (full cream)', '1 glass (250 ml)', 250, 165, 8, 12, 9, 0, 12, VG, ['dairy'], ['drink', 'protein'], 'Any'],
  ['Milk (toned)', '1 glass (250 ml)', 250, 125, 8, 12, 5, 0, 12, VG, ['dairy'], ['drink'], 'Any'],
  ['Soy milk', '1 glass (250 ml)', 250, 100, 7, 8, 4, 1, 6, V, ['soy'], ['drink'], 'Any'],
  ['Cheese slice', '1 slice (20 g)', 20, 65, 4, 1, 5, 0, 0.5, VG, ['dairy'], [], 'Any'],
  ['Banana-PB-oats milkshake', '1 large glass (450 ml)', 450, 650, 24, 80, 26, 7, 40, VG, ['dairy', 'peanut'], ['dense', 'drink'], 'Any'],
  ['Mass-gainer shake (homemade, whey)', '1 large glass', 500, 800, 50, 95, 25, 7, 45, VG, ['dairy', 'peanut'], ['dense', 'drink', 'protein'], 'Any'],
  ['Soft drink (cola)', '1 can (330 ml)', 330, 140, 0, 35, 0, 0, 35, V, [], ['sugary', 'junk', 'drink'], 'Any'],
  ['Fruit juice (packaged)', '1 glass (250 ml)', 250, 115, 1, 28, 0, 0, 24, V, [], ['sugary', 'drink'], 'Any'],
  ['Beer', '1 pint (500 ml)', 500, 215, 2, 18, 0, 0, 0, V, ['gluten'], ['alcohol', 'drink'], 'Any'],
  ['Coffee with milk & sugar', '1 cup', 200, 80, 3, 11, 3, 0, 10, VG, ['dairy'], ['drink'], 'Any'],
  // ----- Carbs & breakfast -----
  ['Oats (dry)', '1/2 cup (40 g)', 40, 150, 5, 27, 2.6, 4, 0.5, V, ['gluten'], ['staple'], 'Any'],
  ['Oats porridge with milk, banana, honey', '1 bowl', 400, 480, 17, 80, 11, 7, 38, VG, ['dairy', 'gluten'], ['dense'], 'Any'],
  ['Bread (whole wheat)', '2 slices', 60, 160, 7, 28, 2, 4, 3, V, ['gluten'], ['staple'], 'Any'],
  ['Peanut butter toast', '2 slices + 2 tbsp PB', 92, 350, 15, 34, 18, 6, 6, V, ['gluten', 'peanut'], ['dense'], 'Any'],
  ['Potato (boiled)', '1 medium (170 g)', 170, 145, 3.5, 33, 0.2, 3, 1.5, V, [], ['staple'], 'Any'],
  ['Sweet potato (baked)', '1 medium (150 g)', 150, 135, 3, 31, 0.2, 5, 9, V, [], ['staple'], 'Any'],
  ['Pasta (cooked)', '1 cup (140 g)', 140, 220, 8, 43, 1.3, 2.5, 1, V, ['gluten'], ['staple'], 'Any'],
  ['Muesli / granola', '1/2 cup (50 g)', 50, 220, 5, 33, 8, 4, 12, V, ['nuts', 'gluten'], ['dense'], 'Any'],
  ['Cornflakes with milk', '1 bowl', 280, 260, 9, 45, 5, 1, 18, VG, ['dairy', 'gluten'], [], 'Any'],
  // ----- Fruits -----
  ['Banana', '1 medium', 118, 105, 1.3, 27, 0.4, 3, 14, V, [], [], 'Any'],
  ['Apple', '1 medium', 180, 95, 0.5, 25, 0.3, 4.4, 19, V, [], [], 'Any'],
  ['Mango', '1 cup (165 g)', 165, 100, 1.4, 25, 0.6, 2.6, 23, V, [], [], 'Any'],
  ['Dates', '4 dates (30 g)', 30, 85, 0.7, 22, 0.1, 2.4, 19, V, [], ['dense'], 'Any'],
  ['Raisins', '1/4 cup (40 g)', 40, 120, 1.2, 32, 0.2, 1.5, 24, V, [], ['dense'], 'Any'],
  ['Orange', '1 medium', 130, 62, 1.2, 15, 0.2, 3, 12, V, [], [], 'Any'],
  // ----- Nuts & fats -----
  ['Almonds', '1 handful (28 g)', 28, 165, 6, 6, 14, 3.5, 1.2, V, ['nuts'], ['dense'], 'Any'],
  ['Cashews', '1 handful (28 g)', 28, 157, 5, 9, 12, 1, 1.7, V, ['nuts'], ['dense'], 'Any'],
  ['Walnuts', '1 handful (28 g)', 28, 185, 4.3, 4, 18.5, 2, 0.7, V, ['nuts'], ['dense'], 'Any'],
  ['Peanuts (roasted)', '1 handful (30 g)', 30, 170, 7.5, 5, 14.5, 2.5, 1.3, V, ['peanut'], ['dense', 'protein'], 'Any'],
  ['Peanut butter', '2 tbsp (32 g)', 32, 190, 8, 6, 16, 2, 3, V, ['peanut'], ['dense'], 'Any'],
  ['Olive oil', '1 tbsp', 14, 120, 0, 0, 14, 0, 0, V, [], ['dense'], 'Any'],
  ['Mixed seeds (pumpkin/sunflower)', '2 tbsp (20 g)', 20, 115, 5, 3, 9.5, 1.5, 0.3, V, [], ['dense'], 'Any'],
  ['Avocado', '1/2 fruit', 100, 160, 2, 9, 15, 7, 0.7, V, [], ['dense'], 'Any'],
  ['Dark chocolate (70%)', '2 squares (20 g)', 20, 120, 1.5, 9, 8.5, 2, 5, V, [], ['dense'], 'Any'],
  // ----- Fast food / junk -----
  ['Pizza', '2 slices (medium)', 220, 570, 24, 66, 22, 4, 7, VG, ['gluten', 'dairy'], ['junk'], 'Any'],
  ['Burger (chicken)', '1 burger', 220, 520, 26, 48, 25, 2, 8, NV, ['gluten', 'egg'], ['junk'], 'Any'],
  ['French fries', 'medium (115 g)', 115, 365, 4, 48, 17, 4.5, 0.3, V, [], ['fried', 'junk'], 'Any'],
  ['Instant noodles', '1 pack', 75, 350, 7, 47, 15, 2, 2, V, ['gluten'], ['junk', 'fried'], 'Any'],
  ['Chips / crisps', '1 small pack (50 g)', 50, 270, 3, 26, 17, 2, 0.5, V, [], ['junk', 'fried'], 'Any'],
  ['Biscuits (cream)', '4 biscuits', 50, 240, 2.5, 34, 10, 1, 18, VG, ['gluten', 'dairy'], ['sugary', 'junk'], 'Any'],
  ['Ice cream', '1 cup (130 g)', 130, 270, 4.5, 31, 14, 1, 28, VG, ['dairy'], ['sugary'], 'Any'],
  ['Momos (chicken, steamed)', '6 pieces', 180, 330, 18, 40, 10, 2, 2, NV, ['gluten'], [], 'Indo-Chinese'],
  ['Chicken fried rice', '1 plate (300 g)', 300, 520, 22, 70, 16, 3, 3, NV, ['egg', 'soy'], [], 'Indo-Chinese'],
  ['Chicken shawarma roll', '1 roll', 250, 520, 30, 45, 24, 3, 4, NV, ['gluten', 'egg'], [], 'Middle Eastern'],
]

const DIET_RANK: Record<DietType, number> = { vegan: 0, vegetarian: 1, eggetarian: 2, nonveg: 3 }

export const BUILTIN_FOODS: FoodItem[] = ROWS.map((r, i) => ({
  id: `b${i}`, updatedAt: 0, name: r[0], serving: r[1], grams: r[2], kcal: r[3], protein: r[4], carbs: r[5], fat: r[6],
  fiber: r[7], sugar: r[8], diet: r[9], allergens: r[10], tags: r[11], cuisine: r[12], source: 'builtin',
}))

/** Does this food fit the user's diet + allergies? Eggetarian = vegetarian + eggs. */
export function allowed(f: FoodItem, p: Pick<Profile, 'dietType' | 'allergies'>) {
  if (f.allergens.some((a) => p.allergies.includes(a))) return false
  if (DIET_RANK[f.diet] > DIET_RANK[p.dietType]) return false
  if (p.dietType === 'vegan' && f.allergens.some((a) => a === 'dairy' || a === 'egg')) return false
  return true
}

export interface Suggestion { title: string; items: FoodItem[]; kcal: number; protein: number }

/** Build up to 3 easy combos that close the remaining kcal/protein gap. */
export function suggestions(p: Profile, kcalLeft: number, proteinLeft: number): Suggestion[] {
  if (kcalLeft < 120) return []
  const powders = ['Whey protein', 'Plant protein powder', 'Mass-gainer shake (homemade, whey)']
  const ok = BUILTIN_FOODS.filter((f) => allowed(f, p) && !f.tags.includes('junk') && !f.tags.includes('alcohol') && !f.tags.includes('sugary') && (p.usesWhey || !powders.includes(f.name)))
  const byName = (n: string) => ok.find((f) => f.name === n)
  const ideas: { title: string; names: string[]; proteinSort?: boolean }[] = [
    { title: 'Liquid calories (easiest)', names: [p.usesWhey ? 'Mass-gainer shake (homemade, whey)' : 'Banana-PB-oats milkshake', 'Milk (full cream)', 'Soy milk', 'Banana', 'Dates'] },
    { title: 'Protein-first snack', names: ['Egg bhurji', 'Chicken tikka', 'Paneer bhurji', 'Soya chunks (cooked)', 'Greek yogurt / hung curd', 'Tofu (firm)', 'Sprouts chaat', 'Whey protein'], proteinSort: true },
    { title: 'Desk snack (no cooking)', names: ['Peanuts (roasted)', 'Almonds', 'Dates', 'Chikki (peanut)', 'Banana', 'Raisins', 'Makhana roasted'] },
    { title: 'Add to your next meal', names: ['Ghee', 'Roti with ghee', 'Steamed rice', 'Curd / Dahi (full fat)', 'Dal (toor/moong, cooked)', 'Olive oil', 'Potato (boiled)'] },
  ]
  const out: Suggestion[] = []
  for (const idea of ideas) {
    const pool = idea.names.map(byName).filter(Boolean) as FoodItem[]
    const chosen: FoodItem[] = []
    let k = 0, pr = 0
    // Greedy: protein-heavy items first if protein is lagging
    const sorted = idea.proteinSort && proteinLeft > 20 ? [...pool].sort((a, b) => b.protein / b.kcal - a.protein / a.kcal) : pool
    for (const f of sorted) {
      if (k >= kcalLeft - 60 || chosen.length >= 3) break
      if (k + f.kcal > kcalLeft + 150) continue
      chosen.push(f); k += f.kcal; pr += f.protein
    }
    if (chosen.length) out.push({ title: idea.title, items: chosen, kcal: Math.round(k), protein: Math.round(pr) })
  }
  return out.slice(0, 3)
}
