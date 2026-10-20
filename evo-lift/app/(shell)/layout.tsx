import type { ReactNode } from "react";
import { HeaderActions } from "@/app/header-actions";

export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <HeaderActions />
      {children}
    </>
  );
}
