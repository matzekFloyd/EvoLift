import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { SelectFieldValueOnDoubleClick } from "@/app/components/select-field-value-on-double-click";
import { APP_DOCUMENT_TITLE } from "@/lib/page-title";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
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
      className={`${ibmPlexSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 font-sans text-zinc-900">
        <SelectFieldValueOnDoubleClick />
        {children}
      </body>
    </html>
  );
}
