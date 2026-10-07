# Food data — authoritative sources integration (2026-10-07)

Owner supplied four clinical nutrition sources; their values are now integrated into
`src/data/nepaliFoods.ts` — the food estimator's **primary** nutrition table. This file
records the sources, the method, every change, conflicts found, and open items.

## Sources (priority order used)

1. **Food composition table for Nepal, 2017** — via the clinic handout *"Food exchange
   list for 100 kcal"* (per-100-kcal exchange: weight + protein + carbohydrate).
   Tag: `Nepal FCT 2017`. (Handout references: Adhikari & Krantz 2001; Food composition
   table for Nepal, 2017.)
2. **Life for a Child — "Healthy eating and carbohydrate counting for children and
   adults with type 1 diabetes — Indian Foods, Edition 1, 2021"** (Sheryl Salis;
   Anna Pham-Short; Carmel Smart; Cecile Eigenmann; Graham Ogle) — carbohydrate values
   per pictured serving. Tag: `LfAC 2021`.
3. **"100 kcal options" + "6 g protein options"** clinic handouts — portion weights;
   used as cross-checks (e.g. momo 3 pcs = 50 g ≈ 100 kcal).
4. **T1DM CHO portions sheet** (paediatric clinic) — household measures
   (e.g. brown rice 60 g cooked; roti small = 35 g; chiura 1 handful = 20 g).

## Method

- **Source wins** over earlier in-house estimates (per owner instruction). Touched rows
  carry a `source` tag; untagged rows are earlier estimates awaiting cross-check.
- When a source sample portion ≠ the app's typical portion, values were **rescaled
  linearly** (density) and rounded to whole numbers —
  e.g. rice: 77 g per 100 kcal → 200 g portion = **260 kcal / 59 g carbs**.
- Where the source didn't state calories, `calories = 4·carbs + 4·protein + 9·fat`
  (keeps the calorie-sanity validator consistent; sourced rows agree within rounding).
- New foods keep the source's household portion as the app's "typical portion".

## Changes to existing foods

| Food | carbs (old→new) | kcal (old→new) | Source / note |
|---|---|---|---|
| Dal Bhat (lentils & rice) | 65 → 70 | 390 → 333 | Nepal FCT (rice + dal sum) |
| Bhat (steamed rice) | 56 → 59 | 260 → 260 | Nepal FCT |
| Dal (lentil soup) | 18 → 11 | 135 → 73 | Nepal FCT — see conflict #1 |
| Roti (flatbread) | 18 → 23 | 105 → 108 | Nepal FCT — see conflict #2 |
| Tarkari (mixed veg) | 12 → 11 | 105 → 92 | Nepal FCT |
| Aloo Tarkari | 25 → 28 | 170 → 178 | LfAC (carbs) |
| Momo (dumplings) | 30 → 29 | 240 → 258 | Nepal FCT (buff momo) |
| Chicken Curry | 5 → 3 | 220 → 208 | LfAC (carbs) |
| Chana (chickpea curry) | 22 → 26 | 155 → 154 | Nepal FCT |
| Dahi/Curd | 8 → 4 | 85 → 60 | LfAC (carbs) |
| Milk (whole) | 10 → 9 | 130 → 133 | Nepal FCT (cow milk) |
| Bhuja/Chiura | 60 → 64 | 270 → 296 | Nepal FCT |
| Phapar ko Roti | 28 → 16 | 140 → 93 | LfAC (carbs) |
| Khichadi | 50 → 38 | 305 → 254 | LfAC (carbs) |
| Egg (boiled) | 1 → 1 | 75 → 71 | Nepal FCT |
| Banana | 28 → 33 | 110 → 139 | Nepal FCT |
| Apple | 20 → 23 | 78 → 100 | Nepal FCT (portion 150 → 170 g) |
| Dhindo / Kodo / Phapar Dhindo | 45/42/48 → 56 | 240/220/245 → 278 | Nepal FCT (dhido exchange) |
| Makai Bhuteko | 21 → 22 | 110 → 97 | Nepal FCT |
| Machha Bhuteko (fried fish) | 2 → 5 | 200 → 275 (fat 10 → 22) | Nepal FCT (fried) |
| Bhatmas Sadeko | 15 → 18 | 250 → 286 | Nepal FCT |
| Pakora | 25 → 17 | 260 → 223 | LfAC (carbs) |
| Bhuteko Chana | 24 → 20 | 150 → 135 | LfAC (carbs) |
| Gulab Jamun | 25 → 17 | 155 → 121 | LfAC (without sugar syrup) |
| Rasbari | 20 → 19 | 130 → 124 | LfAC (carbs) |
| Aap (mango) | 25 → 25 | 100 → 111 | Nepal FCT |
| Anar | 22 → 22 | 95 → 97 | Nepal FCT |
| Litchi | 17 → 14 | 66 → 61 | Nepal FCT |

Confirmed without value change: **Samosa** (80 g → 30 g carbs, matches LfAC), **Puri**,
**Sel Roti** (tagged `LfAC 2021`).

## Foods added (34)

Brown Bread · White Bread · Corn Flakes · Oats · Sarvottam Pitho · Muesli · Brown Rice ·
Omelette · Chicken (cooked, skinless) · Veg Momo · Soup (chicken broth) · Watermelon ·
Orange · Grapes · Pineapple · Pear · Sugar Cane Juice · Biscuit (salty) · Muri ·
Sugar/Jaggery (1 tsp = 5 g carbs) · Aloo Paratha · Naan · Biryani · Pulao · Poha ·
Fried Rice · Pizza (slice) · Ice Cream · Milk Chocolate · Chocolate Cake · Potato Chips ·
Jalebi · Rasgulla · Besan Ladoo.

## Conflicts & resolutions

1. **Dal** — LfAC book: 15 g carbs/100 g (thick); Nepal FCT exchange: ~7.4 g/100 g
   (thin soup). → Nepal source used (app serves "lentil soup"); book value noted.
2. **Roti / chapati** — Nepal FCT: ~58 g carbs/100 g; LfAC: 37.5 g/100 g. → Nepal source
   used. (A 40 g roti ≈ 23 g carbs matches composition tables.)
3. **Banana** — LfAC "small 130 g → 15 g carbs" is inconsistent with composition tables
   (would be ~11 g/100 g). → Nepal source used (27 g/100 g).
4. **Papaya anomaly** — Nepal exchange row lists 2.4 g carbs per 312 g (expected ≈ 23 g:
   likely a print/scan artifact). → row **not updated**; old value kept pending
   dietitian confirmation.
5. **Momo** — buff & veg momo differ (24.5 vs 27.5 g carbs/100 g). Main "Momo" row uses
   buff (most common); a separate Veg Momo row was added.

## Estimated supplements (clearly flagged)

- **Brown Rice** — portion from the clinic sheet (60 g cooked); macros flagged `est.`
- Rows tagged `LfAC 2021 (carbs)`: carbs from the book; protein/fat/kcal retained or
  derived with rounding where the source is silent (flagged in the tag).

## Open items (next passes)

- Full transcription of the remaining book items (dosa/idli/puttu varieties, dhokla,
  Modak/Peda/Sandesh, international takeaway) — this pass focused on foods commonly
  eaten in Nepal + overlaps with the existing table.
- Confirm the "1 carbohydrate portion" definition on the T1DM CHO sheet (10 g? 15 g?)
  with the clinic so that sheet can formally drive portion sizes.
- Kiwi, strawberries, custard, biscuits beyond the salty exchange, and other items
  pending from the book's remaining pages.
- Dietitian sign-off: add to `docs/CLINICAL_SAFETY_LOG.md` review list.
