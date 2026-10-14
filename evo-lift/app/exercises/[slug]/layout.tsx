import type { Metadata } from "next";
import type { ReactNode } from "react";
import { APP_DOCUMENT_TITLE } from "@/lib/page-title";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { getExercisePageTitle } from "@/server/db/exercises";

type ExerciseDetailLayoutProps = {
  children: ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: Pick<ExerciseDetailLayoutProps, "params">): Promise<Metadata> {
  const { slug } = await params;
  try {
    const title = await getExercisePageTitle(createServiceRoleClient(), slug);
    if (!title) {
      return { title: { absolute: APP_DOCUMENT_TITLE } };
    }
    return { title };
  } catch {
    return { title: { absolute: APP_DOCUMENT_TITLE } };
  }
}

export default function ExerciseDetailLayout({ children }: ExerciseDetailLayoutProps) {
  return children;
}
