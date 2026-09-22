import { DAYS_TO_SHOW } from '../constants';
import { state } from '../state';
import { canCombine, combineEvents, densifyColumns, assignColumns, collapseColumns } from './columns';
import { render } from '../ui/render';
import type { CalendarEvent } from '../types';

export function combineAndRender(a: CalendarEvent, b: CalendarEvent): void {
  if (!canCombine(a, b) || !state.eventsByDay) return;
  const combined = combineEvents(a, b);
  const day = combined.weekday;
  state.eventsByDay[day] = state.eventsByDay[day].filter(e => e !== a && e !== b);
  state.eventsByDay[day].push(combined);
  densifyColumns(state.eventsByDay[day]);
  render();
}

export function breakApartAndRender(combinedEvent: CalendarEvent): void {
  if (!combinedEvent || !combinedEvent._combined || !state.eventsByDay) return;
  const day = combinedEvent.weekday;
  const parts = combinedEvent._parts!.slice();
  state.eventsByDay[day] = state.eventsByDay[day].filter(e => e !== combinedEvent);
  for (const p of parts) {
    delete p.col;
    delete p._parts;
    delete p._combined;
    state.eventsByDay[day].push(p);
  }
  assignColumns(state.eventsByDay[day]);
  densifyColumns(state.eventsByDay[day]);
  render();
}

export function deleteEventAndRender(ev: CalendarEvent): void {
  if (!ev || !state.eventsByDay) return;
  const day = ev.weekday;
  state.eventsByDay[day] = state.eventsByDay[day].filter(e => e !== ev);
  densifyColumns(state.eventsByDay[day]);
  render();
}

/**
 * Collapses empty column gaps to the left, independently for every weekday.
 * Triggered by the "Collapse empty columns" settings button.
 */
export function collapseColumnsAndRender(): void {
  if (!state.eventsByDay) return;
  let anyMoved = false;
  for (const day of DAYS_TO_SHOW) {
    if (collapseColumns(state.eventsByDay[day])) anyMoved = true;
  }
  if (anyMoved) render();
}
