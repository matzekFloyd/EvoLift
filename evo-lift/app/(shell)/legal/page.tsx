import type { Metadata } from "next";
import { ReadingPage, ReadingSections } from "@/app/components/reading-page";
import { legalNoticeSections } from "@/app/legal/legal-notice";
import { legalMetadata } from "@/lib/public-page-metadata";

export const metadata: Metadata = legalMetadata;

export default function LegalNoticePage() {
  return (
    <ReadingPage title="Legal notice">
      <ReadingSections sections={legalNoticeSections} />
    </ReadingPage>
  );
}
