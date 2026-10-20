import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { PageShell } from "@/app/components/page-shell";
import { termsOfUseSections } from "@/app/terms/terms-of-use";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "Terms for using EvoLift accounts, the app, and personal API tokens.",
};

export default function TermsOfUsePage() {
  return (
    <PageShell>
      <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <ScrollText className="h-6 w-6 text-sky-700" aria-hidden />
        Terms of use
      </h1>
      <div className="panel divide-y divide-zinc-200">
        {termsOfUseSections.map((section) => (
          <section key={section.heading} className="px-4 py-3 sm:px-5">
            <h2 className="text-sm font-medium text-zinc-900">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-1 text-sm leading-snug text-zinc-600">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </PageShell>
  );
}
