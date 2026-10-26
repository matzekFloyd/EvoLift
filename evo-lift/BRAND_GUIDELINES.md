# EvoLift Brand Guidelines

This document defines the product tone and UI consistency rules for EvoLift.

## Brand positioning

- Product: simple workout logging for fast execution during training.
- Core promise: low-friction logging, clear progress, mobile-first usability.
- Personality: focused, calm, practical, no fluff.

## Voice and tone

- Keep copy short and action-oriented.
- Prefer plain language over fitness jargon.
- Use supportive, neutral feedback (not overly excited).
- Error messages should be specific and corrective.

Examples:

- Prefer: `Please enter a valid target reps value for working sets.`
- Avoid: `Oops! Something went wrong.`

## Naming and terminology

- Use `Workout session` for a completed workout record.
- Use `Template` for a saved, reusable list of exercises (with optional targets) that can start or prefill a session.
- Use `Plan` for an ordered cycle of up to 7 days. One plan can be active.
- Use `Day` for a named step in a plan, with its own exercises and targets.
- Use `Sample week` for a typical spacing of a plan across seven days. Cells marked Day are training days. Cells marked Rest are days off. The plan still runs in day order. A cycle longer than seven days has no sample week.
- Use `Exercise` for a movement inside a session.
- Use `Set` for logged reps/weight entries.
- Use `Loaded (kg)` for external loaded weight.
- Use `Target weight (kg)` in target/default forms. Make clear that **target set counts and target reps** describe **working sets** only; warmups are extra and do not count toward those targets.
- Use `reps` format as `<number> reps` (e.g. `5 reps`).

## Visual style

- Layout: compact, card-and-table hybrid, optimized for quick scanning.
- Density: moderate; avoid excessive whitespace in core logging flows.
- Border-first hierarchy: subtle borders + soft backgrounds over heavy shadows.
- Page panels (`.panel`) are bordered surfaces, not floating cards. Soft shadow only for floating chrome that needs separation (sticky bars, dialogs).
- Rounded controls (`rounded-md`) and small radii for consistency.
- Global header uses a branded light-sky gradient to reinforce navigation hierarchy
  (`bg-gradient-to-l from-sky-200 via-sky-100 to-sky-50`, darker on the right, with no bottom border).
- Typeface: **IBM Plex Sans** for UI text. Use tabular lining figures for Loaded (kg), Target weight (kg), and reps so logging columns stay still. **IBM Plex Mono** only for monospace needs (e.g. API tokens on Account). Do not use Inter or Geist as the product face.

## Header and navigation

The signed-in header is the plate mark and the word **EvoLift** on the left, and the destinations on the right. Keep the light-sky gradient above, with no bottom border. The inner bar stays `max-w-5xl`, the same width as the page, so the wordmark lines up with the page title and the destinations line up with the page action.

Destinations, in this order: Home, Exercises, Insights, Goals, Plans, Templates, Account. Then **Log out**. Every destination is a Lucide icon plus that visible label. Keep the icons. Do not rename these items or add a destination in the header.

The same items have two drawings. Keep both.

- At `lg` (64rem) and wider, they are one row on the gradient. Idle labels are `text-zinc-900`. The current page is `text-sky-950` with a `decoration-sky-700` underline. Leave that row unfilled, so the page keeps the one filled sky action. Every item uses the same soft white hover wash. A `border-zinc-400` rule sits before Log out.
- Below `lg`, a menu button opens a sheet over the page. Draw the items as a two-column tile grid (`grid-cols-2`). Idle tiles are white, with sky icons and `text-zinc-800` labels. The current page is one filled `bg-sky-700` tile with white text, because the sheet covers the page action. Log out is a tile in that grid. Glossary, Terms of use, and Privacy policy sit under a rule at the bottom of the sheet. This sheet is the navigation menu, not an `AppDialog`.

Do not turn the sheet into a single column, fill the current page on the desktop row, or drop the icons.

Row items use `px-1.5` so the row fits in the bar at `lg`. Wider windows leave the extra space beside the wordmark. Do not make the header wider than the page, and do not move the row to a larger breakpoint to loosen it.

The menu button is icon-only. Its accessible name is “Open navigation menu” or “Close navigation menu”, matching the icon. Escape closes the sheet and returns focus to that button. The wordmark and the button stay in the tab order with the sheet.

## User-named text

User-given names (plan name, day name, template name, and similar labels the user typed) are working labels for scanning and tapping — not decorative titles.

- Prefer `font-medium` for user-named text. Do not use italic/cursive, and do not bump to `font-semibold` only to mark “user-named.”
- Standalone names use `text-zinc-900` (or link styling when the name navigates).
- When a name sits next to system chrome in the same line, keep the chrome muted (`text-zinc-600`) and the name slightly stronger (`font-medium text-zinc-800`).

Example:

