"use client";

import Link from "next/link";
import {
  BarChart3,
  Dumbbell,
  FileStack,
  House,
  ListOrdered,
  LogOut,
  Menu,
  Target,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AppHeaderNavCaption,
  AppHeaderNavLink,
  appHeaderNavIconInactiveClassName,
  appHeaderNavIconInactiveGlyphClassName,
} from "@/app/components/app-header-nav-link";
import { APP_LEGAL_LINKS } from "@/app/components/app-legal-links";
import { EvoLiftMark } from "@/app/components/evo-lift-logo";
import { APP_HOME_PATH, appPath, isAppNavItemActive, type AppNavMatch } from "@/lib/app-paths";
import { prefetchHomeSessionSummaries } from "@/lib/home-session-cache";
import { clearSignedInMemory, rememberUserId } from "@/lib/signed-in-memory";
import { getBrowserUser } from "@/lib/supabase/browser-auth";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

type HeaderNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  match: AppNavMatch;
};

function compactNavTileClassName(isActive: boolean) {
  return [
    "flex min-h-[5.75rem] flex-col items-center justify-center gap-2 rounded-md border px-3 py-4 text-center text-sm font-medium",
    isActive
      ? "border-sky-700 bg-sky-700 text-white shadow-sm"
      : "border-zinc-200 bg-white text-zinc-800 hover:border-sky-200 hover:bg-white",
  ].join(" ");
}

const HEADER_NAV: HeaderNavItem[] = [
  { href: APP_HOME_PATH, label: "Home", icon: House, match: "exact" },
  { href: appPath("/exercises"), label: "Exercises", icon: Dumbbell, match: "section" },
  { href: appPath("/insights"), label: "Insights", icon: BarChart3, match: "section" },
  { href: appPath("/goals"), label: "Goals", icon: Target, match: "section" },
  { href: appPath("/plans"), label: "Plans", icon: ListOrdered, match: "section" },
  { href: appPath("/templates"), label: "Templates", icon: FileStack, match: "section" },
  { href: appPath("/account"), label: "Account", icon: UserRound, match: "exact" },
];

export function HeaderActions() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isCompactMenuOpen, setIsCompactMenuOpen] = useState(false);
  const compactMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const compactMenuFirstItemRef = useRef<HTMLAnchorElement | null>(null);

  const compactNavItems = HEADER_NAV.map((item) => ({
    ...item,
    isActive: isAppNavItemActive(pathname, item.href, item.match),
  }));

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const user = await getBrowserUser();

      if (!isMounted) {
        return;
      }

      setIsLoggedIn(Boolean(user));
      setUserEmail(user?.email ?? null);
      setIsReady(true);
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabaseBrowserClient.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(Boolean(session));
      setUserEmail(session?.user.email ?? null);
      setIsReady(true);
      if (event === "SIGNED_IN" && session) {
        rememberUserId(session.user.id, session.user.email ?? null);
        prefetchHomeSessionSummaries(supabaseBrowserClient, session.user.id);
      }
      if (event === "SIGNED_OUT") {
        clearSignedInMemory();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isCompactMenuOpen) {
      return;
    }
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    // Lock scroll on html so scrollbar-gutter: stable keeps the same right inset.
    root.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCompactMenu({ returnFocus: true });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const focusTimer = window.setTimeout(() => {
      compactMenuFirstItemRef.current?.focus();
    }, 0);
    return () => {
      root.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [isCompactMenuOpen]);

  if (!isReady || !isLoggedIn) {
    return null;
  }

  async function handleAuthClick() {
    clearSignedInMemory();
    await supabaseBrowserClient.auth.signOut();
    router.replace("/login");
  }

  function closeCompactMenu({ returnFocus }: { returnFocus: boolean }) {
    setIsCompactMenuOpen(false);
    if (returnFocus) {
      window.requestAnimationFrame(() => {
        compactMenuTriggerRef.current?.focus();
      });
    }
  }

  return (
    <header className="bg-gradient-to-l from-sky-200 via-sky-100 to-sky-50 pt-[env(safe-area-inset-top,0px)]">
      <nav
        className={`mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-6 ${
          isCompactMenuOpen ? "relative z-[90]" : ""
        }`}
      >
        <Link
          className="group inline-flex items-center gap-2 rounded-md px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-100"
          href={APP_HOME_PATH}
        >
          <EvoLiftMark className="h-8 w-8 shrink-0 transition-transform duration-150 group-hover:scale-110" />
          <span className="origin-left text-lg leading-none font-bold tracking-[-0.04em] text-sky-900 transition-transform duration-150 group-hover:scale-110">
            EvoLift
          </span>
        </Link>
        <div className="hidden shrink-0 items-center justify-end gap-1 sm:gap-2 md:flex">
          {compactNavItems.map((item) => (
            <AppHeaderNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              isActive={item.isActive}
              icon={item.icon}
              title={
                item.href === appPath("/account")
                  ? userEmail
                    ? `Account — ${userEmail}`
                    : "Account"
                  : undefined
              }
            />
          ))}
          <button
            type="button"
            onClick={handleAuthClick}
            className={`${appHeaderNavIconInactiveClassName} header-nav-logout`}
          >
            <LogOut className={appHeaderNavIconInactiveGlyphClassName} aria-hidden />
            <AppHeaderNavCaption label="Log out" />
          </button>
        </div>
        <div className="md:hidden">
          <button
            ref={compactMenuTriggerRef}
            type="button"
            onClick={() => setIsCompactMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-zinc-700 hover:bg-sky-100/70 hover:text-sky-900"
            aria-label={isCompactMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={isCompactMenuOpen}
            aria-controls="compact-header-menu"
          >
            {isCompactMenuOpen ? (
              <X className={appHeaderNavIconInactiveGlyphClassName} aria-hidden />
            ) : (
              <Menu className={appHeaderNavIconInactiveGlyphClassName} aria-hidden />
            )}
          </button>
        </div>
      </nav>
      {isCompactMenuOpen ? (
        <div
          id="compact-header-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-[80] flex flex-col bg-gradient-to-b from-sky-100 via-sky-50 to-zinc-100 md:hidden"
        >
          <div className="flex min-h-0 flex-1 flex-col px-4 pt-[calc(4.5rem+env(safe-area-inset-top,0px))] pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
            <div className="grid grid-cols-2 gap-3">
              {compactNavItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    ref={index === 0 ? compactMenuFirstItemRef : undefined}
                    href={item.href}
                    onClick={() => closeCompactMenu({ returnFocus: false })}
                    aria-current={item.isActive ? "page" : undefined}
                    className={compactNavTileClassName(item.isActive)}
                  >
                    <Icon
                      className={`h-6 w-6 shrink-0 ${item.isActive ? "text-white" : "text-sky-700"}`}
                      aria-hidden
                    />
                    {item.label}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={async () => {
                  closeCompactMenu({ returnFocus: false });
                  await handleAuthClick();
                }}
                className={compactNavTileClassName(false)}
              >
                <LogOut className="h-6 w-6 shrink-0 text-sky-700" aria-hidden />
                Log out
              </button>
            </div>
            <nav
              aria-label="Legal"
              className="mt-auto flex flex-col gap-2 border-t border-zinc-200 pt-4 text-sm"
            >
              {APP_LEGAL_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => closeCompactMenu({ returnFocus: false })}
                  className="font-medium text-zinc-700 underline-offset-2 hover:text-sky-800 hover:underline"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
