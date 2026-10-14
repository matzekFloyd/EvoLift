import type { ReactNode } from "react";
import { SectionHeading } from "@/app/components/section-heading";

type SettingsSectionHeaderProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
};

export function SettingsSectionHeader({
  title,
  description,
  icon,
}: SettingsSectionHeaderProps) {
  return (
    <>
      <SectionHeading className="inline-flex items-center gap-2">
        {icon}
        {title}
      </SectionHeading>
      {description ? (
        <p className="mt-1.5 max-w-prose text-sm leading-snug text-zinc-600">{description}</p>
      ) : null}
    </>
  );
}
