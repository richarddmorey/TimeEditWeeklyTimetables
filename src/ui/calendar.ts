import { DAYS_TO_SHOW, WEEKDAY_COLOURS } from '../constants';
import { pad2 } from '../utils/date';
import { state } from '../state';
import { dom } from './dom';
import type { CalendarEvent } from '../types';

/** Attached to each rendered event cell so handlers can recover the event. */
export interface EventCellElement extends HTMLDivElement {
  _event?: CalendarEvent;
}

export function buildCalendarDOM(dayColCounts: Record<string, number>): void {
  const range = state.stateEndHour - state.stateBeginHour;
  const totalCols = 1 + DAYS_TO_SHOW.reduce(
    (s, wd) => s + Math.max(dayColCounts[wd] || 0, 1), 0);

  const container = dom.container;
  container.innerHTML = '';
  container.style.setProperty('--total-columns', String(totalCols));

  // Time gutter
  const timeCol = document.createElement('div');
  timeCol.className = 'cal_weekday';
  timeCol.style.setProperty('--col-count', '1');

  const timeLabel = document.createElement('div');
  timeLabel.className = 'cal_weekday_label';
  timeLabel.innerHTML = '&nbsp;';
  timeCol.appendChild(timeLabel);

  const timeCols = document.createElement('div');
  timeCols.className = 'cal_columns';
  const timeInner = document.createElement('div');
  timeInner.className = 'cal_column';
  for (let h = state.stateBeginHour; h < state.stateEndHour; h++) {
    const cell = document.createElement('div');
    cell.className = 'cal_cell cal_cell_time';
    cell.style.top = ((h - state.stateBeginHour) / range * 100) + '%';
    cell.style.height = (1 / range * 100) + '%';
    cell.textContent = pad2(h) + ':00';
    timeInner.appendChild(cell);
  }
  timeCols.appendChild(timeInner);
  timeCol.appendChild(timeCols);
  container.appendChild(timeCol);

  // Weekday columns
  for (const wd of DAYS_TO_SHOW) {
    const nCols = Math.max(dayColCounts[wd] || 0, 1);

    const dayCol = document.createElement('div');
    dayCol.className = 'cal_weekday';
    dayCol.style.setProperty('--col-count', String(nCols));
    dayCol.dataset.day = wd;

    const label = document.createElement('div');
    label.className = 'cal_weekday_label';
    label.textContent = wd.substring(0, 3);
    dayCol.appendChild(label);

    const colsDiv = document.createElement('div');
    colsDiv.className = 'cal_columns';

    const innerCols: HTMLDivElement[] = [];
    for (let i = 0; i < nCols; i++) {
      const inner = document.createElement('div');
      inner.className = 'cal_column';
      innerCols.push(inner);
      colsDiv.appendChild(inner);
    }

    for (const ev of state.eventsByDay![wd]) {
      const cell = createEventCell(ev);
      if (cell) innerCols[(ev.col || 1) - 1].appendChild(cell);
    }

    dayCol.appendChild(colsDiv);
    container.appendChild(dayCol);
  }

  dom.uploadView.style.display = 'none';
  dom.calendarView.style.display = 'block';
  applyDayColours();
}

function createEventCell(ev: CalendarEvent): EventCellElement | null {
  const range = state.stateEndHour - state.stateBeginHour;

  const visStart = Math.max(ev.startNum, state.stateBeginHour);
  const visEnd = Math.min(ev.startNum + ev.duration, state.stateEndHour);
  if (visStart >= visEnd) return null;

  const cell = document.createElement('div') as EventCellElement;
  cell.className = 'cal_cell';
  cell.draggable = true;

  if (ev.startNum < state.stateBeginHour) cell.classList.add('clipped-top');
  if (ev.startNum + ev.duration > state.stateEndHour) cell.classList.add('clipped-bottom');

  cell.style.top = ((visStart - state.stateBeginHour) / range * 100) + '%';
  cell.style.height = ((visEnd - visStart) / range * 100) + '%';

  const codeEl = document.createElement('div');
  codeEl.className = 'cal_cell_content cal_cell_content_code';
  codeEl.textContent = ev.moduleCode;

  const titleEl = document.createElement('div');
  titleEl.className = 'cal_cell_content cal_cell_content_type';
  titleEl.textContent = ev.eventTitle;

  const weeksEl = document.createElement('div');
  weeksEl.className = 'cal_cell_content cal_cell_content_weeks';
  weeksEl.textContent = ev.weekStr;

  cell.append(codeEl, titleEl, weeksEl);
  cell._event = ev;

  cell.dataset.search = [
    ev.moduleCode, ev.moduleName, ev.eventTitle,
    ev.eventType, ev.staffStr, ev.weekStr
  ].join(' ').toLowerCase();

  return cell;
}

function applyDayColours(): void {
  const weekdayEls = document.querySelectorAll<HTMLElement>('.cal_weekday');
  weekdayEls.forEach((el, idx) => {
    const header = el.querySelector<HTMLElement>('.cal_weekday_label');
    if (header) header.style.backgroundColor = WEEKDAY_COLOURS[idx] || '#FFFFFF';

    el.querySelectorAll<HTMLElement>('.cal_cell').forEach(c => {
      if (!c.classList.contains('cal_cell_time')) {
        c.style.backgroundColor = WEEKDAY_COLOURS[idx] || '#FFFFFF';
      }
    });
  });
}

export function getEventCells(): EventCellElement[] {
  return Array.from(document.querySelectorAll<EventCellElement>('.cal_cell:not(.cal_cell_time)'));
}

export function findCellForEvent(ev: CalendarEvent): EventCellElement | null {
  for (const c of getEventCells()) if (c._event === ev) return c;
  return null;
}
