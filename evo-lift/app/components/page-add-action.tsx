import Link from "next/link";
import { Plus } from "lucide-react";

const primaryClassName =
  "page-add-action inline-flex h-10 w-10 shrink-0 items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 text-sm font-medium text-white hover:border-sky-600 hover:bg-sky-600 hover:text-white sm:w-auto sm:px-3 sm:py-2 [&_svg]:text-white hover:[&_svg]:text-white";

const secondaryClassName =
  "page-add-action inline-flex h-10 w-10 shrink-0 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 text-sm font-medium text-zinc-800 hover:border-sky-300 hover:bg-zinc-100 hover:text-zinc-800 sm:w-auto sm:px-3 sm:py-2 [&_svg]:text-sky-700";

type PageAddActionProps = (
  | { label: string; href: string }
  | { label: string; onClick: () => void; disabled?: boolean }
) & {
  /** Defaults to primary. Use secondary when another filled sky CTA owns the focal area. */
  variant?: "primary" | "secondary";
};

/** Page-header add action. Label hides below the `sm` breakpoint; the accessible name stays. */
export function PageAddAction(props: PageAddActionProps) {
  const variant = props.variant ?? "primary";
  const className = variant === "secondary" ? secondaryClassName : primaryClassName;
  const content = (
    <>
      <Plus className="h-3.5 w-3.5" aria-hidden />
      <span className="hidden sm:inline">{props.label}</span>
    </>
  );

  if ("href" in props) {
    return (
      <Link href={props.href} className={className} aria-label={props.label} title={props.label}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {content}
    </button>
  );
}
