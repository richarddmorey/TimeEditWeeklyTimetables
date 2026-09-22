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
 * X moves straight from column i to column j. That only disturbs anything
 * else if column j is already occupied by an event overlapping X in time —
 * an empty (or non-overlapping) target column means X simply relocates and
 * nothing else needs to move.
 *
 * When column j *is* occupied, the occupant(s) are bumped one column at a
 * time, always in the same direction (opposite to X's own direction of
 * travel, i.e. back towards X's old column). Each bumped event then checks
 * *its own* new column for a further conflict, and so on, until a step lands
 * on a column with no overlapping occupant. This walks only the contiguous
 * chain of genuine conflicts — it never touches a column that was never
 * actually blocking anything, even if that column happens to sit between i
 * and j and contains an event that overlaps X in time.
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

  const dir = Math.sign(j - i);   // direction X travelled
  const shiftDir = -dir;          // fixed direction bumped occupants travel

  const visited = new Set<CalendarEvent>([X]);
  let shiftedAnyEvent = false;
  X.col = j;

  const queue: CalendarEvent[] = [X];
  while (queue.length) {
    const mover = queue.shift()!;
    const moverCol = mover.col || 1;

    // Only events actually sitting in the mover's newly-claimed column and
    // overlapping it in time are genuine blockers.
    const blockers = events.filter(ev =>
      !visited.has(ev) &&
      ev !== mover &&
      (ev.col || 1) === moverCol &&
      overlaps(ev, mover)
    );

    for (const ev of blockers) {
      const evNew = moverCol + shiftDir;
      if (evNew < 1) continue; // cannot shift past column 1
      ev.col = evNew;
      visited.add(ev);
      shiftedAnyEvent = true;
      queue.push(ev);
    }
  }

  if (shiftedAnyEvent) densifyColumns(events);
  return true;
}

/**
 * Collapses empty (from this event's point of view, non-conflicting) column
 * gaps within a single day, sweeping columns left to right.
 *
 * For each column `c` from 2 upward, every event currently at column `c` is
 * repeatedly shifted one column left as long as the column immediately to
 * its left has no event overlapping it in time. Because columns are
 * processed in ascending order, by the time column `c` is handled every
 * lower column has already been fully compacted, so a single left-to-right
 * sweep is enough — no further passes are needed.
 *
 * Returns true if anything moved (in which case columns are also
 * densified to remove any resulting gaps).
 */
export function collapseColumns(events: CalendarEvent[]): boolean {
  if (!events || events.length <= 1) return false;

  const maxCol = Math.max(1, ...events.map(e => e.col || 1));
  if (maxCol <= 1) return false; // single-column day

  let movedAny = false;
  for (let c = 2; c <= maxCol; c++) {
    const colEvents = events.filter(ev => (ev.col || 1) === c);
    for (const ev of colEvents) {
      let cur = ev.col || 1;
      while (cur > 1) {
        const target = cur - 1;
        const blocked = events.some(o =>
          o !== ev && (o.col || 1) === target && overlaps(o, ev));
        if (blocked) break;
        cur = target;
        movedAny = true;
      }
      ev.col = cur;
    }
  }

  if (movedAny) densifyColumns(events);
  return movedAny;
}
