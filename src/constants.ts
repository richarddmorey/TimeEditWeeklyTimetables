export const DAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
] as const;

export const DAYS_TO_SHOW = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'
] as const;

export const TITLES_RE = /\b(Dr|Prof|Professor|Mr|Mrs|Ms|Miss|Mx)[.\s]+/gi;

export const DEFAULT_START_HOUR = 9;
export const DEFAULT_END_HOUR = 18;

export const MISSING_INFO = '[Missing info]';

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/** Index 0 is the time gutter (white/unused); 1-5 map to DAYS_TO_SHOW. */
export const WEEKDAY_COLOURS = [
  '#FFFFFF', '#EE6352', '#59CD90', '#3FA7D6', '#FAC05E', '#F79D84'
];
