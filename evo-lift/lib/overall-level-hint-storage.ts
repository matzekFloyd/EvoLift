const OVERALL_LEVEL_HINT_KEY = "evolift.overall-level-up";

export function rememberOverallLevelHint(message: string) {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.setItem(OVERALL_LEVEL_HINT_KEY, message);
}

export function readOverallLevelHint(): string | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }
  const message = sessionStorage.getItem(OVERALL_LEVEL_HINT_KEY);
  return message && message.trim() ? message : null;
}

export function clearOverallLevelHint() {
  if (typeof sessionStorage === "undefined") {
    return;
  }
  sessionStorage.removeItem(OVERALL_LEVEL_HINT_KEY);
}
