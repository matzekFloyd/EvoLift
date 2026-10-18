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
import { EvoLiftMark } from "@/app/components/evo-lift-logo";
import { prefetchHomeSessionSummaries } from "@/lib/home-session-cache";
import { invalidateLoggedHistoryCaches } from "@/lib/logged-history-cache";
import { supabaseBrowserClient } from "@/lib/supabase/browser";

type CompactNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
};

function compactNavTileClassName(isActive: boolean) {
  return [
    "flex min-h-[5.75rem] flex-col items-center justify-center gap-2 rounded-md border px-3 py-4 text-center text-sm font-medium",
    isActive
      ? "border-sky-700 bg-sky-700 text-white shadow-sm"
      : "border-zinc-200 bg-white text-zinc-800 hover:border-sky-200 hover:bg-white",
  ].join(" ");
}

export function HeaderActions() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isCompactMenuOpen, setIsCompactMenuOpen] = useState(false);
  const compactMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const compactMenuFirstItemRef = useRef<HTMLAnchorElement | null>(null);

  const compactNavItems: CompactNavItem[] = [
    { href: "/", label: "Home", icon: House, isActive: pathname === "/" },
    {
      href: "/exercises",
      label: "Exercises",
      icon: Dumbbell,
      isActive: pathname.startsWith("/exercises"),
    },
    {
      href: "/insights",
      label: "Insights",
      icon: BarChart3,
      isActive: pathname.startsWith("/insights"),
    },
    {
      href: "/goals",
      label: "Goals",
      icon: Target,
      isActive: pathname.startsWith("/goals"),
    },
    {
      href: "/plans",
      label: "Plans",
      icon: ListOrdered,
      isActive: pathname.startsWith("/plans"),
    },
    {
      href: "/templates",
      label: "Templates",
      icon: FileStack,
      isActive: pathname.startsWith("/templates"),
    },
    {
      href: "/account",
      label: "Account",
      icon: UserRound,
      isActive: pathname === "/account",
    },
  ];

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const {
        data: { session },
      } = await supabaseBrowserClient.auth.getSession();

      if (!isMounted) {
        return;
      }

      setIsLoggedIn(Boolean(session));
      setUserEmail(session?.user.email ?? null);
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
        prefetchHomeSessionSummaries(supabaseBrowserClient, session.user.id);
      }
      if (event === "SIGNED_OUT") {
        invalidateLoggedHistoryCaches();
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
    invalidateLoggedHistoryCaches();
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
          href="/"
        >
          <EvoLiftMark className="h-8 w-8 shrink-0 transition-transform duration-150 group-hover:scale-110" />
          <span className="origin-left text-lg leading-none font-bold tracking-[-0.04em] text-sky-900 transition-transform duration-150 group-hover:scale-110">
            EvoLift
          </span>
        </Link>
        <div className="hidden shrink-0 items-center justify-end gap-1 sm:gap-2 md:flex">
          <AppHeaderNavLink href="/" label="Home" isActive={pathname === "/"} icon={House} />
          <AppHeaderNavLink
            href="/exercises"
            label="Exercises"
            isActive={pathname.startsWith("/exercises")}
            icon={Dumbbell}
          />
          <AppHeaderNavLink
            href="/insights"
            label="Insights"
            isActive={pathname.startsWith("/insights")}
            icon={BarChart3}
          />
          <AppHeaderNavLink
            href="/goals"
            label="Goals"
            isActive={pathname.startsWith("/goals")}
            icon={Target}
          />
          <AppHeaderNavLink
            href="/plans"
            label="Plans"
            isActive={pathname.startsWith("/plans")}
            icon={ListOrdered}
          />
          <AppHeaderNavLink
            href="/templates"
            label="Templates"
            isActive={pathname.startsWith("/templates")}
            icon={FileStack}
          />
          <AppHeaderNavLink
            href="/account"
            label="Account"
            isActive={pathname === "/account"}
            icon={UserRound}
            title={userEmail ? `Account — ${userEmail}` : "Account"}
          />
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
          </div>
        </div>
      ) : null}
    </header>
  );
}
