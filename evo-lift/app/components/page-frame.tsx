import type { ReactNode } from "react";

type PageFrameProps = {
  children: ReactNode;
  className?: string;
};

/** Page width and padding, without the signed-in footer. */
export function PageFrame({ children, className }: PageFrameProps) {
  return (
    <main
      className={`mx-auto flex w-full max-w-5xl flex-1 flex-col gap-4 px-4 pt-6 pb-12 sm:px-6 sm:pt-8 sm:pb-16${
        className ? ` ${className}` : ""
      }`}
    >
      {children}
    </main>
  );
}
