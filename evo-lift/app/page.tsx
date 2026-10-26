import type { Metadata } from "next";
import Link from "next/link";
import { ActionLink } from "@/app/components/action-button";
import { EvoLiftBrand } from "@/app/components/evo-lift-logo";
import { quietLinkClassName } from "@/app/components/inline-link-class";
import { PageFrame } from "@/app/components/page-frame";
import { PRIVACY_POLICY_HREF } from "@/app/privacy/privacy-policy";
import { TERMS_OF_USE_HREF } from "@/app/terms/terms-of-use";
import {
  PUBLIC_HOME_ACCOUNT_NOTE,
  PUBLIC_HOME_HEADING,
  PUBLIC_HOME_CTA_HREF,
  PUBLIC_HOME_CTA_LABEL,
  PUBLIC_HOME_PRIVACY_LABEL,
  PUBLIC_HOME_TERMS_LABEL,
  publicHomeMetadata,
} from "@/app/public-home";

export const metadata: Metadata = publicHomeMetadata;

export default function PublicHomePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <div className="bg-gradient-to-l from-sky-200 via-sky-100 to-sky-50 pt-[env(safe-area-inset-top,0px)]">
        <div className="mx-auto flex w-full justify-center px-4 py-6 sm:px-6">
          <EvoLiftBrand
            markClassName="h-12 w-12"
            titleClassName="text-2xl leading-none font-bold tracking-[-0.04em] text-sky-900"
          />
        </div>
      </div>
      <PageFrame>
        <div className="flex w-full flex-col items-center text-center pt-12 sm:pt-16">
          <h1 className="max-w-[65ch] text-balance text-center text-3xl font-semibold leading-tight tracking-tight text-zinc-900">
            {PUBLIC_HOME_HEADING}
          </h1>
          <p className="mt-4 max-w-[65ch] text-balance text-center text-base leading-relaxed text-zinc-700">
            {PUBLIC_HOME_ACCOUNT_NOTE}
          </p>
          <ActionLink href={PUBLIC_HOME_CTA_HREF} variant="primary" className="mt-12">
            {PUBLIC_HOME_CTA_LABEL}
          </ActionLink>
          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
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
        </div>
      </PageFrame>
    </div>
  );
}
