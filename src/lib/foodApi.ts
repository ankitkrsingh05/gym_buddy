import type { FoodItem } from '../types'
import { getSettings } from './settings'
import { uid } from './util'

/** A per-100 g nutrition record from an online database. User picks grams. */
export interface Per100 {
  name: string
  brand?: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  servingGrams?: number
  source: 'usda' | 'off'
}

export async function usdaSearch(q: string): Promise<Per100[]> {
  const key = getSettings().usdaKey || 'DEMO_KEY'
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(q)}&pageSize=15&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS),Branded`
  const r = await fetch(url)
  if (!r.ok) throw new Error(r.status === 429 ? 'USDA rate limit hit — add your free USDA key in Settings.' : `USDA error ${r.status}`)
  const j = await r.json()
  const n = (f: any, ids: number[]) => {
    const x = f.foodNutrients?.find((fn: any) => ids.includes(fn.nutrientId))
    return x ? Number(x.value) || 0 : 0
  }
  return (j.foods ?? []).map((f: any) => ({
    name: titleCase(f.description),
    brand: f.brandName || f.brandOwner,
    kcal: n(f, [1008, 2047, 2048]),
    protein: n(f, [1003]),
    carbs: n(f, [1005]),
    fat: n(f, [1004]),
    fiber: n(f, [1079]),
    sugar: n(f, [2000, 1063]),
    servingGrams: f.servingSizeUnit === 'g' ? f.servingSize : undefined,
    source: 'usda' as const,
  })).filter((f: Per100) => f.kcal > 0)
}

function offToPer100(p: any): Per100 | null {
  const n = p?.nutriments
  if (!n) return null
  const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : undefined)
  if (kcal === undefined) return null
  return {
    name: p.product_name || p.generic_name || 'Unknown product',
    brand: p.brands,
    kcal: Number(kcal) || 0,
    protein: Number(n.proteins_100g) || 0,
    carbs: Number(n.carbohydrates_100g) || 0,
    fat: Number(n.fat_100g) || 0,
    fiber: Number(n.fiber_100g) || 0,
    sugar: Number(n.sugars_100g) || 0,
    servingGrams: p.serving_quantity ? Number(p.serving_quantity) : undefined,
    source: 'off',
  }
}

export async function offBarcode(code: string): Promise<Per100 | null> {
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,generic_name,brands,nutriments,serving_quantity`)
  if (!r.ok) return null
  const j = await r.json()
  return j.status === 1 ? offToPer100(j.product) : null
}

export async function offSearch(q: string): Promise<Per100[]> {
  const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&fields=product_name,generic_name,brands,nutriments,serving_quantity`)
  if (!r.ok) throw new Error(`Open Food Facts error ${r.status}`)
  const j = await r.json()
  return (j.products ?? []).map(offToPer100).filter((x: Per100 | null): x is Per100 => !!x && x.kcal > 0)
}

export function per100ToFood(p: Per100, grams: number): FoodItem {
  const f = grams / 100
  const r1 = (x: number) => Math.round(x * f * 10) / 10
  return {
    id: uid(), updatedAt: Date.now(), name: p.brand ? `${p.name} (${p.brand})` : p.name, serving: `${grams} g`, grams,
    kcal: Math.round(p.kcal * f), protein: r1(p.protein), carbs: r1(p.carbs), fat: r1(p.fat), fiber: r1(p.fiber), sugar: r1(p.sugar),
    diet: 'nonveg', allergens: [], tags: p.sugar > 30 ? ['sugary'] : [], source: p.source,
  }
}

function titleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
}
