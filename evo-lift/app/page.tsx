import type { Metadata } from "next";
import Link from "next/link";
import { ActionLink } from "@/app/components/action-button";
import { EvoLiftBrand } from "@/app/components/evo-lift-logo";
import { quietLinkClassName } from "@/app/components/inline-link-class";
import { PublicHomeFigure, PublicHomeInsightsExample, PublicHomePlanExample } from "@/app/public-home-figure";
import { PRIVACY_POLICY_HREF } from "@/app/privacy/privacy-policy";
import { TERMS_OF_USE_HREF } from "@/app/terms/terms-of-use";
import {
  PUBLIC_HOME_AREAS,
  PUBLIC_HOME_FREE_LINE,
  PUBLIC_HOME_CLOSE_LINES,
  PUBLIC_HOME_CTA_HREF,
  PUBLIC_HOME_CTA_LABEL,
  PUBLIC_HOME_HEADING,
  PUBLIC_HOME_PRIVACY_LABEL,
  PUBLIC_HOME_SUBHEAD,
  PUBLIC_HOME_TERMS_LABEL,
  publicHomeMetadata,
} from "@/app/public-home";

export const metadata: Metadata = publicHomeMetadata;

function PublicHomeCta({ className }: { className: string }) {
  return (
    <div className={`flex justify-center lg:justify-start ${className}`}>
      <ActionLink href={PUBLIC_HOME_CTA_HREF} variant="primary" size="lg" className="public-home-cta">
        {PUBLIC_HOME_CTA_LABEL}
        <span className="relative -top-1 text-xs leading-none">*</span>
      </ActionLink>
    </div>
  );
}

const bandRowClassName =
  "mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-4 text-center sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:gap-12 lg:text-left";

export default function PublicHomePage() {
  return (
    <div className="relative flex min-h-full flex-1 flex-col bg-zinc-50">
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .public-home-cta {
            transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1);
          }
          .public-home-cta:active {
            transform: scale(0.97);
          }
        }
      `}</style>
      <a
        href="#offer"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-4 focus-visible:left-4 focus-visible:z-20 focus-visible:rounded-md focus-visible:bg-white focus-visible:px-3 focus-visible:py-2 focus-visible:text-sm focus-visible:font-medium focus-visible:text-zinc-900 focus-visible:ring-2 focus-visible:ring-sky-700"
      >
        Skip to content
      </a>
      <header className="bg-gradient-to-l from-sky-200 via-sky-100 to-sky-50 pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex w-full max-w-5xl justify-center px-4 py-6 sm:px-6 lg:justify-start">
          <EvoLiftBrand
            markClassName="h-12 w-12"
            titleClassName="text-2xl leading-none font-bold tracking-[-0.04em] text-sky-900"
          />
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <section className="bg-white">
          <div className={`${bandRowClassName} pt-8 pb-12 sm:pt-10`}>
            <div className="w-full max-w-2xl">
              <h1 id="offer" className="max-w-2xl text-balance text-3xl font-semibold text-zinc-900">
                {PUBLIC_HOME_HEADING}
              </h1>
              <p className="mt-4 max-w-2xl text-pretty text-base text-zinc-700">{PUBLIC_HOME_SUBHEAD}</p>
              <PublicHomeCta className="mt-8" />
            </div>
            <PublicHomeFigure />
          </div>
        </section>
        <section>
          <div className={`${bandRowClassName} py-12`}>
            <div className="w-full max-w-2xl">
              <h2 className="text-2xl font-semibold text-zinc-900">{PUBLIC_HOME_AREAS[0].title}</h2>
              <p className="mt-2 text-pretty text-base text-zinc-700">{PUBLIC_HOME_AREAS[0].detail}</p>
            </div>
            <PublicHomePlanExample />
          </div>
        </section>
        <section className="bg-white">
          <div className={`${bandRowClassName} py-12`}>
            <div className="w-full max-w-2xl">
              <h2 className="text-2xl font-semibold text-zinc-900">{PUBLIC_HOME_AREAS[1].title}</h2>
              <p className="mt-2 text-pretty text-base text-zinc-700">{PUBLIC_HOME_AREAS[1].detail}</p>
            </div>
            <PublicHomeInsightsExample />
          </div>
        </section>
        <section className="flex flex-1 flex-col justify-center">
          <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-4 py-12 text-center sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:text-left">
            <p className="w-full max-w-2xl text-3xl font-semibold text-zinc-900">
              {PUBLIC_HOME_CLOSE_LINES.map((line) => (
                <span key={line} className="block text-balance">
                  {line}
                </span>
              ))}
            </p>
            <PublicHomeCta className="shrink-0" />
          </div>
        </section>
      </main>
      <footer
        className="border-t border-zinc-200 bg-white"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 lg:justify-start">
            <Link
              href={TERMS_OF_USE_HREF}
              target="_blank"
              rel="noopener noreferrer"
              prefetch={false}
              className={quietLinkClassName}
            >
              {PUBLIC_HOME_TERMS_LABEL}
            </Link>
            <Link
              href={PRIVACY_POLICY_HREF}
              target="_blank"
              rel="noopener noreferrer"
              prefetch={false}
              className={quietLinkClassName}
            >
              {PUBLIC_HOME_PRIVACY_LABEL}
            </Link>
          </div>
          <p id="free" className="text-right text-sm text-zinc-600">
            * {PUBLIC_HOME_FREE_LINE}
          </p>
        </div>
      </footer>
    </div>
  );
}
