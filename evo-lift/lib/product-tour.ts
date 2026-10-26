import { APP_HOME_PATH, appPath } from "@/lib/app-paths";

/** NextStep tour name for the first-login walkthrough. */
export const PRODUCT_TOUR_NAME = "first-login";

/** Phone layout from the tour: under 768px. Matches the compact header menu. */
export const PRODUCT_TOUR_PHONE_MAX_WIDTH_PX = 768;

export const PRODUCT_TOUR_CARD_MARGIN_PX = 16;
export const PRODUCT_TOUR_CARD_GAP_PX = 12;
export const PRODUCT_TOUR_DESKTOP_CARD_WIDTH_PX = 320;
export const PRODUCT_TOUR_CARD_FALLBACK_HEIGHT_PX = 196;

/** CSS variables the tour card position writes. The stylesheet reads the same names. */
export const PRODUCT_TOUR_CARD_TOP_VAR = "--evolift-tour-card-top";
export const PRODUCT_TOUR_CARD_LEFT_VAR = "--evolift-tour-card-left";
export const PRODUCT_TOUR_CARD_WIDTH_VAR = "--evolift-tour-card-width";

/**
 * Page controls the tour highlights. Header links stay out: on a phone, Plans,
 * Goals, and Account live in the full-screen menu, so the tour opens the page.
 */
export const PRODUCT_TOUR_TARGET_IDS = {
  createSession: "tour-create-session",
  plan: "tour-plan",
  goals: "tour-goals",
  insights: "tour-insights",
  bodyweight: "tour-bodyweight",
} as const;

export type ProductTourStepId =
  | "create-session"
  | "plan"
  | "goals"
  | "insights"
  | "bodyweight"
  | "ready";

export type ProductTourStep = {
  id: ProductTourStepId;
  title: string;
  body: string;
  /** Null centers the card, with no highlighted control. */
  targetId: string | null;
  /** Open this path when advancing. Null stays on the current page. */
  nextPath: string | null;
  /** Open this path when going back. Null stays on the current page. */
  prevPath: string | null;
};

const PRODUCT_TOUR_DONE_VALUE = "done";
const PRODUCT_TOUR_STORAGE_PREFIX = "evolift:product-tour";

export function productTourStorageKey(userId: string): string {
  return `${PRODUCT_TOUR_STORAGE_PREFIX}:${userId}`;
}

export function productTourSelector(targetId: string): string {
  return `#${targetId}`;
}

/** Account → Profile, where bodyweight lives. Login is the default tab. */
export function productTourAccountPath(): string {
  return `${appPath("/account")}?section=profile`;
}

export function productTourGoalsPath(): string {
  return appPath("/goals");
}

export function productTourInsightsPath(): string {
  return appPath("/insights");
}

/**
 * Logging, then a plan, then why bodyweight exists (Goals, then Insights),
 * then the field, then a closer on Home. Lift comparison is not on screen
 * until sessions exist, so the Insights step points at the page.
 */
export function productTourSteps(): readonly ProductTourStep[] {
  return [
    {
      id: "create-session",
      title: "Create session",
      body: "A workout session is one workout. Logging sets happens there.",
      targetId: PRODUCT_TOUR_TARGET_IDS.createSession,
      nextPath: null,
      prevPath: null,
    },
    {
      id: "plan",
      title: "Plan",
      body: "A plan is an ordered cycle of up to 7 days. One plan can be active. Starting a day copies its exercises and targets into a new workout session.",
      targetId: PRODUCT_TOUR_TARGET_IDS.plan,
      nextPath: productTourGoalsPath(),
      prevPath: null,
    },
    {
      id: "goals",
      title: "Goals",
      body: "You already have goals on the main barbell lifts. They are multiples of bodyweight.",
      targetId: PRODUCT_TOUR_TARGET_IDS.goals,
      nextPath: productTourInsightsPath(),
      prevPath: APP_HOME_PATH,
    },
    {
      id: "insights",
      title: "Insights",
      body: "After you log, Lift comparison on this page uses bodyweight, sex, and date of birth.",
      targetId: PRODUCT_TOUR_TARGET_IDS.insights,
      nextPath: productTourAccountPath(),
      prevPath: productTourGoalsPath(),
    },
    {
      id: "bodyweight",
      title: "Bodyweight (kg)",
      body: "Enter it here. It does not change the weights you log.",
      targetId: PRODUCT_TOUR_TARGET_IDS.bodyweight,
      nextPath: APP_HOME_PATH,
      prevPath: productTourInsightsPath(),
    },
    {
      id: "ready",
      title: "You're set",
      body: "Create a session when you're ready to log.",
      targetId: null,
      nextPath: null,
      prevPath: productTourAccountPath(),
    },
  ];
}

