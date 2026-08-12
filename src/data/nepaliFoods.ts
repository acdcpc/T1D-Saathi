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
  { name: 'Khajuri/Chaku (molasses candy)', name_ne: 'चाकु', category: 'snack', typical_portion_g: 30, carbs_g: 22, protein_g: 1, fat_g: 0, calories: 90 },
  // ── Regional staples (Hill / Mountain / Terai) ──
  { name: 'Dhindo (millet porridge)', name_ne: 'दिँडो', category: 'staple', typical_portion_g: 250, carbs_g: 45, protein_g: 8, fat_g: 3, calories: 240 },
  { name: 'Kodo ko Dhindo (finger millet)', name_ne: 'कोदोको दिँडो', category: 'staple', typical_portion_g: 250, carbs_g: 42, protein_g: 7, fat_g: 3, calories: 220 },
  { name: 'Makai Bhat (corn rice)', name_ne: 'मकै भात', category: 'staple', typical_portion_g: 200, carbs_g: 50, protein_g: 6, fat_g: 2, calories: 250 },
  { name: 'Makai Bhuteko (roasted corn)', name_ne: 'भुटेको मकै', category: 'snack', typical_portion_g: 100, carbs_g: 21, protein_g: 3, fat_g: 2, calories: 110 },
  { name: 'Phapar ko Dhindo (buckwheat)', name_ne: 'फापरको दिँडो', category: 'staple', typical_portion_g: 250, carbs_g: 48, protein_g: 9, fat_g: 2, calories: 245 },
  { name: 'Gundruk ko Jhol (soup)', name_ne: 'गुन्द्रुकको झोल', category: 'curry', typical_portion_g: 200, carbs_g: 8, protein_g: 2, fat_g: 1, calories: 50 },
  { name: 'Gundruk Sadeko', name_ne: 'गुन्द्रुक सदेको', category: 'snack', typical_portion_g: 80, carbs_g: 6, protein_g: 3, fat_g: 2, calories: 55 },
  { name: 'Sinki ko Achar (fermented radish)', name_ne: 'सिन्कीको अचार', category: 'curry', typical_portion_g: 40, carbs_g: 3, protein_g: 1, fat_g: 1, calories: 25 },
  { name: 'Kwati (mixed bean soup)', name_ne: 'क्वाँटी', category: 'curry', typical_portion_g: 200, carbs_g: 28, protein_g: 12, fat_g: 4, calories: 195 },
  { name: 'Masyaura Curry (sun-dried lentil)', name_ne: 'मस्यौरा', category: 'curry', typical_portion_g: 150, carbs_g: 15, protein_g: 10, fat_g: 8, calories: 175 },
  // ── Curries & proteins ──
  { name: 'Paneer Tarkari', name_ne: 'पनीर तरकारी', category: 'curry', typical_portion_g: 150, carbs_g: 8, protein_g: 12, fat_g: 14, calories: 210 },
  { name: 'Paneer (cottage cheese)', name_ne: 'पनीर', category: 'protein', typical_portion_g: 100, carbs_g: 3, protein_g: 18, fat_g: 20, calories: 265 },
  { name: 'Khasi ko Masu (goat curry)', name_ne: 'खसीको मासु', category: 'curry', typical_portion_g: 120, carbs_g: 3, protein_g: 24, fat_g: 14, calories: 235 },
  { name: 'Ranga ko Masu (buffalo)', name_ne: 'राँगाको मासु', category: 'curry', typical_portion_g: 120, carbs_g: 2, protein_g: 22, fat_g: 16, calories: 240 },
  { name: 'Machha Bhuteko (fried fish)', name_ne: 'भुटेको माछा', category: 'protein', typical_portion_g: 120, carbs_g: 2, protein_g: 24, fat_g: 10, calories: 200 },
  { name: 'Anda Curry (egg curry)', name_ne: 'अण्डाको झोल', category: 'curry', typical_portion_g: 150, carbs_g: 6, protein_g: 12, fat_g: 12, calories: 180 },
  { name: 'Bhatmas Sadeko (soybean)', name_ne: 'भटमास सदेको', category: 'snack', typical_portion_g: 60, carbs_g: 15, protein_g: 20, fat_g: 12, calories: 250 },
  { name: 'Saag (leafy greens)', name_ne: 'साग', category: 'curry', typical_portion_g: 120, carbs_g: 8, protein_g: 4, fat_g: 3, calories: 75 },
  { name: 'Rato Saag (red amaranth)', name_ne: 'रातो साग', category: 'curry', typical_portion_g: 120, carbs_g: 7, protein_g: 4, fat_g: 2, calories: 65 },
  { name: 'Karela Tarkari (bitter gourd)', name_ne: 'करेला तरकारी', category: 'curry', typical_portion_g: 120, carbs_g: 10, protein_g: 3, fat_g: 4, calories: 90 },
  { name: 'Farsi (pumpkin)', name_ne: 'फर्सी', category: 'curry', typical_portion_g: 120, carbs_g: 14, protein_g: 2, fat_g: 2, calories: 80 },
  { name: 'Iskus (chayote)', name_ne: 'इस्कुस', category: 'curry', typical_portion_g: 120, carbs_g: 9, protein_g: 2, fat_g: 2, calories: 60 },
  { name: 'Mula Tarkari (radish)', name_ne: 'मुला तरकारी', category: 'curry', typical_portion_g: 120, carbs_g: 8, protein_g: 2, fat_g: 2, calories: 55 },
  { name: 'Gajar (carrot)', name_ne: 'गाजर', category: 'veg', typical_portion_g: 100, carbs_g: 10, protein_g: 1, fat_g: 0, calories: 45 },
  { name: 'Kakro (cucumber)', name_ne: 'काक्रो', category: 'veg', typical_portion_g: 100, carbs_g: 4, protein_g: 1, fat_g: 0, calories: 18 },
  // ── Street food & snacks ──
  { name: 'Chana Chatpate', name_ne: 'चना चटपटे', category: 'snack', typical_portion_g: 100, carbs_g: 30, protein_g: 8, fat_g: 6, calories: 210 },
  { name: 'Chatpate', name_ne: 'चटपटे', category: 'snack', typical_portion_g: 100, carbs_g: 35, protein_g: 5, fat_g: 6, calories: 215 },
  { name: 'Samosa', name_ne: 'समोसा', category: 'snack', typical_portion_g: 80, carbs_g: 30, protein_g: 5, fat_g: 12, calories: 250 },
  { name: 'Pakora (vegetable fritters)', name_ne: 'पकौडा', category: 'snack', typical_portion_g: 100, carbs_g: 25, protein_g: 5, fat_g: 15, calories: 260 },
  { name: 'Aloo Chop', name_ne: 'आलु चप', category: 'snack', typical_portion_g: 80, carbs_g: 28, protein_g: 4, fat_g: 12, calories: 240 },
  { name: 'Puri', name_ne: 'पुरी', category: 'staple', typical_portion_g: 60, carbs_g: 30, protein_g: 4, fat_g: 9, calories: 220 },
  { name: 'Bara (lentil patty)', name_ne: 'बारा', category: 'snack', typical_portion_g: 100, carbs_g: 25, protein_g: 8, fat_g: 8, calories: 205 },
  { name: 'Gwaramari', name_ne: 'ग्वारामरी', category: 'snack', typical_portion_g: 60, carbs_g: 25, protein_g: 3, fat_g: 8, calories: 185 },
  { name: 'Sukuti Sadeko (dried meat)', name_ne: 'सुकुटी सदेको', category: 'snack', typical_portion_g: 50, carbs_g: 2, protein_g: 20, fat_g: 8, calories: 160 },
  { name: 'Thukpa (noodle soup)', name_ne: 'थुक्पा', category: 'meal', typical_portion_g: 350, carbs_g: 45, protein_g: 15, fat_g: 6, calories: 290 },
  { name: 'Chowmein', name_ne: 'चाउमिन', category: 'meal', typical_portion_g: 250, carbs_g: 50, protein_g: 10, fat_g: 12, calories: 350 },
  { name: 'Wai Wai (instant noodles)', name_ne: 'वाई वाई', category: 'snack', typical_portion_g: 80, carbs_g: 45, protein_g: 8, fat_g: 18, calories: 370 },
  { name: 'Bhuteko Chana (roasted gram)', name_ne: 'भुटेको चना', category: 'snack', typical_portion_g: 40, carbs_g: 24, protein_g: 7, fat_g: 3, calories: 150 },
  { name: 'Yomari', name_ne: 'योमरी', category: 'snack', typical_portion_g: 90, carbs_g: 40, protein_g: 4, fat_g: 6, calories: 230 },
  // ── Dairy & desserts ──
  { name: 'Kheer (rice pudding)', name_ne: 'खीर', category: 'dessert', typical_portion_g: 150, carbs_g: 35, protein_g: 5, fat_g: 7, calories: 220 },
  { name: 'Gajar Halwa', name_ne: 'गाजरको हलुवा', category: 'dessert', typical_portion_g: 120, carbs_g: 30, protein_g: 4, fat_g: 9, calories: 210 },
  { name: 'Juju Dhau (Bhaktapur yogurt)', name_ne: 'जुजु धौ', category: 'dairy', typical_portion_g: 150, carbs_g: 12, protein_g: 5, fat_g: 6, calories: 125 },
  { name: 'Mohi (buttermilk)', name_ne: 'मोही', category: 'drink', typical_portion_g: 200, carbs_g: 6, protein_g: 3, fat_g: 1, calories: 45 },
  { name: 'Lassi', name_ne: 'लस्सी', category: 'drink', typical_portion_g: 200, carbs_g: 20, protein_g: 5, fat_g: 5, calories: 150 },
  { name: 'Chhurpi (hard cheese)', name_ne: 'छुर्पी', category: 'dairy', typical_portion_g: 30, carbs_g: 1, protein_g: 18, fat_g: 1, calories: 85 },
  { name: 'Gulab Jamun', name_ne: 'गुलाब जामुन', category: 'dessert', typical_portion_g: 50, carbs_g: 25, protein_g: 2, fat_g: 5, calories: 155 },
  { name: 'Rasbari', name_ne: 'रसबरी', category: 'dessert', typical_portion_g: 50, carbs_g: 20, protein_g: 3, fat_g: 4, calories: 130 },
  // ── Fruits & nuts ──
  { name: 'Aap (mango)', name_ne: 'आँप', category: 'fruit', typical_portion_g: 150, carbs_g: 25, protein_g: 1, fat_g: 0, calories: 100 },
  { name: 'Mewa (papaya)', name_ne: 'मेवा', category: 'fruit', typical_portion_g: 150, carbs_g: 16, protein_g: 1, fat_g: 0, calories: 65 },
  { name: 'Anar (pomegranate)', name_ne: 'अनार', category: 'fruit', typical_portion_g: 150, carbs_g: 22, protein_g: 2, fat_g: 0, calories: 95 },
  { name: 'Litchi', name_ne: 'लिची', category: 'fruit', typical_portion_g: 100, carbs_g: 17, protein_g: 1, fat_g: 0, calories: 66 },
  { name: 'Badam (almonds)', name_ne: 'बदाम', category: 'snack', typical_portion_g: 25, carbs_g: 5, protein_g: 6, fat_g: 13, calories: 160 },
  { name: 'Kaju (cashews)', name_ne: 'काजु', category: 'snack', typical_portion_g: 25, carbs_g: 8, protein_g: 4, fat_g: 12, calories: 155 },
  { name: 'Ghiu (ghee)', name_ne: 'घिउ', category: 'fat', typical_portion_g: 10, carbs_g: 0, protein_g: 0, fat_g: 10, calories: 90 },
];

export function searchNepaliFoods(query: string): NepaliFoodItem[] {
  const q = query.toLowerCase();
  return NEPALI_FOODS.filter(f =>
    f.name.toLowerCase().includes(q) ||
    f.name_ne.includes(q)
  ).slice(0, 10);
}
