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
- Use `Plan` for an ordered cycle of days. One plan can be active.
- Use `Day` for a named step in a plan, with its own exercises and targets.
- Use `Exercise` for a movement inside a session.
- Use `Set` for logged reps/weight entries.
- Use `Loaded (kg)` for external loaded weight.
- Use `Target weight (kg)` in target/default forms. Make clear that **target set counts and target reps** describe **working sets** only; warmups are extra and do not count toward those targets.
- Use `reps` format as `<number> reps` (e.g. `5 reps`).

## Visual style

- Layout: compact, card-and-table hybrid, optimized for quick scanning.
- Density: moderate; avoid excessive whitespace in core logging flows.
- Border-first hierarchy: subtle borders + soft backgrounds over heavy shadows.
- Rounded controls (`rounded-md`) and small radii for consistency.
- Global header uses a branded light-blue gradient to reinforce navigation hierarchy
  (`bg-gradient-to-l from-sky-200 via-sky-100 to-sky-50`, darker on the right, with no bottom border).

## User-named text

User-given names (plan name, day name, template name, and similar labels the user typed) are working labels for scanning and tapping — not decorative titles.

- Prefer `font-medium` for user-named text. Do not use italic/cursive, and do not bump to `font-semibold` only to mark “user-named.”
- Standalone names use `text-zinc-900` (or link styling when the name navigates).
- When a name sits next to system chrome in the same line, keep the chrome muted (`text-zinc-600`) and the name slightly stronger (`font-medium text-zinc-800`).

Example:

- Prefer: `Next: Press Bench` with `Next:` in `text-zinc-600` and `Press Bench` in `font-medium text-zinc-800`.
- Avoid: italic names, or making the whole `Next: …` line as strong as the plan title.

## Color intent

- Primary action: sky blue (`sky-*`) for forward/progressive actions.
- Destructive action: red (`red-*`) for delete/remove.
- Success state: emerald (`emerald-*`) for completed/saved feedback.
- Warning state: amber (`amber-*`) for cautionary feedback.
- Neutral controls: zinc (`zinc-*`) for secondary actions.

## Iconography

- Every high-frequency action should have an icon if space allows.
- Keep icon size compact (`h-3` to `h-4` depending on button size).
- Match icon color to intent:
  - primary/action: blue
  - destructive: red
  - success/save: green or white on filled primary buttons
  - neutral/cancel: zinc

## Button conventions

- Primary submit/save buttons use filled sky styling.
- Secondary buttons use neutral outline styling (`border-zinc-300`, soft `bg-zinc-50`).
- Destructive actions remain outline/soft-red unless explicitly critical.
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

- Keep button labels explicit (`Save`, `Delete`, `Set targets`, etc.).
- Preserve color contrast for text/icon combinations.
- Do not rely on color alone to communicate state; include text and/or icons.
- Keep form labels visible and adjacent to inputs.

## Content style checklist for new UI

- Is text short, clear, and action-first?
- Are terms consistent with this document?
- Are user-named labels weighted per **User-named text** (medium, not italic/semibold-only)?
- Are nested groups using `PanelInset` / **Nested surfaces** (no hand-rolled muted fills)?
- Are action colors and icons semantically correct?
- Is compact/mobile behavior still usable with one hand?
- Is success/error feedback shown near the triggering control?
