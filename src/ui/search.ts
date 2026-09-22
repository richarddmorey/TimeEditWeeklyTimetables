import { getEventCells } from './calendar';

export function applySearch(q: string): void {
  const cells = getEventCells();
  cells.forEach(c => c.classList.remove('search_result'));
  const query = (q || '').trim().toLowerCase();
  if (!query) return;
  cells.forEach(c => {
    const haystack = (c.dataset.search || '') + ' ' + (c.textContent || '').toLowerCase();
    if (haystack.includes(query)) c.classList.add('search_result');
  });
}

export function clearSearch(): void {
  getEventCells().forEach(c => c.classList.remove('search_result'));
}
