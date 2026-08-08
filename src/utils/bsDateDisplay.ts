// Bikram Sambat date display utility
// Converts AD/ISO timestamps to BS format for display in the UI
// Storage always remains AD/ISO; this is display-only.

import NepaliDate from 'nepali-date-converter';

/**
 * Convert an ISO timestamp or Date to a BS display string.
 * Returns format: "Bhadra 15, 2083 BS" or just the raw time if conversion fails.
 */
export function toBSDisplay(isoTimestamp: string | Date): string {
  try {
    const adDate = typeof isoTimestamp === 'string' ? new Date(isoTimestamp) : isoTimestamp;
    const bs = new NepaliDate(adDate);
    const months = [
      'Baishakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra',
      'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra',
    ];
    const month = months[bs.getMonth()]; // getMonth() is 0-indexed
    const day = bs.getDate();
    const year = bs.getYear();
    return `${month} ${day}, ${year} BS`;
  } catch {
    // Fallback to AD display if BS conversion fails
    const adDate = typeof isoTimestamp === 'string' ? new Date(isoTimestamp) : isoTimestamp;
    return adDate.toLocaleDateString();
  }
}

/**
 * Convert an ISO timestamp to a BS date + time display string.
 * Format: "Bhadra 15, 2083 BS · 2:45 PM"
 */
export function toBSDateTimeDisplay(isoTimestamp: string | Date): string {
  try {
    const adDate = typeof isoTimestamp === 'string' ? new Date(isoTimestamp) : isoTimestamp;
    const bsDate = toBSDisplay(adDate);
    const time = adDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${bsDate} · ${time}`;
  } catch {
    const adDate = typeof isoTimestamp === 'string' ? new Date(isoTimestamp) : isoTimestamp;
    return adDate.toLocaleString();
  }
}
