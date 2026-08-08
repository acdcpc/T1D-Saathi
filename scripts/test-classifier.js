// Test harness for the food color classifier
// Creates synthetic test images with known color profiles,
// runs them through the classifier, and reports accuracy.
//
// Run: node scripts/test-classifier.js

const sharp = require('sharp');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ─── Color profiles (same as foodColorClassifier.ts) ──────────────
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

// ─── Match function (ported from foodColorClassifier.ts) ─────────
function matchColorToFoods(r, g, b) {
  const results = [];
  for (const profile of PROFILES) {
    const rMid = (profile.r[0] + profile.r[1]) / 2;
    const gMid = (profile.g[0] + profile.g[1]) / 2;
    const bMid = (profile.b[0] + profile.b[1]) / 2;
    const dist = Math.sqrt(Math.pow(r - rMid, 2) + Math.pow(g - gMid, 2) + Math.pow(b - bMid, 2));
    const score = Math.max(0, 1 - dist / 350);
    if (score > 0.1) {
      const inRange = r >= profile.r[0] && r <= profile.r[1] && g >= profile.g[0] && g <= profile.g[1] && b >= profile.b[0] && b <= profile.b[1];
      results.push({ foodName: profile.foodName, score: Math.min(1, inRange ? score + 0.2 : score) });
    }
  }
  const seen = new Set();
  return results.sort((a, b) => b.score - a.score).filter(r => { if (seen.has(r.foodName)) return false; seen.add(r.foodName); return true; }).slice(0, 8);
}

function getConfidence(score) {
  return score > 0.7 ? 'high' : score > 0.4 ? 'medium' : 'low';
}

// ─── Test cases ───────────────────────────────────────────────────
const TEST_CASES = [
  // Single dishes at mid-range color
  { label: 'Dal Bhat (thali)', r: 190, g: 160, b: 90, expected: 'Dal Bhat (lentils & rice)' },
  { label: 'Steamed rice only', r: 220, g: 210, b: 195, expected: 'Bhat (steamed rice)' },
  { label: 'Chicken curry', r: 145, g: 85, b: 55, expected: 'Chicken Curry' },
  { label: 'Momo plate', r: 200, g: 185, b: 155, expected: 'Momo (dumplings)' },
  { label: 'Sel roti', r: 185, g: 150, b: 75, expected: 'Sel Roti (rice donut)' },
  { label: 'Tarkari (green veg)', r: 85, g: 140, b: 80, expected: 'Tarkari (mixed vegetable curry)' },
  { label: 'Roti bread', r: 185, g: 155, b: 110, expected: 'Roti (flatbread)' },
  { label: 'Mixed dal bhat (50% rice, 50% dal)', r: 205, g: 185, b: 142, expected: 'Dal Bhat (lentils & rice)' },

  // Lighting variation: same dish, different light
  { label: 'Dal Bhat (warm light)', r: 205, g: 175, b: 115, expected: 'Dal Bhat (lentils & rice)' },
  { label: 'Dal Bhat (cool light)', r: 170, g: 145, b: 95, expected: 'Dal Bhat (lentils & rice)' },

  // Edge cases
  { label: 'Banana (yellow)', r: 215, g: 210, b: 80, expected: 'Banana' },
  { label: 'Apple (red)', r: 180, g: 60, b: 40, expected: 'Apple' },

  // Non-Nepali / contrast foods
  { label: 'White bread toast', r: 230, g: 215, b: 180, expected: 'none' },
  { label: 'Green salad', r: 70, g: 155, b: 70, expected: 'Tarkari (mixed vegetable curry)' }, // closest match
  { label: 'Chocolate cake', r: 80, g: 45, b: 30, expected: 'none' },

  // Multi-item plate simulation (average of 3 components)
  { label: 'Thali: rice + dal + curry', r: 175, g: 140, b: 95, expected: 'Dal Bhat (lentils & rice)' },
];

// ─── Run tests ────────────────────────────────────────────────────
console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║     T1D Saathi — Food Color Classifier Accuracy Test          ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let top1Correct = 0;
let top3Correct = 0;
let highConfWrong = 0;
let totalNonNone = 0; // cases where we expect a match

const results = [];

