import type { Metadata } from "next";
import type { ReactNode } from "react";
import { signedInRobots } from "@/lib/search-index";

export const metadata: Metadata = {
  robots: signedInRobots,
};

export default function SignedInAppLayout({ children }: { children: ReactNode }) {
  return children;
}
