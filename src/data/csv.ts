import Papa from 'papaparse';
import { DAY_NAMES, DAYS_TO_SHOW } from '../constants';
import { parseDMY, sundayOf } from '../utils/date';
import { abbreviateStaff, abbrNumList, durationString, mergeTextValues, normaliseTitleAndType } from '../utils/text';
import type { CalendarEvent, CsvRow, EventsByDay } from '../types';
import { state } from '../state';

/** An intermediate, ungrouped event derived from one CSV row. */
interface RawEvent {
  weekday: string;
  weeknum: number;
  startH: number; startM: number;
  endH: number; endM: number;
  startTotal: number; endTotal: number;
  duration: number;
  moduleCode: string;
  moduleName: string;
  eventTitle: string;
  eventType: string;
  staffAbbr: string;
}

export function handleFile(file: File, onDone: () => void): void {
  Papa.parse<CsvRow>(file, {
    header: true,
    skipEmptyLines: 'greedy',
    beforeFirstChunk: (chunk: string) => {
      const lines = chunk.split(/\r?\n/);
      for (let i = 0; i < Math.min(12, lines.length); i++) {
        if (/^"?Begin date"?/i.test(lines[i])) return lines.slice(i).join('\n');
      }
      return chunk;
    },
    complete: (results) => {
      if (results.errors && results.errors.length) {
        console.warn('CSV parse warnings:', results.errors);
      }
      try {
        state.rawParsedRows = results.data;

        if (!state.week1UserModified) {
          let earliest: Date | null = null;
          for (const row of state.rawParsedRows) {
            const d = parseDMY(row['Begin date']);
            if (d && (!earliest || d < earliest)) earliest = d;
          }
          if (earliest) {
            state.week1Sunday = sundayOf(earliest);
            state.calPickerMonth = new Date(
              state.week1Sunday.getFullYear(),
              state.week1Sunday.getMonth(),
              1
            );
          }
        }

        processRows(state.rawParsedRows);
        onDone();
      } catch (err) {
        console.error(err);
        alert('Failed to process CSV: ' + (err as Error).message);
      }
    },
    error: (err: Error) => {
      alert('Error parsing CSV: ' + err.message);
    }
  });
}

/**
 * Filters, normalises and groups raw CSV rows into `state.eventsByDay`,
 * then widens the visible time range if needed. Also invoked whenever
 * Week 1 changes, since week numbers are computed relative to it.
 */
export function processRows(rows: CsvRow[]): void {
  const week1Ts = sundayOf(state.week1Sunday).getTime();
  const events: RawEvent[] = [];

  for (const row of rows) {
    const bd = row['Begin date'], bt = row['Begin time'];
    const ed = row['End date'], et = row['End time'];
    if (!bd || !bt || !ed || !et) continue;

    const startDate = parseDMY(bd);
    const endDate = parseDMY(ed);
    if (!startDate || !endDate) continue;
    if (startDate.getTime() !== endDate.getTime()) continue; // multi-day events dropped

    const [sh, sm] = String(bt).split(':').map(Number);
    const [eh, em] = String(et).split(':').map(Number);
    if ([sh, sm, eh, em].some(Number.isNaN)) continue;

    const startTotal = sh * 60 + sm;
    const endTotal = eh * 60 + em;
    if (endTotal <= startTotal) continue;

    const weekdayName = DAY_NAMES[startDate.getDay()];
    const eventSundayTs = sundayOf(startDate).getTime();
    const weeknum = Math.round((eventSundayTs - week1Ts) / (7 * 24 * 3600 * 1000)) + 1;

    const norm = normaliseTitleAndType(row['Title'], row['Activity Type']);

    events.push({
      weekday: weekdayName,
      weeknum,
      startH: sh, startM: sm,
      endH: eh, endM: em,
      startTotal, endTotal,
      duration: (endTotal - startTotal) / 60,
      moduleCode: row['Module Code'] || '',
      moduleName: row['Module Name'] || '',
      eventTitle: norm.title,
      eventType: norm.type,
      staffAbbr: abbreviateStaff(row['Staff'] || '')
    });
  }

  interface Group extends RawEvent {
    weeks: number[];
    staffAbbrs: string[];
  }

  const groups = new Map<string, Group>();
  for (const e of events) {
    const key = [e.weekday, e.startTotal, e.endTotal, e.moduleCode, e.eventTitle, e.eventType].join('||');
    let g = groups.get(key);
    if (!g) {
      g = { ...e, weeks: [], staffAbbrs: [] };
      groups.set(key, g);
    }
    g.weeks.push(e.weeknum);
    if (e.staffAbbr) g.staffAbbrs.push(e.staffAbbr);
  }

  const newByDay: EventsByDay = Object.fromEntries(DAYS_TO_SHOW.map(d => [d, []]));
  for (const g of groups.values()) {
    if (!newByDay[g.weekday]) continue;
    const weeks = g.weeks.slice().sort((a, b) => a - b);
    const event: CalendarEvent = {
      weekday: g.weekday,
      startTotal: g.startTotal,
      endTotal: g.endTotal,
      startH: g.startH, startM: g.startM,
      endH: g.endH, endM: g.endM,
      startNum: g.startTotal / 60,
      duration: (g.endTotal - g.startTotal) / 60,
      durationStr: durationString((g.endTotal - g.startTotal) / 60),
      weeks,
      weekStr: abbrNumList(weeks),
      moduleCode: g.moduleCode,
      moduleName: g.moduleName,
      eventTitle: g.eventTitle,
      eventType: g.eventType,
      staffStr: mergeTextValues(g.staffAbbrs)
    };
    newByDay[g.weekday].push(event);
  }

  state.eventsByDay = newByDay;
  autoExpandTimeRangeForEvents();
}

/**
 * Widens (never narrows) the visible time range to cover every loaded
 * event, rounding outward to whole hours.
 */
export function autoExpandTimeRangeForEvents(): void {
  if (!state.eventsByDay) return;
  let minH = Infinity, maxH = -Infinity;
  for (const wd of DAYS_TO_SHOW) {
    for (const ev of state.eventsByDay[wd]) {
      const s = ev.startH + ev.startM / 60;
      const e = ev.endH + ev.endM / 60;
      if (s < minH) minH = s;
      if (e > maxH) maxH = e;
    }
  }
  if (!isFinite(minH) || !isFinite(maxH)) return;

  const wantBegin = Math.floor(minH);
  const wantEnd = Math.ceil(maxH);
  if (wantBegin < state.stateBeginHour) state.stateBeginHour = wantBegin;
  if (wantEnd > state.stateEndHour) state.stateEndHour = wantEnd;
}
