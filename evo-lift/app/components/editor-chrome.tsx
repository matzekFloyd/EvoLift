"use client";

import { useState, type ReactNode } from "react";
import { NotesTextareaField } from "@/app/components/notes-textarea-field";
import { optionalNotesMode } from "@/app/components/editor-fields";

const textButtonClassName =
  "rounded-sm text-sm font-medium text-zinc-800 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60";

export function EditorHeading({ title, back }: { title: string; back?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <h1 className="min-w-0 break-words text-2xl font-medium tracking-tight text-zinc-900">{title}</h1>
      {back}
    </div>
  );
}

export function RequiredMark() {
  return (
    <span className="font-normal text-zinc-500" aria-hidden>
      {" "}
      *
    </span>
  );
}

export function OptionalNotesField({
  addLabel,
  value,
  onChange,
  maxLength,
  placeholder,
}: {
  addLabel: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const mode = optionalNotesMode(value, open);

  if (mode === "add") {
    return (
      <button type="button" onClick={() => setOpen(true)} className={textButtonClassName}>
        {addLabel}
      </button>
    );
  }

  if (mode === "preview") {
    const preview = value.replace(/\s+/g, " ").trim();
    return (
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate text-sm text-zinc-800">{preview}</p>
        <button type="button" onClick={() => setOpen(true)} className={`shrink-0 ${textButtonClassName}`}>
          Edit notes
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end">
        <button type="button" onClick={() => setOpen(false)} className={textButtonClassName}>
          Hide notes
        </button>
      </div>
      <NotesTextareaField
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxLength={maxLength}
        heightClassName="h-24"
        autoFocus
      />
    </div>
  );
}
