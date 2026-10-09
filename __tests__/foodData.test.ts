import { NEPALI_FOODS, searchNepaliFoods } from '../src/data/nepaliFoods';
import { KEYWORD_TO_FOODS } from '../src/data/foodLabelMapping';

describe('food database integrity (authoritative sources, 2026-10-07)', () => {
  test('no duplicate English or Devanagari names', () => {
    const names = NEPALI_FOODS.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
    const nes = NEPALI_FOODS.map((f) => f.name_ne);
    expect(new Set(nes).size).toBe(nes.length);
  });

  test('all numeric fields are finite; portion and calories positive', () => {
    for (const f of NEPALI_FOODS) {
      expect(Number.isFinite(f.typical_portion_g) && f.typical_portion_g > 0).toBe(true);
      for (const v of [f.carbs_g, f.protein_g, f.fat_g]) {
        expect(Number.isFinite(v) && v >= 0).toBe(true);
      }
      expect(Number.isFinite(f.calories) && f.calories > 0).toBe(true);
    }
  });

  test('macro energy ≈ stated calories (within tolerance)', () => {
    for (const f of NEPALI_FOODS) {
      const calc = f.carbs_g * 4 + f.protein_g * 4 + f.fat_g * 9;
      const tol = Math.max(35, Math.round(f.calories * 0.28));
      expect(Math.abs(calc - f.calories)).toBeLessThanOrEqual(tol);
    }
  });

  test('every classifier-mapped food name exists in the database', () => {
    const names = new Set(NEPALI_FOODS.map((f) => f.name));
    for (const [kw, foods] of Object.entries(KEYWORD_TO_FOODS)) {
      for (const name of foods) {
        expect(names.has(name)).toBe(true);
      }
    }
  });

  test('source integration spot checks', () => {
    const find = (n: string) => NEPALI_FOODS.find((f) => f.name === n)!;
    expect(find('Bhat (steamed rice)').carbs_g).toBe(59);
    expect(find('Dal (lentil soup)').carbs_g).toBe(11);
    expect(find('Momo (dumplings)').carbs_g).toBe(29);
    expect(find('Banana').carbs_g).toBe(33);
    expect(find('Dhindo (millet porridge)').carbs_g).toBe(56);
    expect(find('Bhat (steamed rice)').source).toContain('Nepal');
    // at least 40 rows carry provenance tags after the integration
    expect(NEPALI_FOODS.filter((f) => !!f.source).length).toBeGreaterThanOrEqual(40);
  });

  test('search works for English and Devanagari, and returns nothing for garbage', () => {
    expect(searchNepaliFoods('momo').length).toBeGreaterThan(0);
    expect(searchNepaliFoods('म:म:').length).toBeGreaterThan(0);
    expect(searchNepaliFoods('zzzz-nothing').length).toBe(0);
  });
});
