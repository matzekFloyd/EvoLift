import type { ReactNode } from "react";
import { AppFooter } from "@/app/components/app-footer";
import { PageFrame } from "@/app/components/page-frame";

type PageShellProps = {
  children: ReactNode;
  className?: string;
};

export function PageShell({ children, className }: PageShellProps) {
  return (
    <PageFrame className={className}>
      {children}
      <AppFooter />
    </PageFrame>
  );
}
