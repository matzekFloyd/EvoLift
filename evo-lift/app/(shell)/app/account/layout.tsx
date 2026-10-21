import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono } from "next/font/google";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  fallback: ["ui-monospace", "monospace"],
});

export const metadata: Metadata = {
  title: "Account",
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <div className={`${ibmPlexMono.variable} contents`}>{children}</div>;
}
