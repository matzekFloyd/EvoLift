"use client";

import { useEffect, useMemo, useRef } from "react";
import { NextStep, NextStepProvider, useNextStep } from "nextstepjs";
import { ProductTourCard } from "@/app/components/product-tour-card";
import {
  PRODUCT_TOUR_CARD_FALLBACK_HEIGHT_PX,
  PRODUCT_TOUR_CARD_GAP_PX,
  PRODUCT_TOUR_CARD_LEFT_VAR,
  PRODUCT_TOUR_CARD_TOP_VAR,
  PRODUCT_TOUR_CARD_WIDTH_VAR,
  PRODUCT_TOUR_NAME,
  isProductTourFinished,
  markProductTourFinished,
  productTourCardBox,
  productTourCenteredCardBox,
  productTourScrollDelta,
  productTourSelector,
  productTourSteps,
  type ProductTourFlagStore,
} from "@/lib/product-tour";

const TOUR_CARD_READY_ATTR = "data-evolift-tour-card";

type ProductTourRuntimeProps = {
  userId: string;
  onFinished: () => void;
};

function browserFlagStore(): ProductTourFlagStore {
  return window.localStorage;
}

/**
 * Place the NextStep card under the highlighted control. On a phone the card
 * is almost the full viewport width. A low target scrolls up until the card fits.
 */
function writeProductTourCardBox(card: HTMLElement, box: { top: number; left: number; width: number }, mode: "ready" | "center") {
  const pointer = card.parentElement;
  if (!pointer) {
    return;
  }
  const pointerRect = pointer.getBoundingClientRect();
  const root = document.documentElement;
  root.style.setProperty(PRODUCT_TOUR_CARD_TOP_VAR, `${box.top - pointerRect.top}px`);
  root.style.setProperty(PRODUCT_TOUR_CARD_LEFT_VAR, `${box.left - pointerRect.left}px`);
  root.style.setProperty(PRODUCT_TOUR_CARD_WIDTH_VAR, `${box.width}px`);
  root.setAttribute(TOUR_CARD_READY_ATTR, mode);
}

/** Closing step. No spotlight; the card sits in the middle of Home. */
function placeCenteredProductTourCard() {
  const card = document.querySelector<HTMLElement>("[data-name='nextstep-card']");
  if (!card) {
    return;
  }
  const measuredHeight = card.getBoundingClientRect().height;
  const cardHeight = measuredHeight > 0 ? measuredHeight : PRODUCT_TOUR_CARD_FALLBACK_HEIGHT_PX;
  writeProductTourCardBox(
    card,
    productTourCenteredCardBox({
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      cardHeight,
    }),
    "center",
  );
}

function placeProductTourCard(selector: string) {
  const card = document.querySelector<HTMLElement>("[data-name='nextstep-card']");
  const target = document.querySelector(selector);
  if (!card || !target) {
    return;
  }

  const targetRect = target.getBoundingClientRect();
  const measuredHeight = card.getBoundingClientRect().height;
  const cardHeight = measuredHeight > 0 ? measuredHeight : PRODUCT_TOUR_CARD_FALLBACK_HEIGHT_PX;
  const cardTop = targetRect.bottom + PRODUCT_TOUR_CARD_GAP_PX;
  const scrollDelta = productTourScrollDelta({
    viewportHeight: window.innerHeight,
    targetTop: targetRect.top,
    cardTop,
    cardHeight,
  });

  let placedTarget = targetRect;
  if (scrollDelta > 1) {
    const before = window.scrollY;
    window.scrollBy({ top: scrollDelta, behavior: "auto" });
    if (window.scrollY !== before) {
      placedTarget = target.getBoundingClientRect();
    }
  }

  writeProductTourCardBox(
    card,
    productTourCardBox({
      viewportWidth: window.innerWidth,
      targetLeft: placedTarget.left,
      targetWidth: placedTarget.width,
      targetBottom: placedTarget.bottom,
    }),
    "ready",
  );
}

function clearProductTourCardPlacement() {
  const root = document.documentElement;
  root.style.removeProperty(PRODUCT_TOUR_CARD_TOP_VAR);
  root.style.removeProperty(PRODUCT_TOUR_CARD_LEFT_VAR);
  root.style.removeProperty(PRODUCT_TOUR_CARD_WIDTH_VAR);
  root.removeAttribute(TOUR_CARD_READY_ATTR);
}

function ProductTourController({ userId, onFinished }: ProductTourRuntimeProps) {
  const { startNextStep, isNextStepVisible, currentStep } = useNextStep();
  const finishedRef = useRef(false);
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;
  const steps = useMemo(() => productTourSteps(), []);
  const tours = useMemo(
    () => [
      {
        tour: PRODUCT_TOUR_NAME,
        steps: steps.map((step) => ({
          title: step.title,
          content: step.body,
          selector: step.targetId ? productTourSelector(step.targetId) : undefined,
          side: "bottom" as const,
          disableInteraction: false,
          blockKeyboardControl: true,
          pointerPadding: step.targetId ? 8 : 0,
          pointerRadius: step.targetId ? 8 : 0,
          nextRoute: step.nextPath ?? undefined,
          prevRoute: step.prevPath ?? undefined,
          selectorRetryAttempts: 25,
          selectorRetryDelay: 200,
        })),
      },
    ],
    [steps],
  );

  function finish() {
    if (finishedRef.current) {
      return;
    }
    finishedRef.current = true;
    markProductTourFinished(browserFlagStore(), userId);
    onFinishedRef.current();
  }

  useEffect(() => {
    if (isProductTourFinished(browserFlagStore(), userId)) {
      finishedRef.current = true;
      onFinishedRef.current();
      return;
    }
    startNextStep(PRODUCT_TOUR_NAME);
  }, [startNextStep, userId]);

  useEffect(() => {
    function onPopState() {
      window.setTimeout(() => {
        if (!finishedRef.current) {
          startNextStep(PRODUCT_TOUR_NAME);
        }
      }, 0);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [startNextStep]);

  useEffect(() => {
    if (!isNextStepVisible) {
      clearProductTourCardPlacement();
      return;
    }
    const step = steps[currentStep];
    if (!step) {
      return;
    }
    const tick = () => {
      if (step.targetId) {
        placeProductTourCard(productTourSelector(step.targetId));
      } else {
        placeCenteredProductTourCard();
      }
    };
    tick();
    const intervalId = window.setInterval(tick, 200);
    window.addEventListener("resize", tick);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("resize", tick);
      clearProductTourCardPlacement();
    };
  }, [currentStep, isNextStepVisible, steps]);

  return (
    <NextStep
      steps={tours}
      cardComponent={ProductTourCard}
      shadowRgb="24, 24, 27"
      shadowOpacity="0.45"
      displayArrow={false}
      disableConsoleLogs
      scrollToTop={false}
      noInViewScroll
      overlayZIndex={35}
      onComplete={finish}
      onSkip={finish}
    >
      {null}
    </NextStep>
  );
}

/** NextStep runtime. Loaded only after the tour should run, so it stays off the first-load bundle. */
export function ProductTourRuntime(props: ProductTourRuntimeProps) {
  return (
    <NextStepProvider>
      <ProductTourController {...props} />
    </NextStepProvider>
  );
}
