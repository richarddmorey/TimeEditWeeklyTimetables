import { handleFile } from '../data/csv';
import { dom } from './dom';
import { render } from './render';
import { updateWeek1Display, syncTimeRangeInputs } from './week1picker';

/** Parses `file`, updates state, then re-renders the calendar and settings UI. */
export function loadCsvFile(file: File): void {
  handleFile(file, () => {
    updateWeek1Display();
    syncTimeRangeInputs();
    render();
  });
}

export function setupUploadHandlers(): void {
  dom.browseBtn.addEventListener('click', () => dom.fileInput.click());
  dom.fileInput.addEventListener('change', e => {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files[0]) loadCsvFile(target.files[0]);
  });

  const dropZone = dom.dropZone;
  ['dragenter', 'dragover'].forEach(ev =>
    dropZone.addEventListener(ev, e => {
      e.preventDefault(); e.stopPropagation();
      dropZone.classList.add('dragging');
    })
  );
  ['dragleave', 'drop'].forEach(ev =>
    dropZone.addEventListener(ev, e => {
      e.preventDefault(); e.stopPropagation();
      dropZone.classList.remove('dragging');
    })
  );
  dropZone.addEventListener('drop', e => {
    const f = (e as DragEvent).dataTransfer?.files?.[0];
    if (f) loadCsvFile(f);
  });
  dropZone.addEventListener('click', e => {
    if ((e.target as HTMLElement).id !== 'browse-btn') {
      dom.fileInput.click();
    }
  });
}
