import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type AppHeaderNavLinkProps = {
  href: string;
  label: string;
  isActive: boolean;
  icon: LucideIcon;
  /** Extra tooltip, such as the account email. The visible label is the control text. */
  title?: string;
};

const appHeaderNavControlClassName =
  "group inline-flex items-center rounded-md p-2 leading-none transition-[background-color,color] duration-150 focus-visible:outline-none";

/** Inactive nav icon control (shared by links and log out) so surfaces stay consistent. */
export const appHeaderNavIconInactiveClassName = `${appHeaderNavControlClassName} bg-white text-zinc-700 hover:bg-zinc-200/80 hover:text-zinc-900 focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white`;

const appHeaderNavIconActiveClassName = `${appHeaderNavControlClassName} bg-sky-700 text-white hover:bg-sky-600 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-sky-700`;

export const appHeaderNavIconInactiveGlyphClassName = "h-4 w-4 shrink-0 text-sky-800";

/** Label revealed when the desktop nav control is hovered or focused. */
export function AppHeaderNavCaption({ label }: { label: string }) {
  return (
    <span className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-150 group-hover:grid-cols-[1fr] group-focus-visible:grid-cols-[1fr]">
      <span className="min-w-0 overflow-hidden">
        <span className="ps-1.5 text-sm leading-4 font-medium whitespace-nowrap">{label}</span>
      </span>
    </span>
  );
}

/**
 * Desktop header nav control. Resting state is the icon. Hover and keyboard focus reveal the
 * label beside the icon without changing the control’s height. Active: filled sky; icon is always
 * explicit `text-white` on active so it cannot inherit the sky focus ring color. Focus:
 * inactive uses sky ring + white offset; active uses white ring + sky offset so the glyph
 * stays visible.
 */
export function AppHeaderNavLink({ href, label, isActive, icon: Icon, title }: AppHeaderNavLinkProps) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      title={title}
      className={isActive ? appHeaderNavIconActiveClassName : appHeaderNavIconInactiveClassName}
    >
      <Icon className={isActive ? "h-4 w-4 shrink-0 text-white" : appHeaderNavIconInactiveGlyphClassName} aria-hidden />
      <AppHeaderNavCaption label={label} />
    </Link>
  );
}
