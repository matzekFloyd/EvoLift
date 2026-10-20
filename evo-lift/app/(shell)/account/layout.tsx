import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist_Mono } from "next/font/google";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Account",
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <div className={`${geistMono.variable} contents`}>{children}</div>;
}
