export interface NepaliFoodItem {
  name: string;
  name_ne: string;
  category: string;
  typical_portion_g: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  calories: number;
}

export const NEPALI_FOODS: NepaliFoodItem[] = [
  { name: 'Dal Bhat (lentils & rice)', name_ne: 'दाल भात', category: 'meal', typical_portion_g: 350, carbs_g: 65, protein_g: 14, fat_g: 8, calories: 390 },
  { name: 'Bhat (steamed rice)', name_ne: 'भात', category: 'staple', typical_portion_g: 200, carbs_g: 56, protein_g: 5, fat_g: 1, calories: 260 },
  { name: 'Dal (lentil soup)', name_ne: 'दाल', category: 'curry', typical_portion_g: 150, carbs_g: 18, protein_g: 9, fat_g: 3, calories: 135 },
  { name: 'Roti (flatbread)', name_ne: 'रोटी', category: 'staple', typical_portion_g: 40, carbs_g: 18, protein_g: 3, fat_g: 2, calories: 105 },
  { name: 'Tarkari (mixed vegetable curry)', name_ne: 'तरकारी', category: 'curry', typical_portion_g: 150, carbs_g: 12, protein_g: 3, fat_g: 5, calories: 105 },
  { name: 'Aloo Tarkari (potato curry)', name_ne: 'आलु तरकारी', category: 'curry', typical_portion_g: 150, carbs_g: 25, protein_g: 3, fat_g: 6, calories: 170 },
  { name: 'Momo (dumplings)', name_ne: 'म:म:', category: 'snack', typical_portion_g: 120, carbs_g: 30, protein_g: 10, fat_g: 8, calories: 240 },
  { name: 'Chicken Curry', name_ne: 'कुखुराको मासु', category: 'curry', typical_portion_g: 120, carbs_g: 5, protein_g: 22, fat_g: 12, calories: 220 },
  { name: 'Sel Roti (rice donut)', name_ne: 'सेल रोटी', category: 'snack', typical_portion_g: 60, carbs_g: 30, protein_g: 3, fat_g: 8, calories: 210 },
  { name: 'Chana (chickpea curry)', name_ne: 'चना', category: 'curry', typical_portion_g: 120, carbs_g: 22, protein_g: 8, fat_g: 4, calories: 155 },
  { name: 'Dahi/Curd (yogurt)', name_ne: 'दही', category: 'dairy', typical_portion_g: 100, carbs_g: 8, protein_g: 4, fat_g: 4, calories: 85 },
  { name: 'Chiya (milk tea)', name_ne: 'चिया', category: 'drink', typical_portion_g: 200, carbs_g: 12, protein_g: 2, fat_g: 3, calories: 85 },
  { name: 'Milk (whole)', name_ne: 'दुध', category: 'drink', typical_portion_g: 200, carbs_g: 10, protein_g: 6, fat_g: 7, calories: 130 },
  { name: 'Bhuja/Chiura (beaten rice)', name_ne: 'चिउरा', category: 'staple', typical_portion_g: 80, carbs_g: 60, protein_g: 5, fat_g: 1, calories: 270 },
  { name: 'Phapar ko Roti (buckwheat bread)', name_ne: 'फापरको रोटी', category: 'staple', typical_portion_g: 40, carbs_g: 28, protein_g: 5, fat_g: 1, calories: 140 },
  { name: 'Jaulo (rice & lentil porridge)', name_ne: 'जाउलो', category: 'meal', typical_portion_g: 250, carbs_g: 40, protein_g: 8, fat_g: 3, calories: 220 },
  { name: 'Khichadi (rice-lentil mix)', name_ne: 'खिचडी', category: 'meal', typical_portion_g: 300, carbs_g: 50, protein_g: 12, fat_g: 6, calories: 305 },
  { name: 'Egg (fried)', name_ne: 'अण्डा', category: 'protein', typical_portion_g: 55, carbs_g: 1, protein_g: 7, fat_g: 7, calories: 95 },
  { name: 'Egg (boiled)', name_ne: 'उसिनेको अण्डा', category: 'protein', typical_portion_g: 50, carbs_g: 1, protein_g: 6, fat_g: 5, calories: 75 },
  { name: 'Banana', name_ne: 'केरा', category: 'fruit', typical_portion_g: 120, carbs_g: 28, protein_g: 1, fat_g: 0, calories: 110 },
  { name: 'Apple', name_ne: 'स्याउ', category: 'fruit', typical_portion_g: 150, carbs_g: 20, protein_g: 0, fat_g: 0, calories: 78 },
  { name: 'Khajuri/Chaku (molasses candy)', name_ne: 'चाकु', category: 'snack', typical_portion_g: 30, carbs_g: 22, protein_g: 1, fat_g: 0, calories: 90 },
];

export function searchNepaliFoods(query: string): NepaliFoodItem[] {
  const q = query.toLowerCase();
  return NEPALI_FOODS.filter(f =>
    f.name.toLowerCase().includes(q) ||
    f.name_ne.includes(q)
  ).slice(0, 10);
}