- Prefer: `Next: Press Bench` with `Next:` in `text-zinc-600` and `Press Bench` in `font-medium text-zinc-800`.
- Avoid: italic names, or making the whole `Next: …` line as strong as the plan title.

## Color intent

Color is **role**, not decoration. EvoLift leans on sky as the brand/forward color. Non-sky hues exist for status and data — not for making quiet screens “pop.”

A quiet screen with **one** filled sky CTA in the focal area is correct. A screen with many sky chips, fills, and icons is not more on-brand.

### Brand / structure

| Role | Palette | Use for |
| --- | --- | --- |
| Structure | `zinc-*` | Text, borders, secondary buttons, most chrome |
| Brand / forward | `sky-*` | Primary CTA, focus rings, active nav, strength chart series, “next” / selected row (`PanelInset` `tone="accent"`, soft `sky-50`) |

### Status (UI feedback)

| Role | Palette | Use for |
| --- | --- | --- |
| Success | `emerald-*` | Saved / success notices, goal reached feedback |
| Caution | `amber-*` | Warning notices, cautionary actions (e.g. clear filters that discard), pace caution |
| Danger | `red-*` | Delete / irreversible actions |

### Data (charts only)

| Role | Palette | Use for |
| --- | --- | --- |
| Companion series | `teal-*` | Second metric on a chart (e.g. Loaded (kg) beside Total) — see **Charts** |
| Volume / work | `emerald-*` | Tonnage-style volume series — see **Charts** |

Teal is **not** a second brand accent for buttons, badges, or page chrome unless this document later promotes it.

### Highlight budget

On a typical screen:

- **Often:** zinc structure.
- **Sometimes:** sky for forward action, selection, or strength meaning.
- **Rarely:** emerald / amber / red — only when state requires it (feedback or irreversible).
- **Charts only:** teal as a companion series; emerald for volume role.

If a highlight is not success, warning, danger, “this is the next thing,” or a documented chart role, keep it zinc (or soft sky only when it is truly selected / next).

Do not invent purple, pink, orange, or other one-off hues for personality. Warmup / caution cues use amber (with icon + text), not a separate orange.

### Product state vs outcome feedback

- **Session lifecycle chrome** (planned / in progress / completed): zinc or soft sky. “Completed” here means product state, not a toast — do not repaint whole sections emerald because a session is done.
- **Outcome feedback** (`StatusNotice`, goal reached): emerald for success, amber for warning, red for error. Keep these near the control that caused them.

## Charts and data visualization

Use the same palette as UI intent. Do not invent one-off hues (orange, purple, pink) just to differentiate charts.

### Chart chrome

- Grid lines: `#e4e4e7` (zinc-200).
- Axis ticks and labels: `#52525b` (zinc-600).

### Continuous series (lines, bars, areas)

Pick the role that matches the metric. Use these hex values in Recharts (Tailwind token in parentheses):

| Role | Use for | Hex | Token |
| --- | --- | --- | --- |
| Primary | Default single series; Total (kg); counts; estimated 1RM; working-set bars | `#0284c7` | sky-600 |
| Primary emphasis | Selected / current period (primary series) | `#0369a1` | sky-700 |
| Primary muted | Unselected bars when another period is selected (primary series) | `#7dd3fc` | sky-300 |
| Secondary | Companion load metric (e.g. Loaded (kg)); trend overlay on a primary or volume series | `#0f766e` | teal-700 |
| Volume / work | Session or weekly tonnage-style volume bars | `#059669` | emerald-600 |
| Volume emphasis | Selected volume bar | `#047857` | emerald-700 |
| Volume muted | Unselected volume bars when another week is selected | `#6ee7b7` | emerald-300 |

Rules:

- A page with several single-series charts still uses the role for each metric (strength → primary; volume → volume/work). Same sky on Weight and Estimated 1RM is correct; color encodes meaning, not “chart number.”
- Amber / orange is **not** a series color. It is reserved for warning feedback (and for categorical pace status below).
- Prefer a legend or chart title over a unique hue when two series share a chart.

### Categorical status in charts

Pace mixes and similar status breakdowns may use semantic fills (e.g. on-track → primary sky, ahead → emerald, caution → amber, early/neutral → zinc). Keep those tied to status meaning; do not reuse them as arbitrary continuous-series colors.

## Iconography

- Prefer Lucide for actions and nav. Do not swap icon libraries for novelty.
- Brand identity uses `EvoLiftMark` (plate mark), not a generic dumbbell glyph as the logo.
- Do **not** put an icon on every section heading. If the title already scans, text alone is enough. Icons beside titles are chrome, not meaning.
- A button gets an icon when its verb is Save, Add, Remove, Delete, Back, Up, Down, Done, Next, Previous, or Clear draft. Disclosure chevrons on a row stay. Cancel in a dialog stays words only. The icon sits beside the word.
- Keep icon size compact: `h-3.5` on a small button, `h-4` on a medium button.
- `ActionButton` colors the icon from the variant. Do not set a color class on the icon itself.

