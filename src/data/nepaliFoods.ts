// Nepali food database — Sano Bir (T1D साथी)
//
// AUTHORITATIVE SOURCES (integrated 2026-10-07; the local table is the PRIMARY
// nutrition source for the food estimator — external APIs are hints only):
//   1. Food composition table for Nepal, 2017 — via the clinic "Food exchange
//      list for 100 kcal" (weights, protein & carbohydrate per 100-kcal exchange).
//   2. Life for a Child — "Healthy eating and carbohydrate counting for children
//      and adults with type 1 diabetes — Indian Foods, Edition 1, 2021"
//      (carbohydrate values per pictured serving).
//   3. "100 kcal options" + "6 g protein options" handouts (portion weights).
//   4. T1DM CHO portions sheet (household measures / portion sizes, paediatric clinic).
//
// Rows touched by the integration carry a `source` tag; untagged rows are earlier
// in-house estimates and remain to be cross-checked. Method, conflicts and the
// full change log live in docs/FOOD_DATA_SOURCES_2026-10-07.md.

export interface NepaliFoodItem {
  name: string;
  name_ne: string;
  category: string;
  typical_portion_g: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  calories: number;
  /** Provenance of this row's values (see header). Untagged = earlier estimate. */
  source?: string;
}

export const NEPALI_FOODS: NepaliFoodItem[] = [
  { name: 'Dal Bhat (lentils & rice)', name_ne: 'दाल भात', category: 'meal', typical_portion_g: 350, carbs_g: 70, protein_g: 9, fat_g: 1, calories: 333, source: 'Nepal FCT 2017' },
  { name: 'Bhat (steamed rice)', name_ne: 'भात', category: 'staple', typical_portion_g: 200, carbs_g: 59, protein_g: 5, fat_g: 0, calories: 260, source: 'Nepal FCT 2017' },
  { name: 'Dal (lentil soup)', name_ne: 'दाल', category: 'curry', typical_portion_g: 150, carbs_g: 11, protein_g: 4, fat_g: 1, calories: 73, source: 'Nepal FCT 2017' },
  { name: 'Roti (flatbread)', name_ne: 'रोटी', category: 'staple', typical_portion_g: 40, carbs_g: 23, protein_g: 3, fat_g: 0, calories: 108, source: 'Nepal FCT 2017' },
  { name: 'Tarkari (mixed vegetable curry)', name_ne: 'तरकारी', category: 'curry', typical_portion_g: 150, carbs_g: 11, protein_g: 3, fat_g: 4, calories: 92, source: 'Nepal FCT 2017' },
  { name: 'Aloo Tarkari (potato curry)', name_ne: 'आलु तरकारी', category: 'curry', typical_portion_g: 150, carbs_g: 28, protein_g: 3, fat_g: 6, calories: 178, source: 'LfAC 2021 (carbs)' },
  { name: 'Momo (dumplings)', name_ne: 'म:म:', category: 'snack', typical_portion_g: 120, carbs_g: 29, protein_g: 14, fat_g: 9, calories: 258, source: 'Nepal FCT 2017' },
  { name: 'Chicken Curry', name_ne: 'कुखुराको मासु', category: 'curry', typical_portion_g: 120, carbs_g: 3, protein_g: 22, fat_g: 12, calories: 208, source: 'LfAC 2021 (carbs)' },
  { name: 'Sel Roti (rice donut)', name_ne: 'सेल रोटी', category: 'snack', typical_portion_g: 60, carbs_g: 30, protein_g: 3, fat_g: 8, calories: 210 },
  { name: 'Chana (chickpea curry)', name_ne: 'चना', category: 'curry', typical_portion_g: 120, carbs_g: 26, protein_g: 7, fat_g: 3, calories: 154, source: 'Nepal FCT 2017' },
  { name: 'Dahi/Curd (yogurt)', name_ne: 'दही', category: 'dairy', typical_portion_g: 100, carbs_g: 4, protein_g: 3, fat_g: 3, calories: 60, source: 'LfAC 2021 (carbs)' },
  { name: 'Chiya (milk tea)', name_ne: 'चिया', category: 'drink', typical_portion_g: 200, carbs_g: 12, protein_g: 2, fat_g: 3, calories: 85 },
  { name: 'Milk (whole)', name_ne: 'दुध', category: 'drink', typical_portion_g: 200, carbs_g: 9, protein_g: 6, fat_g: 8, calories: 133, source: 'Nepal FCT 2017' },
  { name: 'Bhuja/Chiura (beaten rice)', name_ne: 'चिउरा', category: 'staple', typical_portion_g: 80, carbs_g: 64, protein_g: 6, fat_g: 2, calories: 296, source: 'Nepal FCT 2017' },
  { name: 'Phapar ko Roti (buckwheat bread)', name_ne: 'फापरको रोटी', category: 'staple', typical_portion_g: 40, carbs_g: 16, protein_g: 5, fat_g: 1, calories: 93, source: 'LfAC 2021 (carbs)' },
  { name: 'Jaulo (rice & lentil porridge)', name_ne: 'जाउलो', category: 'meal', typical_portion_g: 250, carbs_g: 40, protein_g: 8, fat_g: 3, calories: 220 },
  { name: 'Khichadi (rice-lentil mix)', name_ne: 'खिचडी', category: 'meal', typical_portion_g: 300, carbs_g: 38, protein_g: 12, fat_g: 6, calories: 254, source: 'LfAC 2021 (carbs)' },
  { name: 'Egg (fried)', name_ne: 'अण्डा', category: 'protein', typical_portion_g: 55, carbs_g: 1, protein_g: 7, fat_g: 7, calories: 95 },
  { name: 'Egg (boiled)', name_ne: 'उसिनेको अण्डा', category: 'protein', typical_portion_g: 50, carbs_g: 1, protein_g: 7, fat_g: 5, calories: 71, source: 'Nepal FCT 2017' },
  { name: 'Banana', name_ne: 'केरा', category: 'fruit', typical_portion_g: 120, carbs_g: 33, protein_g: 2, fat_g: 0, calories: 139, source: 'Nepal FCT 2017' },
  { name: 'Apple', name_ne: 'स्याउ', category: 'fruit', typical_portion_g: 170, carbs_g: 23, protein_g: 0, fat_g: 0, calories: 100, source: 'Nepal FCT 2017' },
  { name: 'Khajuri/Chaku (molasses candy)', name_ne: 'चाकु', category: 'snack', typical_portion_g: 30, carbs_g: 22, protein_g: 1, fat_g: 0, calories: 90 },
  // ── Regional staples (Hill / Mountain / Terai) ──
  { name: 'Dhindo (millet porridge)', name_ne: 'दिँडो', category: 'staple', typical_portion_g: 250, carbs_g: 56, protein_g: 7, fat_g: 3, calories: 278, source: 'Nepal FCT 2017' },
  { name: 'Kodo ko Dhindo (finger millet)', name_ne: 'कोदोको दिँडो', category: 'staple', typical_portion_g: 250, carbs_g: 56, protein_g: 7, fat_g: 3, calories: 278, source: 'Nepal FCT 2017' },
  { name: 'Makai Bhat (corn rice)', name_ne: 'मकै भात', category: 'staple', typical_portion_g: 200, carbs_g: 50, protein_g: 6, fat_g: 2, calories: 250 },
  { name: 'Makai Bhuteko (roasted corn)', name_ne: 'भुटेको मकै', category: 'snack', typical_portion_g: 100, carbs_g: 22, protein_g: 3, fat_g: 0, calories: 97, source: 'Nepal FCT 2017' },
  { name: 'Phapar ko Dhindo (buckwheat)', name_ne: 'फापरको दिँडो', category: 'staple', typical_portion_g: 250, carbs_g: 56, protein_g: 7, fat_g: 3, calories: 278, source: 'Nepal FCT 2017' },
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
  { name: 'Machha Bhuteko (fried fish)', name_ne: 'भुटेको माछा', category: 'protein', typical_portion_g: 120, carbs_g: 5, protein_g: 14, fat_g: 22, calories: 275, source: 'Nepal FCT 2017' },
  { name: 'Anda Curry (egg curry)', name_ne: 'अण्डाको झोल', category: 'curry', typical_portion_g: 150, carbs_g: 6, protein_g: 12, fat_g: 12, calories: 180 },
  { name: 'Bhatmas Sadeko (soybean)', name_ne: 'भटमास सदेको', category: 'snack', typical_portion_g: 60, carbs_g: 18, protein_g: 23, fat_g: 13, calories: 286, source: 'Nepal FCT 2017' },
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
  { name: 'Samosa', name_ne: 'समोसा', category: 'snack', typical_portion_g: 80, carbs_g: 30, protein_g: 5, fat_g: 12, calories: 250, source: 'LfAC 2021' },
  { name: 'Pakora (vegetable fritters)', name_ne: 'पकौडा', category: 'snack', typical_portion_g: 100, carbs_g: 17, protein_g: 5, fat_g: 15, calories: 223, source: 'LfAC 2021 (carbs)' },
  { name: 'Aloo Chop', name_ne: 'आलु चप', category: 'snack', typical_portion_g: 80, carbs_g: 28, protein_g: 4, fat_g: 12, calories: 240 },
  { name: 'Puri', name_ne: 'पुरी', category: 'staple', typical_portion_g: 60, carbs_g: 30, protein_g: 4, fat_g: 9, calories: 220, source: 'LfAC 2021' },
  { name: 'Bara (lentil patty)', name_ne: 'बारा', category: 'snack', typical_portion_g: 100, carbs_g: 25, protein_g: 8, fat_g: 8, calories: 205 },
  { name: 'Gwaramari', name_ne: 'ग्वारामरी', category: 'snack', typical_portion_g: 60, carbs_g: 25, protein_g: 3, fat_g: 8, calories: 185 },
  { name: 'Sukuti Sadeko (dried meat)', name_ne: 'सुकुटी सदेको', category: 'snack', typical_portion_g: 50, carbs_g: 2, protein_g: 20, fat_g: 8, calories: 160 },
  { name: 'Thukpa (noodle soup)', name_ne: 'थुक्पा', category: 'meal', typical_portion_g: 350, carbs_g: 45, protein_g: 15, fat_g: 6, calories: 290 },
  { name: 'Chowmein', name_ne: 'चाउमिन', category: 'meal', typical_portion_g: 250, carbs_g: 50, protein_g: 10, fat_g: 12, calories: 350 },
  { name: 'Wai Wai (instant noodles)', name_ne: 'वाई वाई', category: 'snack', typical_portion_g: 80, carbs_g: 45, protein_g: 8, fat_g: 18, calories: 370 },
  { name: 'Bhuteko Chana (roasted gram)', name_ne: 'भुटेको चना', category: 'snack', typical_portion_g: 40, carbs_g: 20, protein_g: 7, fat_g: 3, calories: 135, source: 'LfAC 2021 (carbs)' },
  { name: 'Yomari', name_ne: 'योमरी', category: 'snack', typical_portion_g: 90, carbs_g: 40, protein_g: 4, fat_g: 6, calories: 230 },
  // ── Dairy & desserts ──
  { name: 'Kheer (rice pudding)', name_ne: 'खीर', category: 'dessert', typical_portion_g: 150, carbs_g: 35, protein_g: 5, fat_g: 7, calories: 220 },
  { name: 'Gajar Halwa', name_ne: 'गाजरको हलुवा', category: 'dessert', typical_portion_g: 120, carbs_g: 30, protein_g: 4, fat_g: 9, calories: 210 },
  { name: 'Juju Dhau (Bhaktapur yogurt)', name_ne: 'जुजु धौ', category: 'dairy', typical_portion_g: 150, carbs_g: 12, protein_g: 5, fat_g: 6, calories: 125 },
  { name: 'Mohi (buttermilk)', name_ne: 'मोही', category: 'drink', typical_portion_g: 200, carbs_g: 6, protein_g: 3, fat_g: 1, calories: 45 },
  { name: 'Lassi', name_ne: 'लस्सी', category: 'drink', typical_portion_g: 200, carbs_g: 20, protein_g: 5, fat_g: 5, calories: 150 },
  { name: 'Chhurpi (hard cheese)', name_ne: 'छुर्पी', category: 'dairy', typical_portion_g: 30, carbs_g: 1, protein_g: 18, fat_g: 1, calories: 85 },
  { name: 'Gulab Jamun', name_ne: 'गुलाब जामुन', category: 'dessert', typical_portion_g: 50, carbs_g: 17, protein_g: 2, fat_g: 5, calories: 121, source: 'LfAC 2021 (carbs)' },
  { name: 'Rasbari', name_ne: 'रसबरी', category: 'dessert', typical_portion_g: 50, carbs_g: 19, protein_g: 3, fat_g: 4, calories: 124, source: 'LfAC 2021 (carbs)' },
  // ── Fruits & nuts ──
  { name: 'Aap (mango)', name_ne: 'आँप', category: 'fruit', typical_portion_g: 150, carbs_g: 25, protein_g: 1, fat_g: 1, calories: 111, source: 'Nepal FCT 2017' },
  { name: 'Mewa (papaya)', name_ne: 'मेवा', category: 'fruit', typical_portion_g: 150, carbs_g: 16, protein_g: 1, fat_g: 0, calories: 65 },
  { name: 'Anar (pomegranate)', name_ne: 'अनार', category: 'fruit', typical_portion_g: 150, carbs_g: 22, protein_g: 2, fat_g: 0, calories: 97, source: 'Nepal FCT 2017' },
  { name: 'Litchi', name_ne: 'लिची', category: 'fruit', typical_portion_g: 100, carbs_g: 14, protein_g: 1, fat_g: 0, calories: 61, source: 'Nepal FCT 2017' },
  { name: 'Badam (almonds)', name_ne: 'बदाम', category: 'snack', typical_portion_g: 25, carbs_g: 5, protein_g: 6, fat_g: 13, calories: 160 },
  { name: 'Kaju (cashews)', name_ne: 'काजु', category: 'snack', typical_portion_g: 25, carbs_g: 8, protein_g: 4, fat_g: 12, calories: 155 },
  { name: 'Ghiu (ghee)', name_ne: 'घिउ', category: 'fat', typical_portion_g: 10, carbs_g: 0, protein_g: 0, fat_g: 10, calories: 90 },
  // ── Added from clinic sources (2026-10-07) ──
  { name: 'Brown Bread', name_ne: 'ब्राउन ब्रेड', category: 'staple', typical_portion_g: 41, carbs_g: 20, protein_g: 4, fat_g: 1, calories: 100, source: 'Nepal FCT 2017' },
  { name: 'White Bread', name_ne: 'सेतो पाउरोटी', category: 'staple', typical_portion_g: 34, carbs_g: 15, protein_g: 3, fat_g: 1, calories: 81, source: 'LfAC 2021 (carbs)' },
  { name: 'Corn Flakes', name_ne: 'कर्नफ्लेक्स', category: 'staple', typical_portion_g: 28, carbs_g: 23, protein_g: 2, fat_g: 0, calories: 100, source: 'Nepal FCT 2017' },
  { name: 'Oats', name_ne: 'ओट्स', category: 'staple', typical_portion_g: 30, carbs_g: 20, protein_g: 4, fat_g: 2, calories: 112, source: 'Nepal FCT 2017' },
  { name: 'Sarvottam Pitho (fortified porridge)', name_ne: 'सर्वोत्तम पिठो', category: 'staple', typical_portion_g: 25, carbs_g: 16, protein_g: 6, fat_g: 2, calories: 104, source: 'Nepal FCT 2017' },
  { name: 'Muesli (no sugar added)', name_ne: 'मुस्ली', category: 'staple', typical_portion_g: 40, carbs_g: 30, protein_g: 4, fat_g: 3, calories: 163, source: 'LfAC 2021 (carbs)' },
  { name: 'Brown Rice (cooked)', name_ne: 'ब्राउन राइस', category: 'staple', typical_portion_g: 60, carbs_g: 14, protein_g: 2, fat_g: 1, calories: 73, source: 'clinic CHO sheet (portion); macros est.' },
  { name: 'Omelette', name_ne: 'ओमलेट', category: 'protein', typical_portion_g: 58, carbs_g: 1, protein_g: 7, fat_g: 8, calories: 100, source: 'Nepal FCT 2017' },
  { name: 'Chicken (cooked, skinless)', name_ne: 'पाकेको कुखुराको मासु', category: 'protein', typical_portion_g: 70, carbs_g: 0, protein_g: 17, fat_g: 3, calories: 100, source: 'Nepal FCT 2017' },
  { name: 'Veg Momo (dumplings)', name_ne: 'तरकारी म:म:', category: 'snack', typical_portion_g: 120, carbs_g: 33, protein_g: 5, fat_g: 3, calories: 176, source: 'Nepal FCT 2017' },
  { name: 'Soup (chicken broth)', name_ne: 'सुप', category: 'curry', typical_portion_g: 250, carbs_g: 8, protein_g: 2, fat_g: 0, calories: 40, source: 'Nepal FCT 2017' },
  { name: 'Watermelon', name_ne: 'तरबुजा', category: 'fruit', typical_portion_g: 350, carbs_g: 12, protein_g: 1, fat_g: 1, calories: 56, source: 'Nepal FCT 2017' },
  { name: 'Orange', name_ne: 'सुन्तला', category: 'fruit', typical_portion_g: 208, carbs_g: 23, protein_g: 2, fat_g: 0, calories: 100, source: 'Nepal FCT 2017' },
  { name: 'Grapes', name_ne: 'अंगुर', category: 'fruit', typical_portion_g: 140, carbs_g: 24, protein_g: 1, fat_g: 0, calories: 100, source: 'Nepal FCT 2017' },
  { name: 'Pineapple', name_ne: 'भुइँ कटहर', category: 'fruit', typical_portion_g: 217, carbs_g: 23, protein_g: 1, fat_g: 0, calories: 100, source: 'Nepal FCT 2017' },
  { name: 'Pear', name_ne: 'नासपाती', category: 'fruit', typical_portion_g: 192, carbs_g: 23, protein_g: 1, fat_g: 0, calories: 100, source: 'Nepal FCT 2017' },
  { name: 'Sugar Cane Juice', name_ne: 'उखुको रस', category: 'drink', typical_portion_g: 250, carbs_g: 23, protein_g: 0, fat_g: 1, calories: 98, source: 'Nepal FCT 2017' },
  { name: 'Biscuit (salty)', name_ne: 'नुनिलो बिस्कुट', category: 'snack', typical_portion_g: 22, carbs_g: 16, protein_g: 1, fat_g: 3, calories: 100, source: 'Nepal FCT 2017' },
  { name: 'Muri (puffed rice)', name_ne: 'मुरी', category: 'snack', typical_portion_g: 23, carbs_g: 15, protein_g: 2, fat_g: 0, calories: 68, source: 'LfAC 2021 (carbs)' },
  { name: 'Sugar/Jaggery (1 tsp)', name_ne: 'चिनी/सखर (१ चम्चा)', category: 'sugar', typical_portion_g: 5, carbs_g: 5, protein_g: 0, fat_g: 0, calories: 20, source: 'LfAC 2021' },
  { name: 'Aloo Paratha', name_ne: 'आलु परौठा', category: 'staple', typical_portion_g: 80, carbs_g: 30, protein_g: 6, fat_g: 8, calories: 216, source: 'LfAC 2021 (carbs)' },
  { name: 'Naan', name_ne: 'नान', category: 'staple', typical_portion_g: 100, carbs_g: 50, protein_g: 8, fat_g: 6, calories: 286, source: 'LfAC 2021 (carbs)' },
  { name: 'Biryani (egg/chicken)', name_ne: 'बिरयानी', category: 'meal', typical_portion_g: 170, carbs_g: 30, protein_g: 7, fat_g: 8, calories: 220, source: 'LfAC 2021 (carbs)' },
  { name: 'Pulao', name_ne: 'पुलाउ', category: 'meal', typical_portion_g: 170, carbs_g: 30, protein_g: 5, fat_g: 8, calories: 212, source: 'LfAC 2021 (carbs)' },
  { name: 'Poha', name_ne: 'पोहा', category: 'meal', typical_portion_g: 80, carbs_g: 30, protein_g: 2, fat_g: 3, calories: 155, source: 'LfAC 2021 (carbs)' },
  { name: 'Fried Rice', name_ne: 'फ्राइड राइस', category: 'meal', typical_portion_g: 165, carbs_g: 45, protein_g: 6, fat_g: 8, calories: 276, source: 'LfAC 2021 (carbs)' },
  { name: 'Pizza (1 slice)', name_ne: 'पिज्जा', category: 'snack', typical_portion_g: 190, carbs_g: 39, protein_g: 9, fat_g: 12, calories: 300, source: 'LfAC 2021 (carbs)' },
  { name: 'Ice Cream', name_ne: 'आइसक्रिम', category: 'dessert', typical_portion_g: 85, carbs_g: 24, protein_g: 3, fat_g: 8, calories: 180, source: 'LfAC 2021 (carbs)' },
  { name: 'Milk Chocolate', name_ne: 'चकलेट', category: 'snack', typical_portion_g: 33, carbs_g: 18, protein_g: 2, fat_g: 10, calories: 170, source: 'LfAC 2021 (carbs)' },
  { name: 'Chocolate Cake', name_ne: 'चकलेट केक', category: 'dessert', typical_portion_g: 100, carbs_g: 46, protein_g: 5, fat_g: 12, calories: 312, source: 'LfAC 2021 (carbs)' },
  { name: 'Potato Chips', name_ne: 'चिप्स', category: 'snack', typical_portion_g: 27, carbs_g: 12, protein_g: 2, fat_g: 9, calories: 137, source: 'LfAC 2021 (carbs)' },
  { name: 'Jalebi', name_ne: 'जलेबी', category: 'dessert', typical_portion_g: 40, carbs_g: 22, protein_g: 1, fat_g: 5, calories: 137, source: 'LfAC 2021 (carbs)' },
  { name: 'Rasgulla', name_ne: 'रसगुल्ला', category: 'dessert', typical_portion_g: 40, carbs_g: 15, protein_g: 2, fat_g: 2, calories: 86, source: 'LfAC 2021 (carbs)' },
  { name: 'Besan Ladoo', name_ne: 'बेसनको लड्डु', category: 'dessert', typical_portion_g: 40, carbs_g: 31, protein_g: 4, fat_g: 9, calories: 221, source: 'LfAC 2021 (carbs)' },
];

export function searchNepaliFoods(query: string): NepaliFoodItem[] {
  const q = query.toLowerCase();
  return NEPALI_FOODS.filter(f =>
    f.name.toLowerCase().includes(q) ||
    f.name_ne.includes(q)
  ).slice(0, 10);
}
