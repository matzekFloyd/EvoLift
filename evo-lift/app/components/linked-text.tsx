import { proseLinkClassName } from "@/app/components/inline-link-class";
import { PUBLIC_APP_ORIGIN } from "@/lib/public-app-origin";

export type LinkedTextPart =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string };

const URL_OR_EMAIL = /https?:\/\/[^\s<]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

const TRAILING_PUNCTUATION = /[.,);:]+$/;

/** Named pages written in the copy. Matched as whole phrases, after URLs and emails. */
const PAGE_PHRASES: ReadonlyArray<{ label: string; href: string }> = [
  { label: "privacy policy", href: "/privacy" },
  { label: "legal notice", href: "/legal" },
];

function splitTrailingPunctuation(raw: string): { value: string; rest: string } {
  const rest = raw.match(TRAILING_PUNCTUATION)?.[0] ?? "";
  return { value: rest ? raw.slice(0, -rest.length) : raw, rest };
}

function linkUrlAndEmail(text: string): LinkedTextPart[] {
  const parts: LinkedTextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_OR_EMAIL)) {
    const index = match.index ?? 0;
    if (index > last) {
      parts.push({ type: "text", value: text.slice(last, index) });
    }
    const { value, rest } = splitTrailingPunctuation(match[0]);
    const href = value.includes("@") ? `mailto:${value}` : value;
    parts.push({ type: "link", value, href });
    if (rest) {
      parts.push({ type: "text", value: rest });
    }
    last = index + match[0].length;
  }
  if (last < text.length) {
    parts.push({ type: "text", value: text.slice(last) });
  }
  if (parts.length === 0) {
    parts.push({ type: "text", value: text });
  }
  return parts;
}

function splitPagePhrases(text: string): LinkedTextPart[] {
  let earliest: { label: string; href: string; index: number } | null = null;
  for (const phrase of PAGE_PHRASES) {
    const index = text.indexOf(phrase.label);
    if (index === -1) {
      continue;
    }
    if (!earliest || index < earliest.index) {
      earliest = { ...phrase, index };
    }
  }
  if (!earliest) {
    return [{ type: "text", value: text }];
  }
  const before = text.slice(0, earliest.index);
  const after = text.slice(earliest.index + earliest.label.length);
  return [
    ...(before ? [{ type: "text" as const, value: before }] : []),
    { type: "link" as const, value: earliest.label, href: earliest.href },
    ...(after ? splitPagePhrases(after) : []),
  ];
}

/** Splits plain copy into text and anchors for URLs, email addresses, and named pages. */
export function linkedTextParts(text: string): LinkedTextPart[] {
  return linkUrlAndEmail(text).flatMap((part) =>
    part.type === "text" ? splitPagePhrases(part.value) : [part],
  );
}

/** Web addresses outside this site open in a new tab. Mail and this site stay here. */
export function linkedTextOpensInNewTab(href: string): boolean {
  if (!href.startsWith("http://") && !href.startsWith("https://")) {
    return false;
  }
  try {
    return new URL(href).origin !== PUBLIC_APP_ORIGIN;
  } catch {
    return true;
  }
}

export function LinkedText({ text }: { text: string }) {
  return linkedTextParts(text).map((part, index) => {
    if (part.type === "text") {
      return <span key={`text-${index}`}>{part.value}</span>;
    }
    const newTab = linkedTextOpensInNewTab(part.href);
    return (
      <a
        key={`${part.href}-${index}`}
        href={part.href}
        className={proseLinkClassName}
        {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {part.value}
      </a>
    );
  });
}
