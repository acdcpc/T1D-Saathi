// Real-photo accuracy test for food color classifier
// Processes actual food photos through the color matching pipeline
// Run: node scripts/test-real-photos.js

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// ─── Color profiles + matcher (identical to foodColorClassifier.ts) ──
const PROFILES = [
  { foodName: 'Bhat (steamed rice)', r: [180,255], g: [175,255], b: [140,255] },
  { foodName: 'Dahi/Curd (yogurt)', r: [200,255], g: [200,255], b: [180,255] },
  { foodName: 'Milk (whole)', r: [210,255], g: [210,255], b: [210,255] },
  { foodName: 'Momo (dumplings)', r: [170,240], g: [155,220], b: [120,200] },
  { foodName: 'Dal Bhat (lentils & rice)', r: [160,220], g: [130,200], b: [50,140] },
  { foodName: 'Dal (lentil soup)', r: [150,220], g: [120,200], b: [40,130] },
  { foodName: 'Sel Roti (rice donut)', r: [160,220], g: [120,190], b: [40,120] },
  { foodName: 'Egg (fried)', r: [170,240], g: [150,210], b: [40,150] },
  { foodName: 'Egg (boiled)', r: [200,255], g: [195,255], b: [140,200] },
  { foodName: 'Chicken Curry', r: [100,190], g: [50,120], b: [30,90] },
  { foodName: 'Aloo Tarkari (potato curry)', r: [140,210], g: [100,165], b: [50,130] },
  { foodName: 'Chana (chickpea curry)', r: [130,200], g: [90,160], b: [40,120] },
  { foodName: 'Tarkari (mixed vegetable curry)', r: [40,130], g: [100,180], b: [40,120] },
  { foodName: 'Roti (flatbread)', r: [150,220], g: [120,190], b: [60,160] },
  { foodName: 'Phapar ko Roti (buckwheat bread)', r: [80,160], g: [60,130], b: [30,100] },
  { foodName: 'Bhuja/Chiura (beaten rice)', r: [180,240], g: [170,230], b: [140,210] },
  { foodName: 'Jaulo (rice & lentil porridge)', r: [140,210], g: [120,185], b: [70,150] },
  { foodName: 'Khichadi (rice-lentil mix)', r: [130,200], g: [110,175], b: [60,140] },
  { foodName: 'Chiya (milk tea)', r: [100,175], g: [70,140], b: [40,100] },
  { foodName: 'Banana', r: [180,240], g: [180,235], b: [40,120] },
  { foodName: 'Apple', r: [140,220], g: [30,90], b: [20,70] },
  { foodName: 'Khajuri/Chaku (molasses candy)', r: [40,100], g: [20,60], b: [10,40] },
];

function matchColorToFoods(r, g, b) {
  const results = [];
  for (const p of PROFILES) {
    const rMid = (p.r[0]+p.r[1])/2, gMid = (p.g[0]+p.g[1])/2, bMid = (p.b[0]+p.b[1])/2;
    const dist = Math.sqrt((r-rMid)**2 + (g-gMid)**2 + (b-bMid)**2);
    const score = Math.max(0, 1 - dist/350);
    if (score > 0.1) {
      const inRange = r>=p.r[0]&&r<=p.r[1]&&g>=p.g[0]&&g<=p.g[1]&&b>=p.b[0]&&b<=p.b[1];
      const finalScore = inRange ? Math.min(1, score+0.2) : score;
      const clamped = dist > 120 ? Math.min(finalScore, 0.5) : finalScore;
      results.push({ foodName: p.foodName, score: clamped });
    }
  }
  const seen = new Set();
  return results.sort((a,b)=>b.score-a.score).filter(r=>{if(seen.has(r.foodName))return false;seen.add(r.foodName);return true}).slice(0,5);
}

function getConf(score) { return score > 0.85 ? 'high' : score > 0.55 ? 'medium' : 'low'; }

