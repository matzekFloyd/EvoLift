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
  listDialogFocusable,
  resolveDialogKeyAction,
} from "@/app/components/app-dialog-focus";
import { AppHeaderNavButton, AppHeaderNavLink } from "@/app/components/app-header-nav-link";
import { APP_LEGAL_LINKS, legalLinkAriaCurrent, legalLinkClassNameFor } from "@/app/components/app-legal-links";
import { EvoLiftMark } from "@/app/components/evo-lift-logo";
import {
  DESKTOP_NAV_MEDIA_QUERY,
  HEADER_LOG_OUT_LABEL,
  compactMenuButtonClassName,
  compactMenuButtonLabel,
  compactMenuFocusable,
  compactMenuInitialFocusVisible,
  compactMenuShouldClose,
  focusHeaderControl,
  headerLogOutGroupClassName,
  headerNavGlyphClassName,
} from "@/app/header-nav";
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
  const compactLogoRef = useRef<HTMLAnchorElement | null>(null);
  const compactMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const compactMenuRef = useRef<HTMLDivElement | null>(null);
  const compactMenuFirstItemRef = useRef<HTMLAnchorElement | null>(null);
  const compactMenuInitialFocusVisibleRef = useRef(true);

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
      const dialogItems = compactMenuRef.current ? listDialogFocusable(compactMenuRef.current) : [];
      const focusable = compactMenuFocusable({
        logo: compactLogoRef.current,
        trigger: compactMenuTriggerRef.current,
        dialogItems,
      });
      const activeElement = document.activeElement;
      const activeIndex = activeElement instanceof HTMLElement ? focusable.indexOf(activeElement) : -1;
      const action = resolveDialogKeyAction({
        key: event.key,
        shiftKey: event.shiftKey,
        focusableCount: focusable.length,
        activeIndex,
      });

      if (action.type === "close") {
        event.preventDefault();
        closeCompactMenu({ returnFocus: true });
        return;
      }
      if (action.type === "trap") {
        event.preventDefault();
        if (action.cycle.action === "focus") {
          focusHeaderControl(focusable[action.cycle.index] ?? null);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const focusTimer = window.setTimeout(() => {
      focusHeaderControl(compactMenuFirstItemRef.current, {
        focusVisible: compactMenuInitialFocusVisibleRef.current,
      });
    }, 0);
    return () => {
      root.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(focusTimer);
    };
  }, [isCompactMenuOpen]);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_NAV_MEDIA_QUERY);
    const onChange = () => {
      if (compactMenuShouldClose(media.matches)) {
        setIsCompactMenuOpen(false);
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

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
        focusHeaderControl(compactMenuTriggerRef.current);
      });
    }
  }

  function accountTitle(href: string): string | undefined {
    if (href !== appPath("/account")) {
      return undefined;
    }
    return userEmail ? `Account — ${userEmail}` : "Account";
  }

  return (
    <header className="bg-gradient-to-l from-sky-200 via-sky-100 to-sky-50 pt-[env(safe-area-inset-top,0px)]">
      <nav
        aria-label="Main"
        className={`mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-6 ${
          isCompactMenuOpen ? "relative z-[90]" : ""
        }`}
      >
        <Link
          ref={compactLogoRef}
          className="inline-flex items-center gap-2 rounded-md px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-2 focus-visible:ring-offset-sky-100"
          href={APP_HOME_PATH}
        >
          <EvoLiftMark className="h-8 w-8 shrink-0" />
          <span className="text-lg leading-none font-bold tracking-[-0.04em] text-sky-900">EvoLift</span>
        </Link>
        <div className="hidden shrink-0 items-center justify-end gap-1 lg:flex">
          {compactNavItems.map((item) => (
            <AppHeaderNavLink
              key={item.href}
              href={item.href}
              label={item.label}
              isActive={item.isActive}
              icon={item.icon}
              title={accountTitle(item.href)}
            />
          ))}
          <div className={headerLogOutGroupClassName()}>
            <AppHeaderNavButton
              icon={LogOut}
              label={HEADER_LOG_OUT_LABEL}
              onClick={() => {
                void handleAuthClick();
              }}
            />
          </div>
        </div>
        <div className="lg:hidden">
          <button
            ref={compactMenuTriggerRef}
            type="button"
            onClick={(event) => {
              if (!isCompactMenuOpen) {
                compactMenuInitialFocusVisibleRef.current = compactMenuInitialFocusVisible(event.detail);
              }
              setIsCompactMenuOpen((prev) => !prev);
            }}
            className={compactMenuButtonClassName}
            aria-label={compactMenuButtonLabel(isCompactMenuOpen)}
            aria-expanded={isCompactMenuOpen}
            aria-controls="compact-header-menu"
          >
            {isCompactMenuOpen ? (
              <X className={headerNavGlyphClassName} aria-hidden />
            ) : (
              <Menu className={headerNavGlyphClassName} aria-hidden />
            )}
          </button>
        </div>
      </nav>
      {isCompactMenuOpen ? (
        <div
          ref={compactMenuRef}
          id="compact-header-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-0 z-[80] flex flex-col bg-gradient-to-b from-sky-100 via-sky-50 to-zinc-100 lg:hidden"
        >
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-[calc(4.5rem+env(safe-area-inset-top,0px))] pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
            <div className="grid grid-cols-2 gap-3">
              {compactNavItems.map((item, index) => (
                <AppHeaderNavLink
                  key={item.href}
                  ref={index === 0 ? compactMenuFirstItemRef : undefined}
                  href={item.href}
                  label={item.label}
                  isActive={item.isActive}
                  icon={item.icon}
                  title={accountTitle(item.href)}
                  layout="tile"
                  onClick={() => closeCompactMenu({ returnFocus: false })}
                />
              ))}
              <AppHeaderNavButton
                layout="tile"
                icon={LogOut}
                label={HEADER_LOG_OUT_LABEL}
                onClick={() => {
                  closeCompactMenu({ returnFocus: false });
                  void handleAuthClick();
                }}
              />
            </div>
            <nav
              aria-label="Legal"
              className="mt-auto flex flex-col gap-2 border-t border-zinc-200 pt-4 text-sm"
            >
              {APP_LEGAL_LINKS.map((link) => {
                const current = legalLinkAriaCurrent(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => closeCompactMenu({ returnFocus: false })}
                    aria-current={current}
                    className={legalLinkClassNameFor(current === "page")}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
