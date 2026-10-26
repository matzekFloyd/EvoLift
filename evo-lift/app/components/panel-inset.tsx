"use client";

import {
  createContext,
  createElement,
  useContext,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ReactNode,
} from "react";

export type PanelInsetTone = "muted" | "accent" | "contrast";

/** Grey group inside a white panel. Same border, radius, and fill on every page. */
export const panelInsetClassName = "rounded-md border border-zinc-200 bg-zinc-50/80";

/** Soft primary tint for highlighted / “next” rows inside a white panel. */
export const panelInsetAccentClassName = "rounded-md border border-sky-300 bg-sky-50";

/** White row on a tinted panel, so the row does not repeat the panel fill. */
export const panelInsetContrastClassName = "rounded-md border border-zinc-300 bg-white";

const toneClassByType: Record<PanelInsetTone, string> = {
  muted: panelInsetClassName,
  accent: panelInsetAccentClassName,
  contrast: panelInsetContrastClassName,
};

export function panelInsetClass(className?: string, tone: PanelInsetTone = "muted") {
  return [toneClassByType[tone], className].filter(Boolean).join(" ");
}

const PanelInsetSurfaceContext = createContext(false);

/**
 * True when a nested control should raise to white.
 * A contrast row is already white, so controls keep their zinc surface.
 */
export function usePanelInsetSurface(): boolean {
  return useContext(PanelInsetSurfaceContext);
}

/** Mark a custom shell (e.g. `AppTable`) as an inset surface without forcing muted fill classes. */
export function PanelInsetSurfaceProvider({ children }: { children: ReactNode }) {
  return (
    <PanelInsetSurfaceContext.Provider value={true}>{children}</PanelInsetSurfaceContext.Provider>
  );
}

type PanelInsetOwnProps<T extends ElementType> = {
  as?: T;
  tone?: PanelInsetTone;
  className?: string;
  children?: ReactNode;
};

type PanelInsetProps<T extends ElementType = "div"> = PanelInsetOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof PanelInsetOwnProps<T>>;

export function PanelInset<T extends ElementType = "div">({
  as,
  tone = "muted",
  className,
  children,
  ...rest
}: PanelInsetProps<T>) {
  const Tag = as ?? "div";
  return (
    <PanelInsetSurfaceContext.Provider value={tone !== "contrast"}>
      {createElement(
        Tag,
        {
          className: panelInsetClass(className, tone),
          ...rest,
        },
        children,
      )}
    </PanelInsetSurfaceContext.Provider>
  );
}
