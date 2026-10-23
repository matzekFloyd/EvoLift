/** Page title: the name the lifter typed, or the screen fallback while it is empty. */
export function editorTitle(name: string, fallback: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export type OptionalNotesMode = "edit" | "preview" | "add";

/** Closed notes with text stay a one-line preview. Empty notes stay an add action. */
export function optionalNotesMode(notes: string, open: boolean): OptionalNotesMode {
  if (open) {
    return "edit";
  }
  if (notes.trim().length > 0) {
    return "preview";
  }
  return "add";
}
