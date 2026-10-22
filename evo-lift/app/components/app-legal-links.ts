import { PRIVACY_POLICY_HREF } from "@/app/privacy/privacy-policy";
import { TERMS_OF_USE_HREF } from "@/app/terms/terms-of-use";

export const GLOSSARY_HREF = "/glossary";

export type AppLegalLink = {
  href: string;
  label: string;
};

/** Glossary, Terms of use, and Privacy policy — same labels as the desktop footer. */
export const APP_LEGAL_LINKS: readonly AppLegalLink[] = [
  { href: GLOSSARY_HREF, label: "Glossary" },
  { href: TERMS_OF_USE_HREF, label: "Terms of use" },
  { href: PRIVACY_POLICY_HREF, label: "Privacy policy" },
];

/** Shared by the compact menu and the desktop footer. Focus ring matches other quiet legal links. */
export const legalLinkClassName =
  "rounded-sm font-medium text-zinc-700 underline-offset-2 hover:text-sky-800 hover:underline focus-visible:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60";

/** Exact path match. Child routes are not these pages. */
export function legalLinkAriaCurrent(pathname: string, href: string): "page" | undefined {
  return pathname === href ? "page" : undefined;
}

/** Current page keeps an underline so the cue is not color alone. */
export function legalLinkClassNameFor(isCurrent: boolean): string {
  return isCurrent ? `${legalLinkClassName} underline` : legalLinkClassName;
}
