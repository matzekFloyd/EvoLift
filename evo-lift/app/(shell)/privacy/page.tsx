import type { Metadata } from "next";
import { Shield } from "lucide-react";
import { LinkedText } from "@/app/components/linked-text";
import { PageShell } from "@/app/components/page-shell";
import { privacyPolicySections } from "@/app/privacy/privacy-policy";
import { privacyMetadata } from "@/lib/public-page-metadata";

export const metadata: Metadata = privacyMetadata;

export default function PrivacyPolicyPage() {
  return (
    <PageShell>
      <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Shield className="h-6 w-6 text-sky-700" aria-hidden />
        Privacy policy
      </h1>
      <div className="panel divide-y divide-zinc-200">
        {privacyPolicySections.map((section) => (
          <section key={section.heading} className="px-4 py-3 sm:px-5">
            <h2 className="text-sm font-medium text-zinc-900">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-1 text-sm leading-snug text-zinc-600">
                <LinkedText text={paragraph} />
              </p>
            ))}
          </section>
        ))}
      </div>
    </PageShell>
  );
}
