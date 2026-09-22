import { MONTH_NAMES, MONTH_NAMES_SHORT } from '../constants';
import { sundayOf } from '../utils/date';
import { state } from '../state';
import { dom } from './dom';
import { processRows } from '../data/csv';
import { render } from './render';

export function updateWeek1Display(): void {
  const mon = new Date(state.week1Sunday); mon.setDate(mon.getDate() + 1);
  const fri = new Date(state.week1Sunday); fri.setDate(fri.getDate() + 5);
  const text =
    `Mon ${mon.getDate()} ${MONTH_NAMES_SHORT[mon.getMonth()]} \u2013 ` +
    `Fri ${fri.getDate()} ${MONTH_NAMES_SHORT[fri.getMonth()]} ${fri.getFullYear()}`;
  dom.week1Display.textContent = text;
}

export function renderWeek1Picker(): void {
  const y = state.calPickerMonth.getFullYear();
  const m = state.calPickerMonth.getMonth();
  dom.week1MonthLabel.textContent = `${MONTH_NAMES[m]} ${y}`;

  const firstOfMonth = new Date(y, m, 1);
  const gridStart = sundayOf(firstOfMonth);

  const selWeekStartTs = sundayOf(state.week1Sunday).getTime();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();

  dom.week1Days.innerHTML = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    const ts = d.getTime();
    const inMonth = d.getMonth() === m;
    const inSelectedWeek = sundayOf(d).getTime() === selWeekStartTs;

    const cell = document.createElement('div');
    cell.className = 'cal_week1_day';
    if (!inMonth) cell.classList.add('other-month');
    if (inSelectedWeek) cell.classList.add('selected-week');
    if (ts === todayTs) cell.style.boxShadow = 'inset 0 0 0 1.5px #5B8FF9';
    cell.textContent = String(d.getDate());

    cell.addEventListener('click', () => {
      const newWeek1Sunday = sundayOf(d);
      if (newWeek1Sunday.getTime() === state.week1Sunday.getTime()) return;
      state.week1Sunday = newWeek1Sunday;
      state.week1UserModified = true;
      updateWeek1Display();
      renderWeek1Picker();
      if (state.rawParsedRows) {
        processRows(state.rawParsedRows);
        syncTimeRangeInputs();
        render();
      }
    });

    dom.week1Days.appendChild(cell);
  }
}

/** Keeps the settings-panel number inputs in sync after auto-expansion. */
export function syncTimeRangeInputs(): void {
  dom.startHourIn.value = String(state.stateBeginHour);
  dom.endHourIn.value = String(state.stateEndHour);
}

export function showWeek1Picker(): void {
  dom.week1Picker.style.display = 'block';
  state.calPickerMonth = new Date(state.week1Sunday.getFullYear(), state.week1Sunday.getMonth(), 1);
  renderWeek1Picker();
}

export function hideWeek1Picker(): void {
  dom.week1Picker.style.display = 'none';
}

export function toggleWeek1Picker(): void {
  if (dom.week1Picker.style.display === 'block') hideWeek1Picker();
  else showWeek1Picker();
}
