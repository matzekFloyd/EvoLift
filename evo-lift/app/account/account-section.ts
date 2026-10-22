/** Account page tabs, in the order they appear. */
export const ACCOUNT_SECTIONS = [
  { id: "security", label: "Login" },
  { id: "profile", label: "Profile" },
  { id: "exercises", label: "Exercises" },
  { id: "data", label: "Data" },
] as const;

export type AccountSectionId = (typeof ACCOUNT_SECTIONS)[number]["id"];
