"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { shouldHideFooter } from "@/app/components/footer-visibility";

export function AppFooter() {
  const pathname = usePathname();
  const year = new Date().getFullYear();

  if (shouldHideFooter(pathname)) {
    return null;
  }

  return (
    <footer
      className="mt-2 hidden border-t border-zinc-200 text-xs text-zinc-600 md:block"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pt-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Link
            href="/glossary"
            className="font-medium text-zinc-700 underline-offset-2 hover:text-sky-800 hover:underline"
          >
            Glossary
          </Link>
          <Link
            href="/privacy"
            className="font-medium text-zinc-700 underline-offset-2 hover:text-sky-800 hover:underline"
          >
            Privacy policy
          </Link>
        </div>
        <p>© {year} Mathias Mayrhofer · EvoLift v6.0</p>
      </div>
    </footer>
  );
}
