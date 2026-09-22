import { DAYS_TO_SHOW } from '../constants';
import { state } from '../state';
import { dom } from './dom';
import { getEventCells } from './calendar';

export function collectAllTitles(): string[] {
  const titles = new Set<string>();
  if (!state.eventsByDay) return [];
  for (const wd of DAYS_TO_SHOW) {
    for (const ev of state.eventsByDay[wd]) {
      const parts = ev._parts || [ev];
      for (const p of parts) {
        if (p.eventTitle) titles.add(p.eventTitle);
      }
    }
  }
  return [...titles].sort();
}

export function applyTitleBorders(): void {
  for (const cell of getEventCells()) {
    const ev = cell._event;
    if (!ev) continue;
    const parts = ev._parts || [ev];
    const hasHighlight = parts.some(p => state.highlightedTitles.has(p.eventTitle));
    cell.classList.toggle('title-highlighted', hasHighlight);
  }
}

export function renderTitleCheckboxes(): void {
  const container = dom.titleCheckboxes;
  const titles = collectAllTitles();
  container.innerHTML = '';
  if (titles.length === 0) return;

  for (const t of titles) {
    const label = document.createElement('label');
    label.className = 'title-checkbox-label';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = state.highlightedTitles.has(t);
    cb.addEventListener('change', () => {
      if (cb.checked) state.highlightedTitles.add(t);
      else state.highlightedTitles.delete(t);
      applyTitleBorders();
    });
    cb.addEventListener('click', e => e.stopPropagation());

    const span = document.createElement('span');
    span.textContent = t;

    label.appendChild(cb);
    label.appendChild(span);
    container.appendChild(label);
  }
}
