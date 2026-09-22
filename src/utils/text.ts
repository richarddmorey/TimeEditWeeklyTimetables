import { TITLES_RE, MISSING_INFO } from '../constants';
import { pad2 } from './date';

export function escapeHtml(s: unknown): string {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function normaliseTitleAndType(
  rawTitle: string | null | undefined,
  rawType: string | null | undefined
): { title: string; type: string } {
  let title = (rawTitle || '').trim();
  let type = (rawType || '').trim();
  if (!title && !type) return { title: MISSING_INFO, type: MISSING_INFO };
  if (!title) title = type;
  if (!type) type = title;
  return { title, type };
}

/** "Dr Jane Smith" -> "J Smith" */
export function abbreviateName(s: string): string {
  if (!s) return '';
  const cleaned = String(s).replace(TITLES_RE, '').trim();
  const initM = cleaned.match(/^[A-Za-z]/);
  const lastM = cleaned.match(/[A-Za-z\-']+$/);
  if (!initM || !lastM) return '';
  return initM[0] + ' ' + lastM[0];
}

/** "Dr Jane Smith, Prof John Doe" -> "J Smith, J Doe" */
export function abbreviateStaff(staffStr: string): string {
  if (!staffStr || !String(staffStr).trim()) return '';
  return String(staffStr)
    .split(',')
    .map(s => abbreviateName(s.trim()))
    .filter(Boolean)
    .join(', ');
}

/**
 * Formats a (possibly negative) integer using the Unicode minus sign
 * (U+2212, "−") rather than the ASCII hyphen-minus, so it can't be
 * confused with the hyphen used as a range separator below.
 */
function formatSignedNum(n: number): string {
  return n < 0 ? `\u2212${-n}` : String(n);
}

/**
 * [1,2,3,5,8,9,10] -> "1—3,5,8—10"
 *
 * Week numbers may be zero or negative (weeks before "Week 1"). Negative
 * numbers are rendered with the Unicode minus sign ("−"), while range
 * separators use the longer em dash ("—") instead of a plain hyphen, so
 * the two are visually distinct and e.g. [-3,-2,-1,1] becomes
 * "−3—−1,1" without ambiguity between them.
 */
export function abbrNumList(nums: number[]): string {
  const x = [...new Set(nums)].sort((a, b) => a - b);
  if (x.length === 0) return '';
  if (x.length === 1) return formatSignedNum(x[0]);
  const groups: number[][] = [[x[0]]];
  for (let i = 1; i < x.length; i++) {
    if (x[i] === x[i - 1] + 1) groups[groups.length - 1].push(x[i]);
    else groups.push([x[i]]);
  }
  return groups
    .map(g => (g.length > 2
      ? `${formatSignedNum(g[0])}\u2014${formatSignedNum(g[g.length - 1])}`
      : g.map(formatSignedNum).join(',')))
    .join(',');
}

export function durationString(d: number): string {
  const totalMin = Math.round(d * 60);
  return `${Math.floor(totalMin / 60)}:${pad2(totalMin % 60)}`;
}

/** Splits each value on , / ;, trims, de-duplicates case-insensitively, rejoins. */
export function mergeTextValues(values: (string | null | undefined)[]): string {
  const items: string[] = [];
  const seen = new Set<string>();
  for (const v of values) {
    if (!v) continue;
    for (const raw of String(v).split(/[,;]/)) {
      const t = raw.trim();
      if (!t) continue;
      const key = t.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        items.push(t);
      }
    }
  }
  return items.join(', ');
}

export function mergeWeekArrays(arrays: (number[] | undefined)[]): number[] {
  const set = new Set<number>();
  for (const arr of arrays) for (const w of arr || []) set.add(w);
  return [...set].sort((a, b) => a - b);
}
