"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import { confirmSignedInUser } from "@/lib/confirm-signed-in-user";
import {
  isProductTourFinished,
  isProductTourPath,
  shouldStartProductTour,
} from "@/lib/product-tour";

type ProductTourRuntimeProps = {
  userId: string;
  onFinished: () => void;
};

/**
 * Starts the first-login tour on Home. The NextStep bundle loads only then.
 * Session routes unmount the overlay so logging stays available. Skip or Done
 * stores a per-account flag in this browser.
 */
export function ProductTourHost() {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [finished, setFinished] = useState(true);
  const [checked, setChecked] = useState(false);
  const [armed, setArmed] = useState(false);
  const [Runtime, setRuntime] = useState<ComponentType<ProductTourRuntimeProps> | null>(null);

  useEffect(() => {
    if (!isProductTourPath(pathname)) {
      return;
    }
    let mounted = true;
    void confirmSignedInUser().then((visit) => {
      if (!mounted) {
        return;
      }
      if (visit.status !== "ready") {
        setChecked(true);
        return;
      }
      setUserId(visit.userId);
      setFinished(isProductTourFinished(window.localStorage, visit.userId));
      setChecked(true);
    });
    return () => {
      mounted = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!checked || finished || !userId) {
      return;
    }
    if (shouldStartProductTour({ pathname, userId, finished })) {
      setArmed(true);
    }
  }, [checked, finished, pathname, userId]);

  const show = Boolean(armed && checked && userId && !finished && isProductTourPath(pathname));

  useEffect(() => {
    if (!show || Runtime) {
      return;
    }
    let cancelled = false;
    void import("@/app/components/product-tour-runtime").then((mod) => {
      if (!cancelled) {
        setRuntime(() => mod.ProductTourRuntime);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [Runtime, show]);

  if (!show || !Runtime || !userId) {
    return null;
  }

  return <Runtime userId={userId} onFinished={() => setFinished(true)} />;
}
