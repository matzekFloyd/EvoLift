import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Edit template",
};

export default function EditTemplateLayout({ children }: { children: ReactNode }) {
  return children;
}
