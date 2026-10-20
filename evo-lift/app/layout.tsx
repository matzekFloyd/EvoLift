import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SelectFieldValueOnDoubleClick } from "@/app/components/select-field-value-on-double-click";
import { APP_DOCUMENT_TITLE } from "@/lib/page-title";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
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
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <SelectFieldValueOnDoubleClick />
        {children}
      </body>
    </html>
  );
}
