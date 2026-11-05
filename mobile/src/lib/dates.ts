/** Local calendar date as YYYY-MM-DD. Streaks follow the student's day, not UTC. */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return localDateKey(new Date(y, m - 1, d + days));
}

/** The last `count` days ending today, oldest first. */
export function lastNDays(count: number, today: string = localDateKey()): string[] {
  return Array.from({ length: count }, (_, i) => addDays(today, i - (count - 1)));
}