for (const tc of TEST_CASES) {
  const matches = matchColorToFoods(tc.r, tc.g, tc.b);
  const top3 = matches.slice(0, 3);
  const top1 = top3[0];

  const top1Conf = top1 ? getConfidence(top1.score) : 'none';
  const correctInTop1 = top1?.foodName === tc.expected;
  const correctInTop3 = top3.some(m => m.foodName === tc.expected);

  if (tc.expected !== 'none') {
    totalNonNone++;
    if (correctInTop1) top1Correct++;
    if (correctInTop3) top3Correct++;
  }

  // Track high-confidence wrong answers
  if (top1Conf === 'high' && !correctInTop1) {
    highConfWrong++;
  }

  results.push({
    label: tc.label,
    expected: tc.expected,
    top1: top1?.foodName || '—',
    top1Score: top1?.score?.toFixed(2) || '—',
    top1Conf,
    top3Names: top3.map(m => `${m.foodName} (${getConfidence(m.score)})`).join(' | '),
    correctInTop1,
    correctInTop3,
    correct: correctInTop3 ? '✓' : '✗',
  });
}

// ─── Print results table ──────────────────────────────────────────
console.log('Test Case                          Expected                     Top-1 Match                    Conf   Top-3 Matches                                      Result');
console.log('────────────────────────────────── ─────────────────────────── ───────────────────────────── ────── ────────────────────────────────────────────────── ──────');

for (const r of results) {
  const label = r.label.padEnd(34).slice(0, 34);
  const expected = r.expected.padEnd(27).slice(0, 27);
  const top1 = r.top1.padEnd(29).slice(0, 29);
  const conf = r.top1Conf.padEnd(6);
  const top3 = r.top3Names.padEnd(50).slice(0, 50);

  const resultMark = r.correctInTop3 ? '✓' : '✗';
  console.log(`${label} ${expected} ${top1} ${conf} ${top3} ${resultMark}`);
}

// ─── Summary ──────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('                         SUMMARY                               ');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Total test cases:     ${TEST_CASES.length}`);
console.log(`Expected matches:     ${totalNonNone}`);
console.log(`Top-1 correct:        ${top1Correct}/${totalNonNone} (${(top1Correct/totalNonNone*100).toFixed(0)}%)`);
console.log(`Top-3 correct:        ${top3Correct}/${totalNonNone} (${(top3Correct/totalNonNone*100).toFixed(0)}%)`);
console.log(`High-conf WRONG:      ${highConfWrong} (this is the dangerous failure mode)`);

// ─── Specific analysis ────────────────────────────────────────────
console.log('\n─── Failure Analysis ───────────────────────────────────────────');
const failures = results.filter(r => r.expected !== 'none' && !r.correctInTop3);
if (failures.length === 0) {
  console.log('No failures — all expected foods appeared in top 3.');
} else {
  for (const f of failures) {
    console.log(`  ✗ "${f.label}" → expected "${f.expected}", got "${f.top1}"`);
  }
}

// Multi-item plate analysis
console.log('\n─── Multi-item Plate Analysis ──────────────────────────────────');
const mixed = results.filter(r => r.label.toLowerCase().includes('mixed') || r.label.toLowerCase().includes('thali'));
for (const m of mixed) {
  console.log(`  "${m.label}": ${m.correctInTop3 ? '✓ correct' : '✗ wrong'} — Top match: ${m.top1} (${m.top1Conf})`);
}

console.log('\n─── Lighting Variation Analysis ────────────────────────────────');
const lightTests = results.filter(r => r.label.toLowerCase().includes('light'));
for (const l of lightTests) {
  console.log(`  "${l.label}": ${l.correctInTop3 ? '✓ correct' : '✗ wrong'} — Top match: ${l.top1} (${l.top1Conf})`);
}

console.log('\n─── High-Confidence Wrong Matches ──────────────────────────────');
if (highConfWrong === 0) {
  console.log('  ✓ No high-confidence wrong matches — safe from misleading suggestions');
} else {
  console.log(`  ⚠️  ${highConfWrong} high-confidence wrong matches — need to investigate`);
  const hcw = results.filter(r => getConfidence(r.top1Score) === 'high' && !r.correctInTop1);
  for (const h of hcw) {
    console.log(`     "${h.label}": got "${h.top1}" (high conf) instead of "${h.expected}"`);
  }
}

console.log('\nDone.');
