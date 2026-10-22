/** True when a section's fields differ from the last saved values. */
export function accountFieldsChanged<T extends object>(saved: T, current: T): boolean {
  return (Object.keys(saved) as Array<keyof T>).some(
    (key) => !sameField(saved[key] as string | boolean, current[key] as string | boolean),
  );
}

function sameField(saved: string | boolean, current: string | boolean | undefined): boolean {
  if (typeof saved === "boolean" && typeof current === "boolean") {
    return saved === current;
  }
  return String(saved).trim() === String(current ?? "").trim();
}

/** A new address that is blank or already the current address is not a change. */
export function accountEmailChanged(currentEmail: string | null, newEmail: string): boolean {
  const next = newEmail.trim().toLowerCase();
  if (!next) {
    return false;
  }
  return next !== (currentEmail ?? "").trim().toLowerCase();
}

/** Password fields start empty. Any typed value is a change. */
export function accountPasswordChanged(fields: {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}): boolean {
  return [fields.currentPassword, fields.newPassword, fields.confirmNewPassword].some(
    (value) => value.length > 0,
  );
}
