import type { Metadata } from "next";
import { ReadingPage, ReadingSections } from "@/app/components/reading-page";
import { termsOfUseSections } from "@/app/terms/terms-of-use";
import { termsMetadata } from "@/lib/public-page-metadata";

export const metadata: Metadata = termsMetadata;

export default function TermsOfUsePage() {
  return (
    <ReadingPage title="Terms of use">
      <ReadingSections sections={termsOfUseSections} />
    </ReadingPage>
  );
}
