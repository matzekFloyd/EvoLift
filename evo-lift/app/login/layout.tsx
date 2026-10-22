import type { Metadata } from "next";
import type { ReactNode } from "react";
import { loginMetadata } from "@/lib/public-page-metadata";

export const metadata: Metadata = loginMetadata;

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