| Variant | Icon color | Use |
| --- | --- | --- |
| Primary | White | The filled sky button is already the forward action. |
| Secondary | Zinc | Back, Add beside Save, reorder, Done, Next, Previous. |
| Danger | Red | Remove and Delete. |
| `iconColor="amber"` | Amber | The control discards in-progress work (Clear draft, clear filters). |
| `iconColor="sky"` | Sky | A forward action that is not the filled page button. Add exercise and Add next use it on a soft sky surface, the same weight as Remove's soft red. Done stays zinc: it closes the exercise you are editing. The page-header add is sky because on a phone it is icon-only. |

- Do not rely on color alone; pair with text and/or a distinct icon where state matters (e.g. warmup vs working).

## Button conventions

- Primary submit/save buttons use filled sky styling.
- Secondary buttons use neutral outline styling (`border-zinc-300`, soft `bg-zinc-50`).
- Destructive actions remain outline/soft-red unless explicitly critical.
- Add exercise and Add next use a soft sky surface so they have the same weight as Remove. Done stays a zinc secondary button. Save stays the filled sky button.
- `ActionButton` paints its icon from the variant (white, zinc, or red). Override only with `iconColor="amber"` or `iconColor="sky"`, as in **Iconography**.
- On mobile, prioritize thumb-friendly hit targets and concise labels.

### Nested surfaces

Avoid stacking the same fill on itself (e.g. white row on white card, or `zinc-50` button on `zinc-50` row).

- Nested groups inside a white `.panel` **must** use shared `PanelInset` (or `panelInsetClass`) — do not hand-roll `border-zinc-200 bg-zinc-50` on list rows or cards.
- Default tone is muted (`bg-zinc-50/80`). Use `tone="accent"` for highlighted / “next” rows (`bg-sky-50`).
- Secondary `ActionButton`s inside `PanelInset` raise to white automatically. Pass `raised={false}` only to opt out; pass `raised` outside an inset to force white fill.
- Default `ExerciseBadgeChip`s inside `PanelInset` raise to white automatically (same rule as secondary buttons).
- Data tables use shared `AppTable` (PanelInset shell). Row actions use `TableRowActions`: equal width, stacked in one column below `sm`, horizontal from `sm` up. Do not hand-roll per-table action layouts.

## Feedback and messaging

- Reuse shared status notice UI for consistency.
- Message types:
  - error
  - warning
  - success
- Messages should appear near the affected action block.
- Prefer section-local messages over one global page message.

## Dialogs and overlays

- Modal dialogs use shared `AppDialog` and open **centered** in the viewport at every width (including compact).
- Do not hand-roll `fixed inset-0` bottom-sheet overlays (`items-end` / `sm:items-center`) for confirmations or forms.
- Keep dialog actions right-aligned in the panel footer (`Cancel` then primary/danger).

## Responsive behavior

- Mobile-first default.
- Critical actions should remain visible in compact layouts (sticky bars allowed).
- Keep action ordering consistent across breakpoints where possible.
- Preserve consistent header-to-content spacing through shared layout wrappers.

## Accessibility baseline

Hold every new screen to this bar. A keyboard and a screen reader get the same names the screen already shows.

- Every control has a visible name (`Save`, `Delete`, `Set targets`). Add an accessible name only when the control has no visible text.
- Form labels stay visible and tied to the input.
- Status uses text or an icon as well as color. Reuse the shared status notice for error, warning, and success.
- Keyboard reaches every control. Focus is visible. Escape closes dialogs and popovers. A dialog keeps focus inside until it closes, then returns focus to the control that opened it.
- Decorative icons are hidden from assistive tech (`aria-hidden`). Do not add an ARIA role to a native `button`, link, or `label`.
- Preserve color contrast for text and icons. Fix contrast where text or an icon fails this baseline. Do not add a conformance badge.

## Content style checklist for new UI

- Is text short, clear, and action-first?
- Are terms consistent with this document?
- Are user-named labels weighted per **User-named text** (medium, not italic/semibold-only)?
- Are nested groups using `PanelInset` / **Nested surfaces** (no hand-rolled muted fills)?
- Does color follow **Color intent** (sky for forward; emerald/amber/red only for status; teal chart-only)?
- Is there roughly one filled sky CTA in the focal area, not sky decoration everywhere?
- Does the header still follow **Header and navigation** (desktop underline, two-column compact tiles, icons kept)?
- Are icons on the named action verbs, zinc on quiet secondary buttons (including Done), white on the filled primary, and soft sky on Add exercise and Add next?
- Do chart series use **Charts and data visualization** roles (no one-off hues)?
- Is compact/mobile behavior still usable with one hand?
- Is success/error feedback shown near the triggering control?
- Can a keyboard and a screen reader use every new control by its visible name, with visible focus, and with status that is not color alone?
