export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Parses a DD/MM/YYYY string (as exported by TimeEdit). Returns null if invalid. */
export function parseDMY(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = String(s).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return new Date(+m[3], +m[2] - 1, +m[1]);
}

/** Returns midnight on the Sunday of the week containing `date`. */
export function sundayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}
