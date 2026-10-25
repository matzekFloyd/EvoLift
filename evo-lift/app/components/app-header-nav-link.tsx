import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { Ref } from "react";
import {
  headerNavGlyphClassName,
  headerNavItemClassName,
  headerNavTileClassName,
  headerNavTileGlyphClassName,
} from "@/app/header-nav";

export type HeaderNavLayout = "row" | "tile";

type AppHeaderNavVisualProps = {
  label: string;
  icon: LucideIcon;
  layout: HeaderNavLayout;
  isActive: boolean;
};

function headerNavControlClassName(isActive: boolean, className?: string): string {
  return [headerNavItemClassName(isActive), className].filter(Boolean).join(" ");
}

/** Icon and visible name. The name is the accessible name — it is not clipped. */
function AppHeaderNavVisual({ label, icon: Icon, layout, isActive }: AppHeaderNavVisualProps) {
  const glyphClassName =
    layout === "tile"
      ? `${headerNavTileGlyphClassName} ${isActive ? "text-white" : "text-sky-700"}`
      : headerNavGlyphClassName;
  return (
    <>
      <Icon className={glyphClassName} aria-hidden />
      <span>{label}</span>
    </>
  );
}

type AppHeaderNavLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  /** Extra tooltip, such as the account email. The visible label is the control text. */
  title?: string;
  /** Row on the desktop header. Tile in the compact menu. */
  layout?: HeaderNavLayout;
  className?: string;
  onClick?: () => void;
  ref?: Ref<HTMLAnchorElement>;
};

/**
 * Nav destination. The row sits on the sky header. The tile is the compact-menu cell.
 */
export function AppHeaderNavLink({
  href,
  label,
  isActive,
  icon,
  title,
  layout = "row",
  className,
  onClick,
  ref,
}: AppHeaderNavLinkProps) {
  return (
    <Link
      ref={ref}
      href={href}
      aria-current={isActive ? "page" : undefined}
      title={title}
      onClick={onClick}
      className={
        layout === "tile" ? headerNavTileClassName(isActive) : headerNavControlClassName(isActive, className)
      }
    >
      <AppHeaderNavVisual label={label} icon={icon} layout={layout} isActive={isActive} />
    </Link>
  );
}

type AppHeaderNavButtonProps = {
  label: string;
  icon: LucideIcon;
  layout?: HeaderNavLayout;
  className?: string;
  onClick: () => void;
};

/** Same item as a nav link, for an action such as Log out. It is never the current page. */
export function AppHeaderNavButton({ label, icon, layout = "row", className, onClick }: AppHeaderNavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={layout === "tile" ? headerNavTileClassName(false) : headerNavControlClassName(false, className)}
    >
      <AppHeaderNavVisual label={label} icon={icon} layout={layout} isActive={false} />
    </button>
  );
}
