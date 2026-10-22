"use client";

import { useSyncExternalStore } from "react";

const HYDRATION_LOCALE = "en";

function subscribeDisplayLocale() {
  return () => {};
}

function clientDisplayLocale() {
  return navigator.language || HYDRATION_LOCALE;
}

function serverDisplayLocale() {
  return HYDRATION_LOCALE;
}

/** Browser language after hydration. The server and the first client render share English so month names match. */
export function useDisplayLocale(): string {
  return useSyncExternalStore(subscribeDisplayLocale, clientDisplayLocale, serverDisplayLocale);
}
