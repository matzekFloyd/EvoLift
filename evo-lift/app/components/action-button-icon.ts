export type ActionButtonVariant = "primary" | "secondary" | "danger";
export type ActionButtonIconColor = "auto" | "sky" | "zinc" | "amber" | "red" | "white";

const autoIconColorByVariant: Record<
  ActionButtonVariant,
  Exclude<ActionButtonIconColor, "auto">
> = {
  primary: "white",
  secondary: "zinc",
  danger: "red",
};

/** Variant decides the icon color. Callers override only for amber or sky. */
export function resolveActionButtonIconColor(
  variant: ActionButtonVariant,
  iconColor: ActionButtonIconColor,
): Exclude<ActionButtonIconColor, "auto"> {
  if (iconColor === "auto") {
    return autoIconColorByVariant[variant];
  }
  return iconColor;
}
