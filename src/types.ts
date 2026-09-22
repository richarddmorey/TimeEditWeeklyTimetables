/**
 * A single timetable entry. Represents either one grouped CSV entry
 * (see data/csv.ts) or the result of combining several together
 * (see data/columns.ts `combineEvents`).
 */
export interface CalendarEvent {
  weekday: string;
  startTotal: number; // minutes since midnight
  endTotal: number;   // minutes since midnight
  startH: number;
  startM: number;
  endH: number;
  endM: number;
  startNum: number;   // start hour as a decimal, e.g. 9.5
  duration: number;   // hours, decimal
  durationStr: string;
  weeks: number[];
  weekStr: string;
  moduleCode: string;
  moduleName: string;
  eventTitle: string;
  eventType: string;
  staffStr: string;

  /** Sub-column within the day, assigned by the interval-colouring pass. */
  col?: number;

  /** Present only on combined events: the flat list of atomic parts. */
  _parts?: CalendarEvent[];
  /** True only on combined events. */
  _combined?: boolean;
}

export type EventsByDay = Record<string, CalendarEvent[]>;

/** A single row as produced by PapaParse from the TimeEdit CSV export. */
export type CsvRow = Record<string, string>;
