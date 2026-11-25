import { appPath } from "@/lib/app-paths";

/** Settings page tabs, in the order they appear. */
export const ACCOUNT_SECTIONS = [
  { id: "security", label: "Login" },
  { id: "profile", label: "Body metrics" },
  { id: "exercises", label: "Exercises" },
  { id: "data", label: "Data" },
] as const;

export type AccountSectionId = (typeof ACCOUNT_SECTIONS)[number]["id"];

/** `?section=` on Settings. Unknown values stay on the default Login tab. */
export function accountSectionFromSearchParam(value: string | null): AccountSectionId | null {
  const match = ACCOUNT_SECTIONS.find((section) => section.id === value);
  return match?.id ?? null;
}

/** Settings URL that opens one tab. Body metrics is `profile`. */
export function accountSectionPath(section: AccountSectionId): string {
  return `${appPath("/account")}?section=${section}`;
}
