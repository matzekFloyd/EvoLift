import type { ReactNode } from "react";
import { uniqueReadingAnchorIds } from "@/app/components/reading-anchor";
import { LinkedText } from "@/app/components/linked-text";
import { PageShell } from "@/app/components/page-shell";

/** Left-aligned reading column. About 54ch so a full IBM Plex Sans line stays under 75 characters. */
export const readingMeasureClassName = "max-w-[54ch]";

export const readingTitleClassName = "text-3xl font-semibold text-zinc-900";

export const readingLedeClassName = "text-base leading-7 text-zinc-600";

export const readingHeadingClassName = "text-base font-medium text-zinc-900";

export const readingBodyClassName = "text-base leading-7 text-zinc-700 [overflow-wrap:anywhere]";

/** Quiet section link. The # is the sign, so it is not color alone. It stays visible on a narrow screen. On a wide screen with a pointer it appears when the heading is hovered or focused. */
const readingAnchorClassName =
  "ml-2 align-baseline text-sm font-normal text-zinc-600 no-underline hover:text-sky-800 focus-visible:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-700 focus-visible:ring-offset-2 rounded-sm [@media(hover:hover)_and_(min-width:40rem)]:opacity-0 [@media(hover:hover)_and_(min-width:40rem)]:group-hover:opacity-100 [@media(hover:hover)_and_(min-width:40rem)]:group-focus-within:opacity-100";

const readingStackClassName = "flex flex-col gap-8";

type ReadingAnchorHeadingProps = {
  as: "h2" | "dt";
  id: string;
  label: string;
  className: string;
};

export function ReadingAnchorHeading({ as: Tag, id, label, className }: ReadingAnchorHeadingProps) {
  return (
    <Tag id={id} className={`group scroll-mt-8 ${className}`}>
      {label}
      <a href={`#${id}`} aria-label={`Link to ${label}`} className={readingAnchorClassName}>
        #
      </a>
    </Tag>
  );
}

type ReadingPageProps = {
  title: string;
  lede?: string;
  children: ReactNode;
};

/** Shared title and measure for Glossary, Privacy, Terms, and Legal notice. */
export function ReadingPage({ title, lede, children }: ReadingPageProps) {
  return (
    <PageShell>
      <article className={`${readingMeasureClassName} ${readingStackClassName} pb-8`}>
        <header className="flex flex-col gap-2">
          <h1 className={readingTitleClassName}>{title}</h1>
          {lede ? <p className={readingLedeClassName}>{lede}</p> : null}
        </header>
        {children}
      </article>
    </PageShell>
  );
}

export type ReadingSectionContent = {
  heading: string;
  paragraphs: readonly string[];
};

export function ReadingSections({ sections }: { sections: readonly ReadingSectionContent[] }) {
  const ids = uniqueReadingAnchorIds(sections.map((section) => section.heading));
  return (
    <div className={readingStackClassName}>
      {sections.map((section, index) => (
        <section key={section.heading} className="flex flex-col gap-3">
          <ReadingAnchorHeading
            as="h2"
            id={ids[index]}
            label={section.heading}
            className={readingHeadingClassName}
          />
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph} className={readingBodyClassName}>
              <LinkedText text={paragraph} />
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
