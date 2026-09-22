function req<T extends Element>(selector: string): T {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`Missing required element: ${selector}`);
  return el;
}

function reqId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id) as T | null;
  if (!el) throw new Error(`Missing required element: #${id}`);
  return el;
}

/** Populated once by `initDom()`, called at app startup. */
export const dom = {} as {
  uploadView: HTMLElement;
  calendarView: HTMLElement;
  dropZone: HTMLElement;
  browseBtn: HTMLButtonElement;
  fileInput: HTMLInputElement;

  container: HTMLElement;
  infoWindow: HTMLElement;
  toast: HTMLElement;

  searchWindow: HTMLElement;
  searchTriangle: HTMLElement;
  searchInput: HTMLInputElement;

  settingsTriangle: HTMLElement;
  settingsPanel: HTMLElement;
  settingsClose: HTMLButtonElement;
  startHourIn: HTMLInputElement;
  endHourIn: HTMLInputElement;
  loadCsvBtn: HTMLButtonElement;
  helpBtn: HTMLButtonElement;
  fileInput2: HTMLInputElement;
  titleCheckboxes: HTMLElement;

  week1Display: HTMLElement;
  week1Toggle: HTMLButtonElement;
  week1Picker: HTMLElement;
  week1Prev: HTMLButtonElement;
  week1Next: HTMLButtonElement;
  week1MonthLabel: HTMLElement;
  week1Days: HTMLElement;

  helpOverlay: HTMLElement;
  helpClose: HTMLButtonElement;
};

export function initDom(): void {
  dom.uploadView = reqId('upload-view');
  dom.calendarView = reqId('calendar-view');
  dom.dropZone = reqId('drop-zone');
  dom.browseBtn = reqId('browse-btn');
  dom.fileInput = reqId('file-input');

  dom.container = req('.cal_container');
  dom.infoWindow = reqId('info_window');
  dom.toast = reqId('toast');

  dom.searchWindow = reqId('search-window');
  dom.searchTriangle = reqId('search-triangle');
  dom.searchInput = req('.cal_search_input');

  dom.settingsTriangle = reqId('settings-triangle');
  dom.settingsPanel = reqId('settings-panel');
  dom.settingsClose = reqId('settings-close');
  dom.startHourIn = reqId('start-hour');
  dom.endHourIn = reqId('end-hour');
  dom.loadCsvBtn = reqId('load-csv-btn');
  dom.helpBtn = reqId('help-btn');
  dom.fileInput2 = reqId('file-input-2');
  dom.titleCheckboxes = reqId('title-checkboxes');

  dom.week1Display = reqId('week1-display');
  dom.week1Toggle = reqId('week1-toggle');
  dom.week1Picker = reqId('week1-picker');
  dom.week1Prev = reqId('week1-prev');
  dom.week1Next = reqId('week1-next');
  dom.week1MonthLabel = reqId('week1-month-label');
  dom.week1Days = reqId('week1-days');

  dom.helpOverlay = reqId('help-overlay');
  dom.helpClose = reqId('help-close');
}
