# TimeEdit weekly timetable generator

Live app: https://richarddmorey.github.io/TimeEditWeeklyTimetables/

An interactive weekly timetable that reads a TimeEdit CSV export and renders
it as a draggable, searchable, editable calendar — entirely client-side.

This is a reverse-engineered, maintainable rewrite of a single monolithic
`.html` file. The behaviour is unchanged; the code is now split into small
TypeScript modules, type-checked, and built with [Vite](https://vitejs.dev).
GitHub Actions builds it and publishes the result to GitHub Pages on every
push to `main`.

## Project layout

```
index.html                 Page shell: static markup for both screens
src/
  main.ts                  Entry point — wires up all the handler modules
  style.css                All CSS (verbatim from the original design)
  types.ts                 CalendarEvent / EventsByDay / CsvRow types
  constants.ts              Days, colours, default hours, month names, etc.
  state.ts                  The single mutable app-state object

  utils/
    date.ts                 DD/MM/YYYY parsing, Sunday-of-week helper
    text.ts                 HTML escaping, staff-name abbreviation,
                             week-list compaction ("1—3,5,8—10"), merging
    toast.ts                 The small red error toast

  data/
    csv.ts                  Papa Parse pipeline: preamble skip, row
                             filtering, grouping, time-range auto-expansion
    columns.ts               Interval colouring (assignColumns), column
                             densification, combine/canCombine, the
                             move-and-repel drag cascade (moveEvent), and
                             the column-collapse sweep (collapseColumns)
    mutations.ts              combine / break-apart / delete / collapse
                              columns, each of which mutates state and
                              triggers a re-render

  ui/
    dom.ts                   One-time lookup of every static DOM node
    render.ts                 The central render() that rebuilds the grid
    calendar.ts               Builds the weekday columns and event cells
    popup.ts                   Event details popup: layout, positioning,
                               inline editing of title/module/type
    search.ts                  Search highlight/clear
    highlight.ts                Title-highlight checkboxes + violet borders
    week1picker.ts               Week 1 display line and calendar picker
    settings.ts                  Settings panel wiring (time range, Week 1,
                                 load-CSV, help button)
    upload.ts                    The upload screen (drag & drop / browse)
                                 and the shared "load a CSV" entry point
    dragdrop.ts                   Drag-and-drop: combine-on-cell,
                                  move-and-repel on empty space
    globalHandlers.ts              Popup open/close, search box, Escape key
    help.ts                        Help modal open/close
```

The module boundaries mirror the original spec's sections (§2 CSV pipeline,
§7–8 combining/moving, §11 settings, etc.).

## Local development

```bash
npm install
npm run dev       # Vite dev server with hot reload
```

## Type-check and build

```bash
npm run build      # tsc -b && vite build -> dist/
npm run preview    # serve the built dist/ locally
```

`npm run build` type-checks the whole project first (`tsc -b`) and then
bundles it with Vite into a `dist/` folder containing `index.html` plus
hashed CSS/JS assets — functionally indistinguishable from the original
single-file app, just built from source.

## Deploying to GitHub Pages

