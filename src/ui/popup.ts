import { pad2 } from '../utils/date';
import { escapeHtml } from '../utils/text';
import { dom } from './dom';
import { findCellForEvent } from './calendar';
import { render } from './render';
import { breakApartAndRender, deleteEventAndRender } from '../data/mutations';
import type { CalendarEvent } from '../types';

interface InfoWindowElement extends HTMLElement {
  _event?: CalendarEvent | null;
}

export function openPopup(ev: CalendarEvent, sourceCell: HTMLElement): void {
  const infoWindow = dom.infoWindow as InfoWindowElement;
  infoWindow.innerHTML = buildPopupHTML(ev);
  infoWindow._event = ev;

  const breakBtn = infoWindow.querySelector<HTMLButtonElement>('.break-apart-btn');
  if (breakBtn) breakBtn.addEventListener('click', () => breakApartAndRender(ev));

  const delBtn = infoWindow.querySelector<HTMLButtonElement>('.delete-btn');
  if (delBtn) delBtn.addEventListener('click', () => deleteEventAndRender(ev));

  infoWindow.querySelectorAll<HTMLInputElement>('.edit-input, .modal-title-input').forEach(inp => {
    inp.addEventListener('change', () => {
      const field = inp.dataset.field as keyof CalendarEvent | undefined;
      if (!field) return;
      (ev as any)[field] = inp.value;
      render();
      const newCell = findCellForEvent(ev);
      if (newCell) openPopup(ev, newCell);
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
    });
  });

  infoWindow.style.visibility = 'hidden';
  infoWindow.style.display = 'block';
  infoWindow.style.left = '0px';
  infoWindow.style.top = '0px';

  const iw = infoWindow.offsetWidth;
  const ih = infoWindow.offsetHeight;
  const rect = sourceCell.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  const margin = 12;

  let left = rect.right + margin;
  let top = rect.top;
  if (left + iw > vw - margin) left = rect.left - iw - margin;
  if (left < margin) left = margin;
  if (top + ih > vh - margin) top = vh - ih - margin;
  if (top < margin) top = margin;

  infoWindow.style.left = left + 'px';
  infoWindow.style.top = top + 'px';
  infoWindow.style.visibility = 'visible';
}

export function closePopup(): void {
  const infoWindow = dom.infoWindow as InfoWindowElement | undefined;
  if (!infoWindow) return;
  infoWindow.style.display = 'none';
  infoWindow.innerHTML = '';
  infoWindow._event = null;
}

function buildPopupHTML(ev: CalendarEvent): string {
  const timeStr = `${pad2(ev.startH)}:${pad2(ev.startM)} \u2013 ${pad2(ev.endH)}:${pad2(ev.endM)}`;

  const activityPill = ev.eventType
    ? `<span class="modal-activity">${escapeHtml(ev.eventType)}</span>` : '';

  const combinedPill = ev._combined
    ? `<span class="modal-combined" title="This event has been combined from multiple parts">\u{1F517} Combined \u00B7 ${ev._parts!.length} parts</span>` : '';

  const moduleSub = ev.moduleName
    ? `<p class="modal-sub">${escapeHtml(ev.moduleName)}</p>` : '';

  const editable = !ev._combined;

  const titleEl = editable
    ? `<input type="text" class="modal-title-input" data-field="eventTitle"
              value="${escapeHtml(ev.eventTitle)}" spellcheck="false"
              placeholder="Event title\u2026">`
    : `<h2 class="modal-title">${escapeHtml(ev.eventTitle)}</h2>`;

  const moduleRow = editable
    ? `<div class="label">Module</div>
       <div><input type="text" class="edit-input" data-field="moduleCode"
                   value="${escapeHtml(ev.moduleCode)}" spellcheck="false"></div>`
    : `<div class="label">Module</div><div>${escapeHtml(ev.moduleCode) || '\u2014'}</div>`;

  const typeRow = editable
    ? `<div class="label">Type</div>
       <div><input type="text" class="edit-input" data-field="eventType"
                   value="${escapeHtml(ev.eventType)}" spellcheck="false"></div>`
    : `<div class="label">Type</div><div>${escapeHtml(ev.eventType) || '\u2014'}</div>`;

  const staffRow = ev.staffStr
    ? `<div class="label">Staff</div><div>${escapeHtml(ev.staffStr)}</div>` : '';

  const breakButton = ev._combined
    ? `<button class="break-apart-btn" type="button">Break apart into ${ev._parts!.length} parts</button>` : '';

  const deleteButton = `<button class="delete-btn" type="button" title="Delete event">\u{1F5D1}\uFE0F Delete</button>`;

  return `
    <button class="modal-close" aria-label="Close">\u00D7</button>
    <div class="modal-header">
      <span class="modal-module">${escapeHtml(ev.moduleCode) || '\u2014'}</span>
      ${activityPill}
      ${combinedPill}
    </div>
    ${titleEl}
    ${moduleSub}
    <div class="modal-grid">
      ${moduleRow}
      ${typeRow}
      <div class="label">Day</div>      <div>${escapeHtml(ev.weekday)}</div>
      <div class="label">Time</div>     <div>${timeStr}</div>
      <div class="label">Weeks</div>    <div>${escapeHtml(ev.weekStr) || '\u2014'}</div>
      <div class="label">Duration</div> <div>${escapeHtml(ev.durationStr)}</div>
      ${staffRow}
    </div>
    <div class="modal-footer">
      ${breakButton}
      ${deleteButton}
    </div>
  `;
}
