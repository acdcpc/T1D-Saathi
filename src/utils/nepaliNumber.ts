// Nepali (Devanagari) numeral formatting.
// NOTE: for safety-critical values (glucose, insulin dose) we keep Western digits
// to match glucometer/pump displays — see `toDisplayNumber`. Use `toNepaliNumber`
// for non-clinical UI numbers (dates, counts, percentages, stats).

const DEV = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

/** Convert Western digits in a string/number to Devanagari numerals. */
export function toNepaliNumber(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => DEV[Number(d)]);
}

/**
 * Format a number for display. `clinical` values stay in Western digits for safety;
 * everything else is localized to Devanagari when `ne` is true.
 */
export function toDisplayNumber(
  value: number | string,
  ne: boolean,
  opts: { clinical?: boolean } = {}
): string {
  if (!ne) return String(value);
  return opts.clinical ? String(value) : toNepaliNumber(value);
}
