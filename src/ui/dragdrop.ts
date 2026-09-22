import { DAYS_TO_SHOW } from '../constants';
import { state } from '../state';
import { dom } from './dom';
import { canCombine, moveEvent } from '../data/columns';
import { combineAndRender } from '../data/mutations';
import { showToast } from '../utils/toast';
import { render } from './render';
import { closePopup } from './popup';
import type { EventCellElement } from './calendar';

function closestEventCell(target: EventTarget | null): EventCellElement | null {
  if (!(target instanceof Element)) return null;
  return target.closest<EventCellElement>('.cal_cell:not(.cal_cell_time)');
}

export function setupDragAndDrop(): void {
  const container = dom.container;

  container.addEventListener('dragstart', e => {
    const cell = closestEventCell(e.target);
    if (!cell || !cell._event) return;
    state.draggedEvent = cell._event;
    state.draggedCell = cell;
    cell.classList.add('dragging');
    e.dataTransfer!.effectAllowed = 'move';
    try { e.dataTransfer!.setData('text/plain', ''); } catch { /* ignore */ }
    closePopup();
  });

  container.addEventListener('dragend', () => {
    if (state.draggedCell) state.draggedCell.classList.remove('dragging');
    if (state.lastDropTarget) state.lastDropTarget.classList.remove('drop-target', 'drop-invalid');
    state.lastDropTarget = null;
    state.draggedEvent = null;
    state.draggedCell = null;
  });

  container.addEventListener('dragover', e => {
    if (!state.draggedEvent) return;
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';

    const cell = closestEventCell(e.target);
    if (!cell || !cell._event || cell._event === state.draggedEvent) {
      if (state.lastDropTarget) {
        state.lastDropTarget.classList.remove('drop-target', 'drop-invalid');
        state.lastDropTarget = null;
      }
      return;
    }

    if (state.lastDropTarget && state.lastDropTarget !== cell) {
      state.lastDropTarget.classList.remove('drop-target', 'drop-invalid');
    }
    if (canCombine(state.draggedEvent, cell._event)) {
      cell.classList.remove('drop-invalid');
      cell.classList.add('drop-target');
    } else {
      cell.classList.remove('drop-target');
      cell.classList.add('drop-invalid');
    }
    state.lastDropTarget = cell;
  });

  container.addEventListener('dragleave', e => {
    const cell = closestEventCell(e.target);
    if (cell && cell === state.lastDropTarget) {
      cell.classList.remove('drop-target', 'drop-invalid');
      state.lastDropTarget = null;
    }
  });

  container.addEventListener('drop', e => {
    e.preventDefault();
    const source = state.draggedEvent;
    const cell = closestEventCell(e.target);

    if (state.lastDropTarget) {
      state.lastDropTarget.classList.remove('drop-target', 'drop-invalid');
      state.lastDropTarget = null;
    }
    state.draggedEvent = null;

    if (!source || !state.eventsByDay) return;

    // Case 1: dropped on another cell -> combine attempt
    if (cell && cell._event && cell._event !== source) {
      if (canCombine(source, cell._event)) {
        combineAndRender(source, cell._event);
      } else {
        showToast('Events can only be combined when they start at the same time and have the same duration.');
      }
      return;
    }

    // Case 2: dropped on empty space -> move and repel
    const sourceDayIdx = DAYS_TO_SHOW.indexOf(source.weekday as typeof DAYS_TO_SHOW[number]);
    if (sourceDayIdx === -1) return;

    const maxColInSource = Math.max(1, ...state.eventsByDay[source.weekday].map(ev => ev.col || 1));
    if (maxColInSource <= 1) return; // single-column day

    const target = e.target instanceof Element ? e.target : null;
    const dayEl = target?.closest<HTMLElement>('.cal_weekday') ?? null;
    const targetDayName = dayEl ? dayEl.dataset.day : null;

    let targetCol: number;
    if (!targetDayName) {
      targetCol = 1;
    } else {
      const targetDayIdx = DAYS_TO_SHOW.indexOf(targetDayName as typeof DAYS_TO_SHOW[number]);
      if (targetDayIdx === -1) {
        targetCol = 1;
      } else if (targetDayIdx === sourceDayIdx) {
        const colEl = target?.closest<HTMLElement>('.cal_column') ?? null;
        if (!colEl || !colEl.parentElement) return;
        const siblings = Array.from(colEl.parentElement.children);
        targetCol = siblings.indexOf(colEl) + 1;
      } else if (targetDayIdx < sourceDayIdx) {
        targetCol = 1;
      } else {
        targetCol = maxColInSource;
      }
    }

    if (moveEvent(state.eventsByDay, source.weekday, source, targetCol)) {
      render();
    }
  });
}
