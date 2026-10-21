import { useEffect, useRef, useState } from "react";
import { birthYearFromDate, validateBodyMetricsInput } from "@/lib/body-metrics";
import { latestBodyweightEntry } from "@/lib/bodyweight-log";
import type { AccountProfileSnapshot } from "@/lib/account-profile-cache";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import { refillAccountCache } from "@/app/account/account-cache";
import { localIsoDate } from "@/app/account/account-profile-form";
import type { AccountSectionId } from "@/app/account/account-section";
import type { BodyweightLogRow } from "@/app/account/bodyweight-log-panel";
import { useAccountNotice } from "@/app/account/use-account-notice";

export function useAccountMetrics({
  userId,
  cachedAccount,
  activeSection,
}: {
  userId: string | null;
  cachedAccount: AccountProfileSnapshot | null;
  activeSection: AccountSectionId;
}) {
  const dirtyRef = useRef(false);
  const [, setHasProfileMetrics] = useState(cachedAccount?.hasProfileMetrics ?? false);
  const [bodyweightKg, setBodyweightKg] = useState(cachedAccount?.bodyweightKg ?? "");
  const [bodyweightLog, setBodyweightLog] = useState<BodyweightLogRow[]>(cachedAccount?.bodyweightLog ?? []);
  const [heightCm, setHeightCm] = useState(cachedAccount?.heightCm ?? "");
  const [sex, setSex] = useState(cachedAccount?.sex ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(cachedAccount?.dateOfBirth ?? "");
  const [birthYearFallback, setBirthYearFallback] = useState<number | null>(cachedAccount?.birthYearFallback ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const notice = useAccountNotice("success");
  const clearNotice = notice.clear;

  useEffect(() => {
    clearNotice();
  }, [activeSection, clearNotice]);

  function applySnapshot(snapshot: AccountProfileSnapshot) {
    setHasProfileMetrics(snapshot.hasProfileMetrics);
    setBodyweightLog(snapshot.bodyweightLog);
    setBodyweightKg(snapshot.bodyweightKg);
    setHeightCm(snapshot.heightCm);
    setSex(snapshot.sex);
    setDateOfBirth(snapshot.dateOfBirth);
    setBirthYearFallback(snapshot.birthYearFallback);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      notice.show("error", "Please log in again to save body metrics.");
      return;
    }
    const todayIso = localIsoDate(new Date());
    const parsed = validateBodyMetricsInput(
      { bodyweightKg, heightCm, sex, dateOfBirth },
      todayIso,
    );
    if (!parsed.ok) {
      notice.show("error", parsed.message);
      return;
    }
    setIsSaving(true);
    notice.clear();

    let nextLog = bodyweightLog;
    if (parsed.value.bodyweight_kg != null) {
      const { data: savedEntry, error: logWriteError } = await supabaseBrowserClient
        .from("user_bodyweight_log")
        .upsert(
          {
            user_id: userId,
            logged_on: todayIso,
            bodyweight_kg: parsed.value.bodyweight_kg,
          },
          { onConflict: "user_id,logged_on" },
        )
        .select("id, logged_on, bodyweight_kg")
        .single();
      if (logWriteError || !savedEntry) {
        notice.show("error", `Could not save body metrics: ${logWriteError?.message ?? "Unknown error"}`);
        setIsSaving(false);
        return;
      }
      const savedRow = {
        id: savedEntry.id,
        loggedOn: savedEntry.logged_on.slice(0, 10),
        bodyweightKg: Number(savedEntry.bodyweight_kg),
      };
      nextLog = [...bodyweightLog.filter((entry) => entry.loggedOn !== savedRow.loggedOn), savedRow];
      setBodyweightLog(nextLog);
    }

    const latestBodyweight = latestBodyweightEntry(nextLog);
    const payload = {
      bodyweight_kg: latestBodyweight?.bodyweightKg ?? null,
      height_cm: parsed.value.height_cm,
      sex: parsed.value.sex,
      date_of_birth: parsed.value.date_of_birth,
      birth_year: parsed.value.date_of_birth
        ? birthYearFromDate(parsed.value.date_of_birth)
        : birthYearFallback,
    };

    const { data: updatedRows, error: updateError } = await supabaseBrowserClient
      .from("user_profile_metrics")
      .update(payload)
      .eq("user_id", userId)
      .select("user_id");

    if (updateError) {
      notice.show("error", `Could not save body metrics: ${updateError.message}`);
      setIsSaving(false);
      return;
    }

    if (!updatedRows?.length) {
      const { error: insertError } = await supabaseBrowserClient.from("user_profile_metrics").insert({
        user_id: userId,
        ...payload,
      });
      if (insertError) {
        notice.show("error", `Could not save body metrics: ${insertError.message}`);
        setIsSaving(false);
        return;
      }
    }

    notice.show("success", "Body metrics saved.");
    setBodyweightKg(latestBodyweight == null ? "" : String(latestBodyweight.bodyweightKg));
    if (parsed.value.date_of_birth) {
      setBirthYearFallback(null);
    }
    dirtyRef.current = false;
    refillAccountCache(userId);
    setIsSaving(false);
  }

  async function syncProfileBodyweight(nextLog: BodyweightLogRow[]): Promise<string | null> {
    if (!userId) {
      return "Please log in again to save body metrics.";
    }
    const latest = latestBodyweightEntry(nextLog);
    const bodyweight_kg = latest?.bodyweightKg ?? null;
    const { data: updatedRows, error: updateError } = await supabaseBrowserClient
      .from("user_profile_metrics")
      .update({ bodyweight_kg })
      .eq("user_id", userId)
      .select("user_id");
    if (updateError) {
      return `Could not save bodyweight: ${updateError.message}`;
    }
    if (!updatedRows?.length) {
      const { error: insertError } = await supabaseBrowserClient.from("user_profile_metrics").insert({
        user_id: userId,
        bodyweight_kg,
      });
      if (insertError) {
        return `Could not save bodyweight: ${insertError.message}`;
      }
      setHasProfileMetrics(true);
    }
    setBodyweightKg(bodyweight_kg == null ? "" : String(bodyweight_kg));
    refillAccountCache(userId);
    return null;
  }

  async function saveBodyweightEntry(input: {
    id: string | null;
    loggedOn: string;
    bodyweightKg: number;
  }): Promise<string | null> {
    if (!userId) {
      return "Please log in again to save body metrics.";
    }
    const loggedOn = input.loggedOn.slice(0, 10);
    const write = input.id
      ? supabaseBrowserClient
          .from("user_bodyweight_log")
          .update({ logged_on: loggedOn, bodyweight_kg: input.bodyweightKg })
          .eq("id", input.id)
      : supabaseBrowserClient.from("user_bodyweight_log").insert({
          user_id: userId,
          logged_on: loggedOn,
          bodyweight_kg: input.bodyweightKg,
        });
    const { data, error } = await write.select("id, logged_on, bodyweight_kg").single();
    if (error || !data) {
      if (error?.code === "23505") {
        return "That date already has a bodyweight.";
      }
      return `Could not save bodyweight: ${error?.message ?? "Unknown error"}`;
    }
    const saved = {
      id: data.id,
      loggedOn: data.logged_on.slice(0, 10),
      bodyweightKg: Number(data.bodyweight_kg),
    };
    const nextLog = [
      ...bodyweightLog.filter((entry) => entry.id !== saved.id && entry.loggedOn !== saved.loggedOn),
      saved,
    ];
    setBodyweightLog(nextLog);
    return syncProfileBodyweight(nextLog);
  }

  async function removeBodyweightEntry(id: string): Promise<string | null> {
    if (!userId) {
      return "Please log in again to save body metrics.";
    }
    const { error } = await supabaseBrowserClient.from("user_bodyweight_log").delete().eq("id", id);
    if (error) {
      return `Could not remove bodyweight: ${error.message}`;
    }
    const nextLog = bodyweightLog.filter((entry) => entry.id !== id);
    setBodyweightLog(nextLog);
    return syncProfileBodyweight(nextLog);
  }

  return {
    bodyweightKg,
    setBodyweightKg,
    bodyweightLog,
    heightCm,
    setHeightCm,
    sex,
    setSex,
    dateOfBirth,
    setDateOfBirth,
    birthYearFallback,
    isSaving,
    notice,
    isDirty: () => dirtyRef.current,
    markDirty: () => {
      dirtyRef.current = true;
    },
    applySnapshot,
    handleSubmit,
    saveBodyweightEntry,
    removeBodyweightEntry,
  };
}

export type AccountMetricsState = ReturnType<typeof useAccountMetrics>;
