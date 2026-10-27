import type { Metadata } from "next";
import { ReadingPage, ReadingSections } from "@/app/components/reading-page";
import { privacyPolicySections } from "@/app/privacy/privacy-policy";
import { privacyMetadata } from "@/lib/public-page-metadata";

export const metadata: Metadata = privacyMetadata;

export default function PrivacyPolicyPage() {
  return (
    <ReadingPage title="Privacy policy">
      <ReadingSections sections={privacyPolicySections} />
    </ReadingPage>
  );
}
