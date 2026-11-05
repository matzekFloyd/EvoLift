import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { KeyboardInset } from "@/app/components/keyboard-inset";
import { SelectFieldValueOnDoubleClick } from "@/app/components/select-field-value-on-double-click";
import { APP_DOCUMENT_TITLE } from "@/lib/page-title";
import { PUBLIC_APP_ORIGIN } from "@/lib/public-app-origin";
import "./globals.css";

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  metadataBase: new URL(PUBLIC_APP_ORIGIN),
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
        <KeyboardInset />
        <SelectFieldValueOnDoubleClick />
        {children}
      </body>
    </html>
  );
}
