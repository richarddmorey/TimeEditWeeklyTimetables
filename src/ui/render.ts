import { DAYS_TO_SHOW } from '../constants';
import { state } from '../state';
import { dom } from './dom';
import { assignColumns } from '../data/columns';
import { buildCalendarDOM } from './calendar';
import { applyTitleBorders, renderTitleCheckboxes } from './highlight';
import { applySearch } from './search';
import { closePopup } from './popup';

/**
 * Re-derives column layout and rebuilds the whole calendar DOM from
 * `state.eventsByDay`. Called after every mutation (combine, move, break
 * apart, delete, edit) and after loading a CSV.
 */
export function render(): void {
  if (!state.eventsByDay) return;

  const dayColCounts: Record<string, number> = {};
  for (const wd of DAYS_TO_SHOW) {
    state.eventsByDay[wd].sort((a, b) => a.startTotal - b.startTotal);
    dayColCounts[wd] = assignColumns(state.eventsByDay[wd]);
  }

  buildCalendarDOM(dayColCounts);
  applyTitleBorders();
  if (state.currentSearchQuery) applySearch(state.currentSearchQuery);

  if (dom.settingsPanel.classList.contains('open')) {
    renderTitleCheckboxes();
  }

  closePopup();
}
