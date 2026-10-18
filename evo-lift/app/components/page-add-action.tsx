import Link from "next/link";
import { Plus } from "lucide-react";

const className =
  "page-add-action inline-flex h-10 w-10 shrink-0 items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 text-sm font-medium text-white sm:w-auto sm:px-3 sm:py-2 [&_svg]:text-white";

type PageAddActionProps =
  | { label: string; href: string }
  | { label: string; onClick: () => void; disabled?: boolean };

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
