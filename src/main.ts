import './style.css';
import { initDom } from './ui/dom';
import { setupGlobalHandlers } from './ui/globalHandlers';
import { setupSettingsHandlers } from './ui/settings';
import { setupUploadHandlers } from './ui/upload';

initDom();
setupGlobalHandlers();
setupSettingsHandlers(); // also sets the initial Week 1 display text
setupUploadHandlers();
