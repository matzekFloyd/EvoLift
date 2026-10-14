import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { HeaderActions } from "@/app/header-actions";
import { SelectFieldValueOnDoubleClick } from "@/app/components/select-field-value-on-double-click";
import { APP_DOCUMENT_TITLE } from "@/lib/page-title";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: APP_DOCUMENT_TITLE,
    template: `${APP_DOCUMENT_TITLE} - %s`,
  },
  description: "Evo Lift app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <SelectFieldValueOnDoubleClick />
        <HeaderActions />
        {children}
      </body>
    </html>
  );
}
