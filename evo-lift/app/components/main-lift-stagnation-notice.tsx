"use client";

import { useMemo } from "react";
import { StatusNotice } from "@/app/components/status-notice";
import {
  mainLiftStagnationMessage,
  stagnantMainLifts,
  type MainLiftStagnationSeries,
} from "@/lib/main-lift-stagnation";

type MainLiftStagnationNoticeProps = {
  series: readonly MainLiftStagnationSeries[];
  weeks: number;
};

export function MainLiftStagnationNotice({ series, weeks }: MainLiftStagnationNoticeProps) {
  const message = useMemo(
    () => mainLiftStagnationMessage(stagnantMainLifts(series, weeks), weeks),
    [series, weeks],
  );
  if (!message) {
    return null;
  }
  return <StatusNotice message={message} tone="warning" />;
}
