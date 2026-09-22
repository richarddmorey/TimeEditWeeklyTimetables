import { state } from '../state';
import { dom } from './dom';
import { openPopup, closePopup } from './popup';
import { applySearch, clearSearch } from './search';
import { hideWeek1Picker } from './week1picker';
import { closeHelp } from './help';
import { setupDragAndDrop } from './dragdrop';
import type { EventCellElement } from './calendar';

export function setupGlobalHandlers(): void {
  setupDragAndDrop();

  dom.container.addEventListener('click', e => {
    const target = e.target instanceof Element ? e.target : null;
    const cell = target?.closest<EventCellElement>('.cal_cell:not(.cal_cell_time)') ?? null;
    if (!cell || !cell._event) return;
    e.stopPropagation();
    openPopup(cell._event, cell);
  });

  dom.infoWindow.addEventListener('click', e => {
    if ((e.target as Element).classList.contains('modal-close')) closePopup();
  });
  document.addEventListener('click', e => {
    if (dom.infoWindow.style.display !== 'block') return;
    if (dom.infoWindow.contains(e.target as Node)) return;
    if ((e.target as Element).closest?.('.cal_cell')) return;
    closePopup();
  });

  dom.searchInput.addEventListener('input', () => {
    state.currentSearchQuery = dom.searchInput.value;
    applySearch(state.currentSearchQuery);
  });
  dom.searchTriangle.addEventListener('click', e => {
    e.stopPropagation();
    dom.searchWindow.classList.add('open');
    dom.searchInput.focus();
  });
  dom.searchInput.addEventListener('blur', () => {
    dom.searchWindow.classList.remove('open');
  });

  dom.helpClose.addEventListener('click', closeHelp);
  dom.helpOverlay.addEventListener('click', e => {
    if (e.target === dom.helpOverlay) closeHelp();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' || e.keyCode === 27) {
      if (dom.helpOverlay.classList.contains('open')) { closeHelp(); return; }
      closePopup();
      dom.searchInput.value = '';
      state.currentSearchQuery = '';
      clearSearch();
      dom.searchWindow.classList.remove('open');
      dom.searchInput.blur();
      dom.settingsPanel.classList.remove('open');
      hideWeek1Picker();
    }
  });
}
