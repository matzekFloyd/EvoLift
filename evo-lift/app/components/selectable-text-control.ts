/** Input types where double-click should not select (secrets or non-text interaction). */
const NON_SELECT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "password",
  "radio",
  "range",
  "reset",
  "submit",
]);

export function isSelectableInputType(type: string): boolean {
  return !NON_SELECT_INPUT_TYPES.has(type);
}
