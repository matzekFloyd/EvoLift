import Link from "next/link";
import { Plus } from "lucide-react";

const className =
  "page-add-action inline-flex h-10 items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-3 py-2 text-sm font-medium text-white [&_svg]:text-white";

type PageAddActionProps =
  | { label: string; href: string; onClick?: never; disabled?: never }
  | { label: string; href?: never; onClick: () => void; disabled?: boolean };

/** Page-header primary action. Label hides below the `sm` breakpoint; the accessible name stays. */
export function PageAddAction(props: PageAddActionProps) {
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
