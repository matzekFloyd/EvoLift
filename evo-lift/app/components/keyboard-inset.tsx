"use client";

import { useEffect, type RefObject } from "react";
import {
  isKeyboardTextEntry,
  publishedKeyboardOverlapPx,
  scrollDeltaToRevealField,
} from "@/lib/keyboard-overlap";

const ROOT_OVERLAP = "--keyboard-overlap";
const ROOT_VISUAL_HEIGHT = "--visual-viewport-height";

/** Publishes the on-screen keyboard overlap so fixed sheets and dialogs can sit above it. */
export function KeyboardInset() {
  useEffect(() => {
    const root = document.documentElement;
    const visual = window.visualViewport;

    const publish = () => {
      const visualHeight = visual?.height ?? window.innerHeight;
      const overlap = publishedKeyboardOverlapPx({
        innerHeight: window.innerHeight,
        visualHeight,
        visualOffsetTop: visual?.offsetTop ?? 0,
        userAgent: navigator.userAgent,
        maxTouchPoints: navigator.maxTouchPoints ?? 0,
      });
      root.style.setProperty(ROOT_OVERLAP, `${overlap}px`);
      root.style.setProperty(ROOT_VISUAL_HEIGHT, `${Math.max(0, Math.round(visualHeight))}px`);
    };

    publish();
    visual?.addEventListener("resize", publish);
    visual?.addEventListener("scroll", publish);
    window.addEventListener("resize", publish);
    return () => {
      visual?.removeEventListener("resize", publish);
      visual?.removeEventListener("scroll", publish);
      window.removeEventListener("resize", publish);
      root.style.removeProperty(ROOT_OVERLAP);
      root.style.removeProperty(ROOT_VISUAL_HEIGHT);
    };
  }, []);

  return null;
}

/** Keeps the focused text field inside this scroller when the keyboard opens. */
export function useRevealTextField(scrollerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }

    const reveal = () => {
      const container = scrollerRef.current;
      const active = document.activeElement;
      if (!container || !(active instanceof HTMLElement) || !container.contains(active)) {
        return;
      }
      if (!isKeyboardTextEntry(active)) {
        return;
      }
      const containerRect = container.getBoundingClientRect();
      const fieldRect = active.getBoundingClientRect();
      const delta = scrollDeltaToRevealField({
        scrollTop: container.scrollTop,
        containerHeight: container.clientHeight,
        fieldOffsetTop: fieldRect.top - containerRect.top + container.scrollTop,
        fieldHeight: fieldRect.height,
        margin: 12,
      });
      if (delta !== 0) {
        container.scrollTop += delta;
      }
    };

    const revealAfterLayout = () => {
      window.requestAnimationFrame(reveal);
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && isKeyboardTextEntry(target)) {
        revealAfterLayout();
      }
    };

    scroller.addEventListener("focusin", onFocusIn);
    const visual = window.visualViewport;
    visual?.addEventListener("resize", revealAfterLayout);
    visual?.addEventListener("scroll", revealAfterLayout);
    return () => {
      scroller.removeEventListener("focusin", onFocusIn);
      visual?.removeEventListener("resize", revealAfterLayout);
      visual?.removeEventListener("scroll", revealAfterLayout);
    };
  }, [scrollerRef]);
}
