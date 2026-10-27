"use client";

import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import {
  ACCOUNT_EXPORT_FAILED,
  ACCOUNT_IMPORT_FAILED,
  ACCOUNT_IMPORT_SUCCESS,
  accountImportSelectionLabel,
  invalidateAfterAccountImport,
} from "@/app/account/account-data";
import { ActionButton } from "@/app/components/action-button";
import { AppDialog } from "@/app/components/app-dialog";
import { SectionHeading } from "@/app/components/section-heading";
import { SettingsSection, SettingsSectionBody } from "@/app/components/settings-section";
import { SettingsSectionHeader } from "@/app/components/settings-section-header";
import { StatusNotice } from "@/app/components/status-notice";
import {
  ACCOUNT_CSV_ZIP_FILENAME,
  ACCOUNT_JSON_FILENAME,
  skippedExercisesMessage,
} from "@/lib/account-transfer";
import { filenameFromContentDisposition, saveAccountFile } from "@/lib/account-file-download";

type AccountDataSectionProps = {
  accessToken: string;
  onImported?: () => void;
};

type Notice = { tone: "error" | "warning" | "success"; message: string };

export function AccountDataSection({ accessToken, onImported }: AccountDataSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  async function download(format: "json" | "csv") {
    setIsWorking(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/account/export?format=${format}`, {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setNotice({ tone: "error", message: body?.error || ACCOUNT_EXPORT_FAILED });
        return;
      }
      const bytes = new Uint8Array(await response.arrayBuffer());
      const fallback = format === "json" ? ACCOUNT_JSON_FILENAME : ACCOUNT_CSV_ZIP_FILENAME;
      await saveAccountFile({
        filename: filenameFromContentDisposition(response.headers.get("content-disposition"), fallback),
        bytes,
        mediaType: response.headers.get("content-type") ?? "application/octet-stream",
      });
    } catch {
      setNotice({ tone: "error", message: ACCOUNT_EXPORT_FAILED });
    } finally {
      setIsWorking(false);
    }
  }

  async function importFiles(mode: "add" | "replace") {
    if (files.length === 0) {
      setNotice({ tone: "error", message: "Please choose a JSON file or the CSV set." });
      return;
    }
    setIsWorking(true);
    setNotice(null);
    setWarning(null);
    setReplaceOpen(false);
    const body = new FormData();
    body.set("mode", mode);
    for (const file of files) {
      body.append("file", file);
    }
    try {
      const response = await fetch("/api/account/import", {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}` },
        body,
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        data?: { skippedExercises?: string[] };
      } | null;
      if (!response.ok) {
        setNotice({ tone: "error", message: payload?.error || ACCOUNT_IMPORT_FAILED });
        return;
      }
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      invalidateAfterAccountImport();
      onImported?.();
      setNotice({ tone: "success", message: ACCOUNT_IMPORT_SUCCESS });
      setWarning(skippedExercisesMessage(payload?.data?.skippedExercises ?? []));
    } catch {
      setNotice({ tone: "error", message: ACCOUNT_IMPORT_FAILED });
    } finally {
      setIsWorking(false);
    }
  }

  const selection = accountImportSelectionLabel(files.map((file) => file.name));

  return (
    <SettingsSection>
      <SettingsSectionHeader
        title="Your data"
        description="Download this account as JSON or as CSV files. Import adds to this account. Replace removes the workout data already here. Passwords and API tokens are not included."
      />
      <SettingsSectionBody>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <ActionButton
              type="button"
              variant="secondary"
              disabled={isWorking}
              onClick={() => void download("json")}
              className="w-full sm:w-auto sm:flex-1"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Download JSON
            </ActionButton>
            <ActionButton
              type="button"
              variant="secondary"
              disabled={isWorking}
              onClick={() => void download("csv")}
              className="w-full sm:w-auto sm:flex-1"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Download CSV
            </ActionButton>
            <ActionButton
              type="button"
              variant="secondary"
              iconColor="sky"
              disabled={isWorking}
              onClick={() => fileInputRef.current?.click()}
              className="w-full sm:w-auto sm:flex-1"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden />
              Import
            </ActionButton>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,.zip,application/json,text/csv,application/zip"
              multiple
              tabIndex={-1}
              aria-hidden
              className="sr-only"
              onChange={(event) => {
                setFiles(Array.from(event.target.files ?? []));
                setNotice(null);
                setWarning(null);
                setReplaceOpen(false);
              }}
            />
          </div>
          {selection ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-600">{selection}</p>
              <div className="flex gap-2">
                <ActionButton
                  type="button"
                  variant="primary"
                  disabled={isWorking}
                  onClick={() => void importFiles("add")}
                >
                  Add to account
                </ActionButton>
                <ActionButton
                  type="button"
                  variant="danger"
                  disabled={isWorking}
                  onClick={() => setReplaceOpen(true)}
                >
                  Replace
                </ActionButton>
              </div>
            </div>
          ) : null}
          {notice ? (
            <StatusNotice message={notice.message} tone={notice.tone} onDismiss={() => setNotice(null)} />
          ) : null}
          {warning ? (
            <StatusNotice message={warning} tone="warning" onDismiss={() => setWarning(null)} />
          ) : null}
        </div>
      </SettingsSectionBody>
      {replaceOpen ? (
        <AppDialog titleId="replace-account-data-title" panelClassName="max-w-sm" onClose={() => setReplaceOpen(false)}>
          <SectionHeading id="replace-account-data-title">Replace account data?</SectionHeading>
          <p className="mt-1 text-sm text-zinc-600">
            This removes sessions, templates, plans, goals, the bodyweight log, profile metrics, exercise defaults,
            and hidden exercises in this account, then imports the file. This cannot be undone.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <ActionButton type="button" variant="secondary" disabled={isWorking} onClick={() => setReplaceOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton type="button" variant="danger" disabled={isWorking} onClick={() => void importFiles("replace")}>
              {isWorking ? "Replacing..." : "Replace"}
            </ActionButton>
          </div>
        </AppDialog>
      ) : null}
    </SettingsSection>
  );
}
