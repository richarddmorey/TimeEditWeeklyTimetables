import type { CalendarEvent, EventsByDay } from '../types';
import { abbrNumList, mergeTextValues, mergeWeekArrays } from '../utils/text';

export function overlaps(a: CalendarEvent, b: CalendarEvent): boolean {
  return a.startTotal < b.endTotal && b.startTotal < a.endTotal;
}

export function canCombine(a: CalendarEvent | null, b: CalendarEvent | null): boolean {
  if (!a || !b || a === b) return false;
  return a.weekday === b.weekday
    && a.startTotal === b.startTotal
    && a.endTotal === b.endTotal;
}

export function combineEvents(a: CalendarEvent, b: CalendarEvent): CalendarEvent {
  const partsA = a._parts || [a];
  const partsB = b._parts || [b];
  const allParts = [...partsA, ...partsB];
  const weeks = mergeWeekArrays(allParts.map(p => p.weeks));

  return {
    weekday: a.weekday,
    startTotal: a.startTotal,
    endTotal: a.endTotal,
    startH: a.startH, startM: a.startM,
    endH: a.endH, endM: a.endM,
    startNum: a.startNum,
    duration: a.duration,
    durationStr: a.durationStr,
    weeks,
    weekStr: abbrNumList(weeks),
    moduleCode: mergeTextValues(allParts.map(p => p.moduleCode)),
    moduleName: mergeTextValues(allParts.map(p => p.moduleName)),
    eventTitle: mergeTextValues(allParts.map(p => p.eventTitle)),
    eventType: mergeTextValues(allParts.map(p => p.eventType)),
    staffStr: mergeTextValues(allParts.map(p => p.staffStr)),
    col: Math.min(a.col || 1, b.col || 1),
    _parts: allParts,
    _combined: true
  };
}

/**
 * Greedy interval-colouring pass. Preserves any existing `col` values (so
 * manual moves survive a re-render); only events without a `col` are
 * (re-)assigned. Returns the number of columns used.
 */
export function assignColumns(events: CalendarEvent[]): number {
  const cols: CalendarEvent[][] = [];

  for (const ev of events) {
    if (typeof ev.col === 'number' && ev.col >= 1) {
      const c = ev.col - 1;
      while (cols.length <= c) cols.push([]);
      cols[c].push(ev);
    }
  }

  for (const ev of events) {
    if (typeof ev.col === 'number' && ev.col >= 1) continue;
    let placed = false;
    for (let c = 0; c < cols.length; c++) {
      if (!cols[c].some(o => overlaps(ev, o))) {
        ev.col = c + 1;
        cols[c].push(ev);
        placed = true;
        break;
      }
    }
    if (!placed) {
      ev.col = cols.length + 1;
      cols.push([ev]);
    }
  }

  return cols.length;
}

/** Renumbers columns to be dense (1, 2, 3, ...) with no gaps. */
export function densifyColumns(events: CalendarEvent[]): void {
  const distinct = [...new Set(events.map(e => e.col || 1))].sort((a, b) => a - b);
  const remap = new Map<number, number>();
  distinct.forEach((c, i) => remap.set(c, i + 1));
  for (const ev of events) {
    ev.col = remap.get(ev.col || 1) || 1;
  }
}

/**
 * Move-and-repel cascade.
 *
 * When a cell moves from column i to column j:
 *   - if i < j (moved right): overlapping cells in columns (i, j] shift left
 *   - if i > j (moved left):  overlapping cells in columns [j, i) shift right
 *
 * Each shifted cell becomes a "mover" in its own right and its direction
 * flips again (opposite to the shift it just received), producing the
 * alternating cascade the spec describes.
 *
 * BFS with a `visited` set prevents infinite loops and double-shifting.
 */
export function moveEvent(
  eventsByDay: EventsByDay,
  day: string,
  X: CalendarEvent,
  targetCol: number
): boolean {
  const events = eventsByDay[day];
  if (!events || events.length <= 1) return false;

  const maxCol = Math.max(1, ...events.map(e => e.col || 1));
  if (maxCol <= 1) return false; // single-column day

  const j = Math.max(1, Math.min(maxCol, targetCol));
  const i = X.col || 1;
  if (i === j) return false;

  const visited = new Set<CalendarEvent>([X]);
  X.col = j;

  const queue: { mover: CalendarEvent; i: number; j: number }[] = [{ mover: X, i, j }];
  while (queue.length) {
    const { mover, i: mi, j: mj } = queue.shift()!;
    const dir = Math.sign(mj - mi); // direction the mover travelled
    const shiftDir = -dir;          // cells shift opposite to that

    const affected = events.filter(ev =>
      !visited.has(ev) &&
      ev !== mover &&
      overlaps(ev, mover) &&
      (dir > 0 ? (ev.col || 1) <= mj : (ev.col || 1) >= mj)
    );

    for (const ev of affected) {
      if (visited.has(ev)) continue;
      const evOld = ev.col || 1;
      const evNew = evOld + shiftDir;
      if (evNew < 1) continue; // cannot shift past column 1
      ev.col = evNew;
      visited.add(ev);
      queue.push({ mover: ev, i: evOld, j: evNew });
    }
  }

  densifyColumns(events);
  return true;
}
