import { DEFAULT_START_HOUR, DEFAULT_END_HOUR } from './constants';
import { sundayOf } from './utils/date';
import type { CalendarEvent, CsvRow, EventsByDay } from './types';

export interface AppState {
  eventsByDay: EventsByDay | null;
  stateBeginHour: number;
  stateEndHour: number;

  draggedEvent: CalendarEvent | null;
  draggedCell: HTMLElement | null;
  lastDropTarget: HTMLElement | null;

  currentSearchQuery: string;
  rawParsedRows: CsvRow[] | null;

  week1Sunday: Date;
  week1UserModified: boolean;
  calPickerMonth: Date;

  highlightedTitles: Set<string>;
}

/**
 * The original app hardcoded an initial Week 1 (4 Oct 2026); that value only
 * ever mattered before any CSV was loaded, because loading a CSV immediately
 * auto-detects Week 1 from the earliest event unless the user has already
 * picked one manually. We default to "this week" instead so the app behaves
 * sensibly no matter when it's built or opened.
 */
function initialWeek1(): Date {
  return sundayOf(new Date());
}

export const state: AppState = {
  eventsByDay: null,
  stateBeginHour: DEFAULT_START_HOUR,
  stateEndHour: DEFAULT_END_HOUR,

  draggedEvent: null,
  draggedCell: null,
  lastDropTarget: null,

  currentSearchQuery: '',
  rawParsedRows: null,

  week1Sunday: initialWeek1(),
  week1UserModified: false,
  calPickerMonth: (() => {
    const d = initialWeek1();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  })(),

  highlightedTitles: new Set<string>()
};