export function isProductTourPhoneWidth(viewportWidth: number): boolean {
  return viewportWidth < PRODUCT_TOUR_PHONE_MAX_WIDTH_PX;
}

/** Pages the tour opens. Session routes stay off so logging is not covered. */
export function isProductTourPath(pathname: string): boolean {
  return (
    pathname === APP_HOME_PATH ||
    pathname === appPath("/account") ||
    pathname === productTourGoalsPath() ||
    pathname === productTourInsightsPath()
  );
}

/**
 * Start on Home after a successful sign-in, once, until Skip or Done.
 * Logging routes are not tour paths, so the overlay is not mounted there.
 */
export function shouldStartProductTour(input: {
  pathname: string;
  userId: string | null;
  finished: boolean;
}): boolean {
  return Boolean(input.userId) && !input.finished && input.pathname === APP_HOME_PATH;
}

export type ProductTourFlagStore = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
};

export function isProductTourFinished(store: ProductTourFlagStore, userId: string): boolean {
  try {
    return store.getItem(productTourStorageKey(userId)) === PRODUCT_TOUR_DONE_VALUE;
  } catch {
    return false;
  }
}

/** Returns false when the browser refuses the write. The tour still closes. */
export function markProductTourFinished(store: ProductTourFlagStore, userId: string): boolean {
  try {
    store.setItem(productTourStorageKey(userId), PRODUCT_TOUR_DONE_VALUE);
    return true;
  } catch {
    return false;
  }
}

export type ProductTourCardBox = {
  top: number;
  left: number;
  width: number;
};

/**
 * Card box in viewport coordinates. On a phone it uses almost the full width,
 * with space at the sides, and sits under the target. On a wider screen it stays
 * a fixed width, centered under the target, and clamped inside the viewport.
 */
export function productTourCardBox(input: {
  viewportWidth: number;
  targetLeft: number;
  targetWidth: number;
  targetBottom: number;
  cardWidth?: number;
  gap?: number;
  margin?: number;
}): ProductTourCardBox {
  const gap = input.gap ?? PRODUCT_TOUR_CARD_GAP_PX;
  const margin = input.margin ?? PRODUCT_TOUR_CARD_MARGIN_PX;
  const preferredWidth = input.cardWidth ?? PRODUCT_TOUR_DESKTOP_CARD_WIDTH_PX;
  const phone = isProductTourPhoneWidth(input.viewportWidth);
  const width = phone
    ? Math.max(0, input.viewportWidth - margin * 2)
    : Math.min(preferredWidth, Math.max(0, input.viewportWidth - margin * 2));
  const centered = input.targetLeft + input.targetWidth / 2 - width / 2;
  const left = phone
    ? margin
    : Math.max(margin, Math.min(centered, input.viewportWidth - margin - width));
  return {
    top: input.targetBottom + gap,
    left,
    width,
  };
}

/** Closing card, centered, with the same side space as the other phone cards. */
export function productTourCenteredCardBox(input: {
  viewportWidth: number;
  viewportHeight: number;
  cardHeight: number;
  cardWidth?: number;
  margin?: number;
}): ProductTourCardBox {
  const margin = input.margin ?? PRODUCT_TOUR_CARD_MARGIN_PX;
  const preferredWidth = input.cardWidth ?? PRODUCT_TOUR_DESKTOP_CARD_WIDTH_PX;
  const phone = isProductTourPhoneWidth(input.viewportWidth);
  const width = phone
    ? Math.max(0, input.viewportWidth - margin * 2)
    : Math.min(preferredWidth, Math.max(0, input.viewportWidth - margin * 2));
  const left = Math.max(margin, (input.viewportWidth - width) / 2);
  const top = Math.max(margin, (input.viewportHeight - input.cardHeight) / 2);
  return { top, left, width };
}

/**
 * How far to scroll down so a card under the target stays in the viewport.
 * Caps the scroll so the target itself stays below the top margin.
 */
export function productTourScrollDelta(input: {
  viewportHeight: number;
  targetTop: number;
  cardTop: number;
  cardHeight: number;
  margin?: number;
}): number {
  const margin = input.margin ?? PRODUCT_TOUR_CARD_MARGIN_PX;
  const overflow = input.cardTop + input.cardHeight + margin - input.viewportHeight;
  if (overflow <= 1) {
    return 0;
  }
  const maxDelta = Math.max(0, input.targetTop - margin);
  return Math.min(overflow, maxDelta);
}
