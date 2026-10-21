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
