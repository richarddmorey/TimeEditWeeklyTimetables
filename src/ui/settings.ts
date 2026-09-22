import { DEFAULT_START_HOUR, DEFAULT_END_HOUR } from '../constants';
import { state } from '../state';
import { dom } from './dom';
import { render } from './render';
import { renderTitleCheckboxes } from './highlight';
import {
  updateWeek1Display, hideWeek1Picker, toggleWeek1Picker, renderWeek1Picker
} from './week1picker';
import { openHelp } from './help';
import { loadCsvFile } from './upload';

function applyTimeRange(): void {
  let s = parseInt(dom.startHourIn.value, 10);
  let e = parseInt(dom.endHourIn.value, 10);
  if (isNaN(s)) s = DEFAULT_START_HOUR;
  if (isNaN(e)) e = DEFAULT_END_HOUR;
  s = Math.max(0, Math.min(23, s));
  e = Math.max(1, Math.min(24, e));
  if (e <= s) e = Math.min(24, s + 1);
  dom.startHourIn.value = String(s);
  dom.endHourIn.value = String(e);
  if (s === state.stateBeginHour && e === state.stateEndHour) return;
  state.stateBeginHour = s;
  state.stateEndHour = e;
  render();
}

export function setupSettingsHandlers(): void {
  dom.startHourIn.addEventListener('change', applyTimeRange);
  dom.endHourIn.addEventListener('change', applyTimeRange);

  dom.settingsTriangle.addEventListener('click', e => {
    e.stopPropagation();
    dom.settingsPanel.classList.toggle('open');
    if (dom.settingsPanel.classList.contains('open')) renderTitleCheckboxes();
  });
  dom.settingsClose.addEventListener('click', e => {
    e.stopPropagation();
    dom.settingsPanel.classList.remove('open');
    hideWeek1Picker();
  });
  document.addEventListener('click', e => {
    if (!dom.settingsPanel.classList.contains('open')) return;
    if (dom.settingsPanel.contains(e.target as Node)) return;
    if ((e.target as Element).closest?.('#settings-triangle')) return;
    dom.settingsPanel.classList.remove('open');
    hideWeek1Picker();
  });

  updateWeek1Display();
  dom.week1Toggle.addEventListener('click', e => {
    e.stopPropagation();
    toggleWeek1Picker();
  });
  dom.week1Prev.addEventListener('click', e => {
    e.stopPropagation();
    state.calPickerMonth = new Date(
      state.calPickerMonth.getFullYear(), state.calPickerMonth.getMonth() - 1, 1);
    renderWeek1Picker();
  });
  dom.week1Next.addEventListener('click', e => {
    e.stopPropagation();
    state.calPickerMonth = new Date(
      state.calPickerMonth.getFullYear(), state.calPickerMonth.getMonth() + 1, 1);
    renderWeek1Picker();
  });
  dom.week1Picker.addEventListener('click', e => e.stopPropagation());

  dom.loadCsvBtn.addEventListener('click', e => {
    e.stopPropagation();
    dom.fileInput2.click();
  });
  dom.fileInput2.addEventListener('change', e => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) loadCsvFile(target.files[0]);
    target.value = '';
    dom.settingsPanel.classList.remove('open');
    hideWeek1Picker();
  });

  dom.helpBtn.addEventListener('click', e => {
    e.stopPropagation();
    dom.settingsPanel.classList.remove('open');
    hideWeek1Picker();
    openHelp();
  });
}