// ─── Test cases (real Unsplash photos) ───────────────────────────
const TESTS = [
  { file: 'dal-bhat-thali.jpg', label: 'Dal Bhat Thali (multi-item)', expected: 'Dal Bhat (lentils & rice)' },
  { file: 'dal.jpg', label: 'Dal (lentil soup)', expected: 'Dal (lentil soup)' },
  { file: 'rice.jpg', label: 'Steamed rice', expected: 'Bhat (steamed rice)' },
  { file: 'momo.jpg', label: 'Momo plate', expected: 'Momo (dumplings)' },
  { file: 'roti.jpg', label: 'Roti bread', expected: 'Roti (flatbread)' },
  { file: 'tarkari.jpg', label: 'Tarkari (veg curry)', expected: 'Tarkari (mixed vegetable curry)' },
  { file: 'chicken-curry.jpg', label: 'Chicken curry', expected: 'Chicken Curry' },
  { file: 'sel-roti.jpg', label: 'Sel roti/donuts', expected: 'Sel Roti (rice donut)' },
  { file: 'banana.jpg', label: 'Banana', expected: 'Banana' },
  { file: 'apple.jpg', label: 'Apple', expected: 'Apple' },
  { file: 'salad.jpg', label: 'Green salad', expected: 'Tarkari (mixed vegetable curry)' },
  { file: 'dal-bhat-alt.jpg', label: 'Dal Bhat (alt lighting)', expected: 'Dal Bhat (lentils & rice)' },
];

async function testPhoto(file, label, expected) {
  const filepath = path.join(__dirname, 'test-photos', file);
  if (!fs.existsSync(filepath)) return { label, expected, top1: 'FILE MISSING', correct: false, top3: [], highConfWrong: false, avgColor: null };

  const { data, info } = await sharp(filepath).resize(32, 32).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  let r=0, g=0, b=0;
  const total = info.width * info.height;
  for (let i=0; i<data.length; i+=4) { r+=data[i]; g+=data[i+1]; b+=data[i+2]; }
  const avgR=Math.round(r/total), avgG=Math.round(g/total), avgB=Math.round(b/total);

  const matches = matchColorToFoods(avgR, avgG, avgB);
  const top1 = matches[0];
  const top3 = matches.slice(0,3);

  const correctTop1 = top1?.foodName === expected;
  const correctTop3 = top3.some(m => m.foodName === expected);
  const highConfWrong = top1 && getConf(top1.score)==='high' && !correctTop1;

  return {
    label, expected,
    top1: top1 ? `${top1.foodName} (${getConf(top1.score)}, ${top1.score.toFixed(2)})` : '—',
    top3: top3.map(m => `${m.foodName} (${getConf(m.score)})`),
    correctTop1, correctTop3,
    highConfWrong,
    avgColor: { r: avgR, g: avgG, b: avgB }
  };
}

// ─── Run ─────────────────────────────────────────────────────────
(async () => {
  console.log('╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║   T1D Saathi — Food Color Classifier: REAL-PHOTO Accuracy Test          ║');
  console.log('║   Photos: real Unsplash images (NOT synthetic swatches)                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

  const results = [];
  for (const t of TESTS) {
    const r = await testPhoto(t.file, t.label, t.expected);
    results.push(r);
    const mark = r.correctTop3 ? '✓' : '✗';
    const hcw = r.highConfWrong ? ' ⚠️ HIGH-CONF WRONG' : '';
    console.log(`${mark} ${r.label.padEnd(28)} → ${r.top1.padEnd(50)} ${hcw}`);
    if (r.avgColor) console.log(`  avg RGB: (${r.avgColor.r}, ${r.avgColor.g}, ${r.avgColor.b}) — top-3: ${r.top3.join(' | ')}`);
    else console.log(`  ${r.top1}`);
  }

  const expectedMatches = results.filter(r => r.expected !== 'none');
  const top1Ok = expectedMatches.filter(r => r.correctTop1).length;
  const top3Ok = expectedMatches.filter(r => r.correctTop3).length;
  const hcwCount = results.filter(r => r.highConfWrong).length;

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    REAL-PHOTO ACCURACY                        ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Photos tested:        ${results.length}`);
  console.log(`Top-1 correct:        ${top1Ok}/${expectedMatches.length} (${(top1Ok/expectedMatches.length*100).toFixed(0)}%)`);
  console.log(`Top-3 correct:        ${top3Ok}/${expectedMatches.length} (${(top3Ok/expectedMatches.length*100).toFixed(0)}%)`);
  console.log(`High-conf WRONG:      ${hcwCount} ⚠️`);
  console.log('\nIMPORTANT: These are real-world numbers from actual food photos.');
  console.log('They differ from the earlier synthetic-swatch test (which was an');
  console.log('optimistic best case with ideal mid-range colors).');
})();