`.github/workflows/deploy.yml` builds the site with Vite and publishes
`dist/` to GitHub Pages on every push to `main` (or manually via "Run
workflow"). To enable it:

1. Push this repository to GitHub.
2. In the repo, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
3. Push to `main` (or trigger the workflow manually). The site will be
   published at `https://<username>.github.io/<repo>/`.

`vite.config.ts` uses a relative build base (`base: './'`), so the built
assets are referenced with relative paths and work correctly whether the
site is served from a domain root or from a GitHub Pages project subpath —
no need to hardcode the repository name anywhere.


## 1. Overview

Users can:

- Upload a CSV by file picker or drag-and-drop
- Search for events by any field, with animated highlights
- Click events for a detailed popup
- Edit an event's title, module code, and activity type (uncombined events only)
- Combine events by dragging one onto another, when they share a day, start time, and duration
- Move events between columns within their day by dragging onto empty space
- Break combined events apart
- Delete events
- Configure the visible time range, which week counts as Week 1, and which titles are highlighted
- Open an in-app help panel

## 2. Data Pipeline

### 2.1 CSV parsing

The CSV has three preamble lines before the real header. The parser uses Papa Parse's `beforeFirstChunk` hook to scan the first 12 lines for one matching `/^"?Begin date"?/i` and slices the chunk from there.

### 2.2 Row filtering

Each row is kept only if:

- All four date/time fields are present.
- Dates parse as `DD/MM/YYYY`.
- **Begin date equals end date** (multi-day events are dropped).
- Times split cleanly on `:` into integers.
- End time > start time.

### 2.3 Title / type normalisation

| Title | Type | Result |
|---|---|---|
| `"Lecture"` | `"Lecture"` | `Lecture` / `Lecture` |
| `""` | `"Lecture"` | `Lecture` / `Lecture` |
| `"Lecture"` | `""` | `Lecture` / `Lecture` |
| `""` | `""` | `[Missing info]` / `[Missing info]` |

### 2.4 Staff abbreviation

Strip titles (`Dr`, `Prof`, `Mr`, …), take first initial + surname. Result: `"P Gasalla Canto, M Good"`.

### 2.5 Week numbering

The user selects a "Week 1" via a calendar picker; internally stored as the Sunday at midnight of the containing week.

**Auto-detection on first load**: If the user has not manually chosen a Week 1, the first CSV load sets Week 1 to the week containing the earliest event. Subsequent CSV loads keep the last value (either auto-detected or user-chosen).

For each event:

```
eventSunday = Sunday of the event's date
weeknum     = round((eventSunday − week1Sunday) / 7 days) + 1
```

No events are dropped based on `weeknum`: events in weeks before Week 1
simply get a week number of `0`, `-1`, `-2`, … . Changing Week 1 re-runs
this calculation for every event, so all week numbers (positive, zero, and
negative) are renumbered relative to the new Week 1.

### 2.6 Grouping

Events are grouped by `(weekday, startTotal, endTotal, moduleCode, eventTitle, eventType)`.

For each group:

- Weeks merged and compacted: `[1,2,3,5,8,9,10]` → `"1—3,5,8—10"`.
  Week numbers may be zero or negative; to avoid ambiguity between a
  minus sign and a range separator, negative numbers are rendered with
  the Unicode minus sign "−" (U+2212), while ranges use the longer em
  dash "—" (U+2014) instead of a plain hyphen, e.g. `[-3,-2,-1,1]` →
  `"−3—−1,1"`.
- Staff strings merged and de-duplicated.

### 2.7 Column assignment

Within each weekday, a greedy interval-colouring pass assigns overlapping events to distinct sub-columns. The **new version preserves existing `col` values** so that manual moves persist across renders; only events without a `col` get assigned.

`densifyColumns()` renumbers columns to be dense (`1, 2, 3, …`) after moves, combines, breaks, and deletes.

---

## 3. Layout & Rendering

### 3.1 Grid anatomy

Each weekday is a flex column. Width:

```
weekdayWidth = colCount × 100% / totalColumns
totalColumns = 1 (time gutter) + Σ max(cols_used[day], 1)
```

Event cells are absolutely positioned with percentage `top` and `height` relative to the visible time band. Events entirely outside the band are skipped; partially clipped ones get dashed top/bottom borders.

### 3.2 Day colours

| Day | Colour |
|---|---|
| Monday | `#EE6352` |
| Tuesday | `#59CD90` |
| Wednesday | `#3FA7D6` |
| Thursday | `#FAC05E` |
| Friday | `#F79D84` |

### 3.3 Cell content

Three stacked blocks: module code (bold), title (80%), weeks (70%, 85% opacity). Rounded 8 px, subtle shadow, vertical scroll with thin custom scrollbars.

---

## 4. Search

Magnifier triangle in the **bottom-left** corner. Slides out a 260 px pill-shaped input.

Matches the query (case-insensitive substring) against `moduleCode + moduleName + eventTitle + eventType + staffStr + weekStr` plus the cell's visible text. Matches get a yellow glow and a jiggle animation (3-second cycle, ~0.4 s wobble).

---

## 5. Event Popup

Click any cell for a floating popup anchored nearby, with preference: right of cell → left of cell → clamped to viewport.

Content:

- Header pills: dark module pill, activity-type pill, "🔗 Combined · N parts" pill (combined only).
- Title: `<input>` for uncombined, `<h2>` for combined.
- Module name subtitle.
- Detail grid: Module, Type, Day, Time, Weeks, Duration, Staff.
- Footer: "Break apart into N parts" (combined only) and "🗑️ Delete".

Closes with `×`, clicking outside, or `Esc`.

---

## 6. Editing (uncombined events only)

Title, module code, and event type are editable. Commit on `change` or `Enter`; the event mutates, the calendar re-renders, and the popup reopens on the same event.

Editing propagates into combining: if two events are edited to share a field and then combined, `mergeTextValues()` de-duplicates.

When a title is edited, the checkbox list in Settings is regenerated. Unchanged titles keep their check state; new titles default to unchecked.

---

## 7. Combining Events (drag onto a cell)

### 7.1 Semantics

Dropping a cell **on another cell** always attempts a combine. Compatibility: **same weekday, same start time, same end time**.

- Compatible → combined.
- Incompatible → red toast: *"Events can only be combined when they start at the same time and have the same duration."*

### 7.2 Merge semantics

Each event tracks a flat `_parts` array. Combining concatenates `_parts` and re-derives each field:

- Text fields: split on `,` / `;`, trim, de-duplicate case-insensitively, rejoin with `", "`.
- Weeks: union, sorted, compacted.

Combined events get `_combined: true` and a `col` equal to `Math.min(a.col, b.col)`.

### 7.3 N-way combining

`_parts` is always flat, so combined-of-combined works. The pill always shows the total atomic count.

---

## 8. Moving Events Between Columns (drag onto empty space)

### 8.1 When it applies

Dropping a cell onto **empty column space** (not another cell) triggers move-and-repel.

- Dragging is disabled for cells in **single-column days**.
- Dropping on **another cell** always attempts combine instead (see §8).

### 8.2 Target column

- Drop in **same weekday** → column corresponding to where the cursor lands.
- Drop in an **earlier weekday** or on the **time labels** → column 1 (leftmost).
- Drop in a **later weekday** → rightmost column of the source's day.
- The event's **day never changes**; only its column within its day.

### 8.3 Move and repel

Let X be the dragged event, currently at column `i`, moved to target column `j`.

1. If `i == j`, no-op.
2. Place X at column `j`.
3. If no event currently at column `j` overlaps X in time, stop — X has
   simply relocated and nothing else needs to move.
4. Otherwise, each overlapping event at column `j` is a genuine blocker and
   is bumped one column in the direction opposite to X's own movement
   (`i < j` → blockers shift left; `i > j` → blockers shift right).
5. **Recursively**: each bumped event then checks *its own* new column for a
   further overlapping occupant, bumping it the same direction, and so on
   until a step lands on a column with no conflict. This walks only the
   contiguous chain of genuine conflicts — an event that overlaps X in time
   but sits in a column that was never actually blocking the move (e.g. an
   in-between column whose own target slot was already free) is left
   untouched.
6. If any cells were repelled, densify columns (remove gaps). A move into a
   column with no overlapping cells moves only X and preserves the other
   columns' positions.

Cells are always clamped to `col >= 1`.

---

## 9. Breaking Apart

Restores every event in `_parts` back to the day, clears their `col` and `_combined` flags, re-runs interval colouring, and densifies.

Because `_parts` is flat, breaking a combined-of-combined event restores all original events individually.

---

## 10. Deleting

Removes the event (or the whole combined block) from the day, densifies columns, re-renders. No undo.

---

## 11. Settings Panel

Triggered by a gear icon in the **bottom-right** corner. Sections:

### 11.1 Visible time range

Two number inputs (default 9 and 18). Clamped to `0 ≤ start < end ≤ 24`.

**Auto-expansion**: on CSV load, the pipeline computes `floor(min start hour)` and `ceil(max end hour)` and widens the range if needed. The range is only ever widened by this mechanism.

### 11.2 Week 1 picker

- Monospace display line: `Mon D MMM – Fri D MMM YYYY`.
- "📅 Choose week" button toggles a **Sunday-first** calendar.
- 6 rows of 7 days; the current Week 1 row highlighted; today ringed.
- `‹` / `›` navigate months.
- Clicking any day in a row sets Week 1 to that row's Sunday and re-runs the pipeline.
- **Auto-detection**: the first time a CSV is loaded and the user hasn't manually picked a week, Week 1 is set to the earliest event's week.
- Manually picking a week sets a flag that suppresses further auto-detection.

### 11.3 Highlight event titles

- A scrollable list of every distinct event title that currently exists on the timetable.
- One checkbox per title.
- Ticking a checkbox adds a **violet (`#7C3AED`) left border** (via a `::before` pseudo-element, so layout is unaffected) to every cell with that title.
- For combined events, the border appears if **any** constituent part has a ticked title.
- The list is regenerated whenever the settings panel opens or the calendar re-renders.
- When a title is edited, the list is updated; **unchanged titles keep their tick state**, and any **new title defaults to unticked**.

### 11.4 Collapse empty columns

- Button labelled "Collapse empty columns".
- For every weekday independently, sweeps columns left to right starting
  at column 2: each event currently in that column is repeatedly shifted
  one column left as long as the column immediately to its left has no
  event overlapping it in time, stopping as soon as a conflict is hit.
- Because columns are processed in ascending order, each column has
  already been fully compacted by the time the next one is handled, so a
  single left-to-right sweep suffices — no repeated passes are needed.
- Afterwards, columns are densified to close any gaps left by events that
  moved out of them entirely.
- Does not change any event's day, start time, or duration — only its
  column.

### 11.5 Load another CSV

Triggers the hidden file input.

### 11.6 Help

Opens the help modal.

---

## 12. Help Modal

Large overlay (~1080 px wide) with a semi-transparent blurred backdrop. Closes via `×`, clicking the backdrop, or `Esc`.

Sections (each a card with a badge icon):

1. **Loading a CSV**
2. **Searching**
3. **Viewing event details**
4. **Editing an event**
5. **Combining events**
6. **Moving events between columns** (new)
7. **Breaking a combined event apart**
8. **Deleting an event**
9. **Settings** — including the new Week 1 auto-detection and Highlight titles
10. **Creating a PDF** (full-width):

> Before printing to a PDF, it may help to combine events of the same type to reduce the number of columns. Making the text on the page smaller (by reducing the magnification) or printing to a larger PDF paper size (e.g. A3) may help.

---

## 13. Visual Design System

### Typography

- Body: Inter, weights 400–800.
- Monospace accents: JetBrains Mono 600.

### Colours

- Background: `#F5F7FB`
- Text: `#1F2937`
- Headings: `#0F172A`
- Muted: `#64748B`, `#94A3B8`
- Primary: `#5B8FF9`
- Success: `#16A34A`
- Error: `#DC2626`
- Amber (combined pill): `#FEF3C7` / `#92400E`
- Indigo (activity pill): `#EEF2FF` / `#3730A3`
- **Highlight border (titles): `#7C3AED` (violet)**

### Shadows & radii

- Cards / popups: 14–20 px radius, layered shadows.
- Event cells: 8 px radius, `0 1px 2px rgba(15,23,42,0.10)`.

### Transitions

- Search input width: 300 ms.
- Hover lifts: 120 ms.
- Popup entry: 220 ms overshoot.
- Jiggle: 3 s cycle.

---

## 14. Toast

Single `<div class="toast">` at top centre. Auto-dismisses after ~3.2 s. Used for the incompatible-combine error.

---

## 15. State Model

```
eventsByDay        — { Monday: [events], …, Friday: [events] }
stateBeginHour     — default 9
stateEndHour       — default 18
draggedEvent       — currently dragged event, or null
draggedCell        — DOM node being dragged
lastDropTarget     — DOM node currently outlined
currentSearchQuery — search string
rawParsedRows      — last CSV rows as parsed
week1Sunday        — Date (Sunday at midnight) of Week 1
week1UserModified  — boolean: has user manually picked Week 1?
calPickerMonth     — Date shown in the calendar picker
highlightedTitles  — Set<string> of titles to highlight
```

`render()` regenerates the calendar DOM, applies day colours and title borders, re-applies search, refreshes checkboxes if the panel is open, and closes any popup.

---

## 16. Known Limitations & Design Decisions

- **No persistence** — reloading clears all state.
- **Re-parsing on Week 1 change** — changing Week 1 discards user modifications.
- **Drops on other cells always attempt combine** — there is no way to "swap" cells by dragging them onto each other.
- **Move keeps the source day** — cross-day dragging moves within the source's day, not to the target's day.
- **No multi-day events** — dropped by design.
- **Local dates only** — no timezone handling.

---

## 17. Reconstruction Checklist

- [ ] Preamble-skipping CSV parser
- [ ] Same-day filtering
- [ ] Title / type normalisation with `[Missing info]`
- [ ] Staff abbreviation
- [ ] Week-number compaction
- [ ] Grouping by weekday + start + end + module + title + type
- [ ] Interval colouring that **respects existing `col` values**
- [ ] `densifyColumns()` after moves / combines / breaks / deletes
- [ ] Percentage-positioned cells with clipping indicators
- [ ] Day-coloured cells
- [ ] Search triangle with sliding input and jiggle
- [ ] Popup with pills, inline-edit fields, positioning
- [ ] Combine on drop-on-cell (compatible → merge, else toast)
- [ ] Move-and-repel on drop-on-empty-space:
  - [ ] Disabled in single-column days
  - [ ] Same-day drop → target column from DOM
  - [ ] Earlier weekday / time gutter → col 1
  - [ ] Later weekday → rightmost col
  - [ ] Shift overlapping cells and recurse
- [ ] Break-apart
- [ ] Delete
- [ ] Settings: time range, Week 1 picker (Sunday-first), Load CSV, Help
- [ ] Week 1 auto-detection from earliest event (first load only)
- [ ] Highlight event titles via checkboxes (violet left border)
- [ ] Help modal with all sections including PDF tip
- [ ] Two CDN dependencies
- [ ] Single-file delivery
