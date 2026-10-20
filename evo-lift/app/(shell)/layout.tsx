import type { ReactNode } from "react";
import { ExerciseMetadataWarmup } from "@/app/components/exercise-metadata-warmup";
import { HeaderActions } from "@/app/header-actions";

export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ExerciseMetadataWarmup />
      <HeaderActions />
      {children}
    </>
  );
}
