import type { MouseEvent, ReactNode } from "react";

type AppDialogProps = {
  /** Id of the visible dialog title (for `aria-labelledby`). */
  titleId: string;
  children: ReactNode;
  /**
   * Extra classes on the white panel. Include width (`max-w-sm` / `max-w-md`) and any
   * height/layout needs. Defaults to `max-w-md`.
   */
  panelClassName?: string;
  /** When set, backdrop clicks call this and panel clicks do not close the dialog. */
  onBackdropClick?: () => void;
};

const panelBaseClassName =
  "my-auto w-full rounded-lg border border-zinc-200 bg-white p-4 shadow-lg";

/**
 * Centered modal overlay. Use for confirmations and forms so every dialog
 * opens in the middle of the viewport (including compact widths).
 */
export function AppDialog({
  titleId,
  children,
  panelClassName = "max-w-md",
  onBackdropClick,
}: AppDialogProps) {
  function handlePanelClick(event: MouseEvent<HTMLDivElement>) {
    if (onBackdropClick) {
      event.stopPropagation();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onBackdropClick}
    >
      <div className={[panelBaseClassName, panelClassName].filter(Boolean).join(" ")} onClick={handlePanelClick}>
        {children}
      </div>
    </div>
  );
}
