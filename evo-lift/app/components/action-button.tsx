"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  resolveActionButtonIconColor,
  type ActionButtonIconColor,
  type ActionButtonVariant,
} from "@/app/components/action-button-icon";
import { usePanelInsetSurface } from "@/app/components/panel-inset";

type ActionButtonSize = "sm" | "md" | "lg";

type ActionButtonProps = {
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  fullWidth?: boolean;
  /**
   * White fill for secondary buttons on muted inset surfaces.
   * Defaults to on inside `PanelInset`; set `false` to opt out, `true` to force.
   */
  raised?: boolean;
  iconColor?: ActionButtonIconColor;
  className?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variantClassByType: Record<ActionButtonVariant, string> = {
  primary:
    "border-sky-700 bg-sky-700 text-white hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60",
  secondary:
    "border-zinc-300 bg-zinc-50 text-zinc-800 hover:border-sky-300 hover:bg-zinc-100 disabled:opacity-60",
  danger:
    "border-red-300 bg-red-50 text-red-700 hover:border-red-400 hover:bg-red-100 disabled:opacity-60",
};

const raisedSecondaryClass =
  "border-zinc-300 bg-white text-zinc-800 hover:border-sky-300 hover:bg-zinc-50 disabled:opacity-60";

const sizeClassByType: Record<ActionButtonSize, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-10 px-3 py-2 text-sm",
  lg: "h-12 px-5 text-base",
};

const iconClassByType: Record<Exclude<ActionButtonIconColor, "auto">, string> = {
  sky: "[&_svg]:text-sky-700",
  zinc: "[&_svg]:text-zinc-500",
  amber: "[&_svg]:text-amber-600",
  red: "[&_svg]:text-red-600",
  white: "[&_svg]:text-white",
};

/**
 * Global `a:hover` recolors every link. A filled control must keep its own text color.
 */
const linkTextClassByVariant: Record<ActionButtonVariant, string> = {
  primary: "!text-white hover:!text-white",
  secondary: "!text-zinc-800 hover:!text-zinc-800",
  danger: "!text-red-700 hover:!text-red-700",
};

function actionControlClassName(input: {
  variant: ActionButtonVariant;
  size: ActionButtonSize;
  fullWidth: boolean;
  raised: boolean | undefined;
  onPanelInset: boolean;
  iconColor: ActionButtonIconColor;
  className: string;
}): string {
  const resolvedIconColor = resolveActionButtonIconColor(input.variant, input.iconColor);
  const widthClass = input.fullWidth ? "w-full" : "w-fit";
  const useRaised =
    input.variant === "secondary" &&
    (input.raised === true || (input.raised !== false && input.onPanelInset));
  const variantClass = useRaised ? raisedSecondaryClass : variantClassByType[input.variant];

  return [
    "inline-flex items-center justify-center gap-1 rounded-md border font-medium leading-none",
    variantClass,
    sizeClassByType[input.size],
    widthClass,
    iconClassByType[resolvedIconColor],
    "[&_svg]:shrink-0 [&_svg]:self-center",
    input.className,
  ].join(" ");
}

export function ActionButton({
  variant = "secondary",
  size = "md",
  fullWidth = false,
  raised,
  iconColor = "auto",
  className = "",
  type = "button",
  children,
  ...rest
}: ActionButtonProps) {
  const onPanelInset = usePanelInsetSurface();

  return (
    <button
      type={type}
      className={actionControlClassName({
        variant,
        size,
        fullWidth,
        raised,
        onPanelInset,
        iconColor,
        className,
      })}
      {...rest}
    >
      {children}
    </button>
  );
}

type ActionLinkProps = {
  href: string;
  variant?: ActionButtonVariant;
  size?: ActionButtonSize;
  fullWidth?: boolean;
  raised?: boolean;
  iconColor?: ActionButtonIconColor;
  className?: string;
  children: ReactNode;
  id?: string;
  "aria-label"?: string;
  title?: string;
};

/** Same control as `ActionButton`, as a link. */
export function ActionLink({
  href,
  variant = "primary",
  size = "md",
  fullWidth = false,
  raised,
  iconColor = "auto",
  className = "",
  children,
  id,
  "aria-label": ariaLabel,
  title,
}: ActionLinkProps) {
  const onPanelInset = usePanelInsetSurface();

  return (
    <Link
      id={id}
      href={href}
      aria-label={ariaLabel}
      title={title}
      className={actionControlClassName({
        variant,
        size,
        fullWidth,
        raised,
        onPanelInset,
        iconColor,
        className: [linkTextClassByVariant[variant], "no-underline hover:no-underline", className]
          .filter(Boolean)
          .join(" "),
      })}
    >
      {children}
    </Link>
  );
}
