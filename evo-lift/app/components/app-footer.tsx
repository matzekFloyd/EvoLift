"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_LEGAL_LINKS } from "@/app/components/app-legal-links";
import { shouldHideFooter } from "@/app/components/footer-visibility";
import { APP_VERSION_LABEL } from "@/lib/app-version";

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
          {APP_LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-medium text-zinc-700 underline-offset-2 hover:text-sky-800 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p>© {year} Mathias Mayrhofer · EvoLift {APP_VERSION_LABEL}</p>
      </div>
    </footer>
  );
}
