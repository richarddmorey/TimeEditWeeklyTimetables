import { dom } from './dom';

export function openHelp(): void {
  dom.helpOverlay.classList.add('open');
}

export function closeHelp(): void {
  dom.helpOverlay.classList.remove('open');
}
