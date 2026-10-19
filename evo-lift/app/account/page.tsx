"use client";

import {
  Check,
  Eraser,
  EyeOff,
  Lock,
  Mail,
  Save,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authEmailRedirectUrl } from "@/lib/auth-email-redirect";
import { supabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database } from "@/lib/supabase/database.types";
import { ExerciseBadgeChip } from "@/app/components/exercise-badge-chip";
import { approximateAge, ageFromDateOfBirth, birthYearFromDate, validateBodyMetricsInput } from "@/lib/body-metrics";
import { latestBodyweightEntry } from "@/lib/bodyweight-log";
import { isCompoundExercise } from "@/lib/compound-exercise";
import { warmupSuggestionsEnabled } from "@/lib/warmup-suggestion";
import { DateInput } from "@/app/components/date-input";
import { ExerciseFilteredList } from "@/app/components/exercise-filtered-list";
import { ExerciseSearchSelect } from "@/app/components/exercise-search-select";
import { PageShell } from "@/app/components/page-shell";
import { SegmentedTabs } from "@/app/components/segmented-tabs";
import { SettingsSection, SettingsSectionBody } from "@/app/components/settings-section";
import {
  accountEmailUpdateError,
  accountPasswordUpdateError,
  CURRENT_PASSWORD_INCORRECT,
  exerciseDefaultsClearError,
  exerciseDefaultsSaveError,
  normalizeAccountEmail,
  parseMaxWarmupSets,
} from "@/app/account/account-form";
import { AccountDeleteSection } from "@/app/account/account-delete-section";
import { AccountApiTokensSection } from "@/app/account/api-tokens-section";
import { BodyweightLogPanel, type BodyweightLogRow } from "@/app/account/bodyweight-log-panel";
import { SettingsSectionHeader } from "@/app/components/settings-section-header";
import { StatusNotice } from "@/app/components/status-notice";

export default function AccountPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [exerciseOptions, setExerciseOptions] = useState<Array<{ id: string; label: string; slug: string }>>([]);
  const [defaultsByExerciseId, setDefaultsByExerciseId] = useState<
    Map<string, Database["public"]["Tables"]["user_exercise_defaults"]["Row"]>
  >(new Map());
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [defaultBaseWeightKg, setDefaultBaseWeightKg] = useState("");
  const [defaultTargetSets, setDefaultTargetSets] = useState("");
  const [defaultTargetReps, setDefaultTargetReps] = useState("");
  const [defaultTargetWeightKg, setDefaultTargetWeightKg] = useState("");
  const [maxWarmupSets, setMaxWarmupSets] = useState("");
  const [suggestWarmups, setSuggestWarmups] = useState(true);
  const [suggestTarget, setSuggestTarget] = useState(true);
  const [hasProfileMetrics, setHasProfileMetrics] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);
  const [isClearingDefaults, setIsClearingDefaults] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailMessageTone, setEmailMessageTone] = useState<"error" | "success">("error");
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordMessageTone, setPasswordMessageTone] = useState<"error" | "success">("error");
  const [defaultsMessage, setDefaultsMessage] = useState<string | null>(null);
  const [defaultsMessageTone, setDefaultsMessageTone] = useState<"error" | "success">("success");
  const [bodyweightKg, setBodyweightKg] = useState("");
  const [bodyweightLog, setBodyweightLog] = useState<BodyweightLogRow[]>([]);
  const [heightCm, setHeightCm] = useState("");
  const [sex, setSex] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [birthYearFallback, setBirthYearFallback] = useState<number | null>(null);
  const [isSavingMetrics, setIsSavingMetrics] = useState(false);
  const [metricsMessage, setMetricsMessage] = useState<string | null>(null);
  const [metricsMessageTone, setMetricsMessageTone] = useState<"error" | "success">("success");
  const [hiddenExerciseIds, setHiddenExerciseIds] = useState<Set<string>>(new Set());
  const [hiddenToggleExerciseId, setHiddenToggleExerciseId] = useState<string | null>(null);
  const [hiddenMessage, setHiddenMessage] = useState<string | null>(null);
  const [hiddenMessageTone, setHiddenMessageTone] = useState<"error" | "success">("error");
  const [activeSection, setActiveSection] = useState<"security" | "profile" | "exercises">("security");

  useEffect(() => {
    let isMounted = true;

    async function checkSession() {
      const {
        data: { session },
      } = await supabaseBrowserClient.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (!session) {
        router.replace("/login");
        return;
      }

      setUserId(session.user.id);
      setAccessToken(session.access_token);
      setUserEmail(session.user.email ?? null);
      const { data: exercises, error: exercisesError } = await supabaseBrowserClient
        .from("exercises")
        .select("id, slug")
        .order("slug", { ascending: true });
      if (exercisesError) {
        setHiddenMessageTone("error");
        setHiddenMessage("Could not load exercises.");
        setIsChecking(false);
        return;
      }

      const { data: translations } = await supabaseBrowserClient
        .from("exercise_translations")
        .select("exercise_id, lang_code, name")
        .eq("lang_code", "en");
      const translationMap = new Map<string, string>();
      for (const row of translations ?? []) {
        translationMap.set(row.exercise_id, row.name);
      }
      const options = (exercises ?? []).map((exercise) => ({
        id: exercise.id,
        label: translationMap.get(exercise.id) ?? exercise.slug,
        slug: exercise.slug,
      }));
      setExerciseOptions(options);

      const [
        { data: profile, error: profileError },
        { data: hiddenRows, error: hiddenError },
        { data: logRows, error: logError },
      ] = await Promise.all([
        supabaseBrowserClient
          .from("user_profile_metrics")
          .select("bodyweight_kg,height_cm,birth_year,sex,date_of_birth")
          .eq("user_id", session.user.id)
          .maybeSingle(),
        supabaseBrowserClient
          .from("user_hidden_exercises")
          .select("exercise_id")
          .eq("user_id", session.user.id),
        supabaseBrowserClient
          .from("user_bodyweight_log")
          .select("id, logged_on, bodyweight_kg")
          .eq("user_id", session.user.id)
          .order("logged_on", { ascending: false }),
      ]);

      if (profileError || logError) {
        setMetricsMessageTone("error");
        setMetricsMessage("Could not load profile.");
        setIsChecking(false);
        return;
      }
      if (hiddenError) {
        setHiddenMessageTone("error");
        setHiddenMessage("Could not load hidden exercises.");
        setIsChecking(false);
        return;
      }

      const log = (logRows ?? []).map((row) => ({
        id: row.id,
        loggedOn: row.logged_on.slice(0, 10),
        bodyweightKg: Number(row.bodyweight_kg),
      }));
      const latestBodyweight = latestBodyweightEntry(log);
      setBodyweightLog(log);
      setBodyweightKg(
        latestBodyweight
          ? String(latestBodyweight.bodyweightKg)
          : profile?.bodyweight_kg == null
            ? ""
            : String(profile.bodyweight_kg),
      );
      setHeightCm(profile?.height_cm == null ? "" : String(profile.height_cm));
      setSex(profile?.sex ?? "");
      setDateOfBirth(profile?.date_of_birth ?? "");
      setBirthYearFallback(profile?.date_of_birth ? null : (profile?.birth_year ?? null));
      setHasProfileMetrics(profile != null);

      const hiddenSet = new Set<string>();
      for (const row of hiddenRows ?? []) {
        hiddenSet.add(row.exercise_id);
      }
      setHiddenExerciseIds(hiddenSet);

      const { data: defaultsData, error: defaultsError } = await supabaseBrowserClient
        .from("user_exercise_defaults")
        .select("*")
        .eq("user_id", session.user.id);
      if (defaultsError) {
        setDefaultsMessageTone("error");
        setDefaultsMessage("Could not load exercise defaults.");
        setIsChecking(false);
        return;
      }
      const defaultsMap = new Map<string, Database["public"]["Tables"]["user_exercise_defaults"]["Row"]>();
      for (const row of defaultsData ?? []) {
        defaultsMap.set(row.exercise_id, row);
      }
      setDefaultsByExerciseId(defaultsMap);
      setIsChecking(false);
    }

    void checkSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    setDefaultsMessage(null);
  }, [selectedExerciseId]);

  useEffect(() => {
    const selectedDefault = defaultsByExerciseId.get(selectedExerciseId);
    setDefaultBaseWeightKg(
      selectedDefault?.default_base_weight_kg == null
        ? ""
        : String(selectedDefault.default_base_weight_kg),
    );
    setDefaultTargetSets(
      selectedDefault?.default_target_sets == null ? "" : String(selectedDefault.default_target_sets),
    );
    setDefaultTargetReps(
      selectedDefault?.default_target_reps == null ? "" : String(selectedDefault.default_target_reps),
    );
    setDefaultTargetWeightKg(
      selectedDefault?.default_target_weight_kg == null
        ? ""
        : String(selectedDefault.default_target_weight_kg),
    );
    const selectedSlug = exerciseOptions.find((option) => option.id === selectedExerciseId)?.slug;
    setSuggestWarmups(
      selectedExerciseId
        ? warmupSuggestionsEnabled(selectedDefault?.suggest_warmups, isCompoundExercise(selectedSlug))
        : true,
    );
    setSuggestTarget(selectedDefault?.suggest_target !== false);
    setMaxWarmupSets(
      selectedDefault?.max_suggested_warmup_sets == null
        ? ""
        : String(selectedDefault.max_suggested_warmup_sets),
    );
  }, [defaultsByExerciseId, exerciseOptions, selectedExerciseId]);

  async function handleEmailUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = normalizeAccountEmail(newEmail);
    const emailError = accountEmailUpdateError(newEmail);
    if (emailError) {
      setEmailMessageTone("error");
      setEmailMessage(emailError);
      return;
    }

    setIsSavingEmail(true);
    setEmailMessage(null);

    const emailRedirectTo = authEmailRedirectUrl({
      envAppUrl: process.env.NEXT_PUBLIC_APP_URL,
      windowOrigin: window.location.origin,
    });
    const { error } = await supabaseBrowserClient.auth.updateUser(
      { email: normalized },
      emailRedirectTo ? { emailRedirectTo } : undefined,
    );

    if (error) {
      setEmailMessageTone("error");
      setEmailMessage(error.message);
      setIsSavingEmail(false);
      return;
    }

    setEmailMessageTone("success");
    setEmailMessage(
      "Email update requested. Please check your inbox to confirm the change.",
    );
    setNewEmail("");
    setIsSavingEmail(false);
  }

  async function handlePasswordUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const passwordError = accountPasswordUpdateError({
      userEmail,
      currentPassword,
      newPassword,
      confirmNewPassword,
    });
    if (passwordError || !userEmail) {
      setPasswordMessageTone("error");
      setPasswordMessage(
        passwordError ?? "Could not verify current user email. Please log in again.",
      );
      return;
    }

    setIsSavingPassword(true);
    setPasswordMessage(null);

    const { error: reauthError } = await supabaseBrowserClient.auth.signInWithPassword(
      {
        email: userEmail,
        password: currentPassword,
      },
    );

    if (reauthError) {
      setPasswordMessageTone("error");
      setPasswordMessage(CURRENT_PASSWORD_INCORRECT);
      setIsSavingPassword(false);
      return;
    }

    const { error } = await supabaseBrowserClient.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordMessageTone("error");
      setPasswordMessage(error.message);
      setIsSavingPassword(false);
      return;
    }

    setPasswordMessageTone("success");
    setPasswordMessage("Password updated successfully.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setIsSavingPassword(false);
  }

  async function handleMetricsSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) {
      setMetricsMessageTone("error");
      setMetricsMessage("Please log in again to save body metrics.");
      return;
    }
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}-${`${today.getDate()}`.padStart(2, "0")}`;
    const parsed = validateBodyMetricsInput(
      { bodyweightKg, heightCm, sex, dateOfBirth },
      todayIso,
    );
    if (!parsed.ok) {
      setMetricsMessageTone("error");
      setMetricsMessage(parsed.message);
      return;
    }
    setIsSavingMetrics(true);
    setMetricsMessage(null);

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
        setMetricsMessageTone("error");
        setMetricsMessage(`Could not save body metrics: ${logWriteError?.message ?? "Unknown error"}`);
        setIsSavingMetrics(false);
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
      setMetricsMessageTone("error");
      setMetricsMessage(`Could not save body metrics: ${updateError.message}`);
      setIsSavingMetrics(false);
      return;
    }

    if (!updatedRows?.length) {
      const { error: insertError } = await supabaseBrowserClient.from("user_profile_metrics").insert({
        user_id: userId,
        ...payload,
      });
      if (insertError) {
        setMetricsMessageTone("error");
        setMetricsMessage(`Could not save body metrics: ${insertError.message}`);
        setIsSavingMetrics(false);
        return;
      }
    }

    setMetricsMessageTone("success");
    setMetricsMessage("Body metrics saved.");
    setBodyweightKg(latestBodyweight == null ? "" : String(latestBodyweight.bodyweightKg));
    if (parsed.value.date_of_birth) {
      setBirthYearFallback(null);
    }
    setIsSavingMetrics(false);
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

  async function handleHiddenToggle(exerciseId: string, hide: boolean) {
    if (!userId) {
      return;
    }
    setHiddenToggleExerciseId(exerciseId);
    if (hide) {
      const { error } = await supabaseBrowserClient.from("user_hidden_exercises").insert({
        user_id: userId,
        exercise_id: exerciseId,
      });
      if (error && error.code !== "23505") {
        setHiddenMessageTone("error");
        setHiddenMessage(`Could not hide exercise: ${error.message}`);
        setHiddenToggleExerciseId(null);
        return;
      }
      setHiddenExerciseIds((prev) => {
        const next = new Set(prev);
        next.add(exerciseId);
        return next;
      });
    } else {
      const { error } = await supabaseBrowserClient
        .from("user_hidden_exercises")
        .delete()
        .eq("user_id", userId)
        .eq("exercise_id", exerciseId);
      if (error) {
        setHiddenMessageTone("error");
        setHiddenMessage(`Could not unhide exercise: ${error.message}`);
        setHiddenToggleExerciseId(null);
        return;
      }
      setHiddenExerciseIds((prev) => {
        const next = new Set(prev);
        next.delete(exerciseId);
        return next;
      });
    }
    setHiddenToggleExerciseId(null);
  }

  async function handleDefaultsSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const defaultsError = exerciseDefaultsSaveError({
      userId,
      exerciseId: selectedExerciseId,
      baseWeightKg: defaultBaseWeightKg,
      targetSets: defaultTargetSets,
      targetReps: defaultTargetReps,
      targetWeightKg: defaultTargetWeightKg,
      maxWarmupSets,
    });
    if (defaultsError || !userId || !selectedExerciseId) {
      if (defaultsError) {
        setDefaultsMessageTone("error");
        setDefaultsMessage(defaultsError);
      }
      return;
    }
    setDefaultsMessage(null);

    const parsedBaseWeight = defaultBaseWeightKg ? Number(defaultBaseWeightKg) : null;
    const parsedTargetSets = defaultTargetSets ? Number(defaultTargetSets) : null;
    const parsedTargetReps = defaultTargetReps ? Number(defaultTargetReps) : null;
    const parsedTargetWeight = defaultTargetWeightKg ? Number(defaultTargetWeightKg) : null;
    const parsedMaxWarmupSets = parseMaxWarmupSets(maxWarmupSets);

    setIsSavingDefaults(true);
    setDefaultsMessage(null);

    const payload: Database["public"]["Tables"]["user_exercise_defaults"]["Insert"] = {
      user_id: userId,
      exercise_id: selectedExerciseId,
      default_base_weight_kg: parsedBaseWeight,
      default_target_sets: parsedTargetSets,
      default_target_reps: parsedTargetReps,
      default_target_weight_kg: parsedTargetWeight,
      suggest_warmups: suggestWarmups,
      suggest_target: suggestTarget,
      max_suggested_warmup_sets: parsedMaxWarmupSets,
    };

    const { data, error } = await supabaseBrowserClient
      .from("user_exercise_defaults")
      .upsert(payload, { onConflict: "user_id,exercise_id" })
      .select("*")
      .single();

    if (error || !data) {
      setDefaultsMessageTone("error");
      setDefaultsMessage(`Could not save exercise defaults: ${error?.message ?? "Unknown error"}`);
      setIsSavingDefaults(false);
      return;
    }

    setDefaultsByExerciseId((prev) => {
      const next = new Map(prev);
      next.set(data.exercise_id, data);
      return next;
    });
    const selectedExerciseLabel =
      exerciseOptions.find((option) => option.id === selectedExerciseId)?.label ?? "Exercise";
    setDefaultsMessageTone("success");
    setDefaultsMessage(`Defaults saved for ${selectedExerciseLabel}.`);
    setIsSavingDefaults(false);
  }

  async function handleClearDefaults() {
    const clearError = exerciseDefaultsClearError(userId, selectedExerciseId);
    if (clearError || !userId || !selectedExerciseId) {
      if (clearError) {
        setDefaultsMessageTone("error");
        setDefaultsMessage(clearError);
      }
      return;
    }
    setDefaultsMessage(null);

    setIsClearingDefaults(true);
    setDefaultsMessage(null);

    const selectedSlug = exerciseOptions.find((option) => option.id === selectedExerciseId)?.slug;
    const suggestWarmupsDefault = isCompoundExercise(selectedSlug);
    const payload: Database["public"]["Tables"]["user_exercise_defaults"]["Insert"] = {
      user_id: userId,
      exercise_id: selectedExerciseId,
      default_base_weight_kg: null,
      default_target_sets: null,
      default_target_reps: null,
      default_target_weight_kg: null,
      suggest_warmups: suggestWarmupsDefault,
      suggest_target: true,
      max_suggested_warmup_sets: null,
    };

    const { data, error } = await supabaseBrowserClient
      .from("user_exercise_defaults")
      .upsert(payload, { onConflict: "user_id,exercise_id" })
      .select("*")
      .single();

    if (error || !data) {
      setDefaultsMessageTone("error");
      setDefaultsMessage(`Could not clear exercise defaults: ${error?.message ?? "Unknown error"}`);
      setIsClearingDefaults(false);
      return;
    }

    setDefaultsByExerciseId((prev) => {
      const next = new Map(prev);
      next.set(data.exercise_id, data);
      return next;
    });
    setDefaultBaseWeightKg("");
    setDefaultTargetSets("");
    setDefaultTargetReps("");
    setDefaultTargetWeightKg("");
    setSuggestWarmups(suggestWarmupsDefault);
    setSuggestTarget(true);
    setMaxWarmupSets("");
    setDefaultsMessage(null);
    setIsClearingDefaults(false);
  }

  const calendarYear = new Date().getFullYear();
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, "0")}-${`${today.getDate()}`.padStart(2, "0")}`;
  const exactAge = dateOfBirth.trim() === "" ? null : ageFromDateOfBirth(dateOfBirth.trim(), today);
  const yearOnlyAge =
    exactAge == null && birthYearFallback != null ? approximateAge(birthYearFallback, calendarYear) : null;

  useEffect(() => {
    setEmailMessage(null);
    setPasswordMessage(null);
    setMetricsMessage(null);
    setHiddenMessage(null);
    setDefaultsMessage(null);
  }, [activeSection]);

  if (isChecking) {
    return (
      <PageShell className="items-center justify-center">
        <p className="text-sm text-zinc-600">Checking session...</p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h1 className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <UserRound className="h-6 w-6 text-sky-700" />
        User information
      </h1>
      <SegmentedTabs
        value={activeSection}
        onChange={setActiveSection}
        className="w-full"
        options={[
          { value: "security", label: "Login", icon: <Lock className="h-3.5 w-3.5" /> },
          { value: "profile", label: "Profile", icon: <UserRound className="h-3.5 w-3.5" /> },
          { value: "exercises", label: "Exercises", icon: <SlidersHorizontal className="h-3.5 w-3.5" /> },
        ]}
      />
      {activeSection === "security" ? (
        <>
      <SettingsSection>
        <SettingsSectionHeader
          title="Email"
          description="Update the email address used to sign in."
          icon={<Mail className="h-4 w-4 text-zinc-500" />}
        />
        <SettingsSectionBody>
        <label className="block text-sm font-medium">
          Current email
          <input
            type="email"
            readOnly
            value={userEmail ?? "unknown user"}
            className="mt-1 w-full rounded-md border bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
          />
        </label>
        <form onSubmit={handleEmailUpdate} className="mt-4 space-y-3">
          <label className="block text-sm font-medium">
            New email
            <input
              type="email"
              required
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="new-email@example.com"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {emailMessage ? (
              <StatusNotice
                message={emailMessage}
                tone={emailMessageTone}
                onDismiss={() => setEmailMessage(null)}
                className="sm:flex-1"
              />
            ) : (
              <div className="hidden sm:block sm:flex-1" />
            )}
            <button
              type="submit"
              disabled={isSavingEmail}
              className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60 sm:w-40"
            >
              <Check className="h-3.5 w-3.5 text-white" />
              Change email
            </button>
          </div>
        </form>
        </SettingsSectionBody>
      </SettingsSection>
      <SettingsSection>
        <SettingsSectionHeader
          title="Change password"
          description="Choose a new password to keep your account secure."
          icon={<Lock className="h-4 w-4 text-zinc-500" />}
        />
        <SettingsSectionBody>
        <form onSubmit={handlePasswordUpdate} className="space-y-3">
          <label className="block text-sm font-medium">
            Current password
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Enter your current password"
            />
          </label>
          <label className="block text-sm font-medium">
            New password
            <input
              type="password"
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="At least 8 characters"
            />
          </label>
          <label className="block text-sm font-medium">
            Confirm new password
            <input
              type="password"
              required
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Repeat new password"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {passwordMessage ? (
              <StatusNotice
                message={passwordMessage}
                tone={passwordMessageTone}
                onDismiss={() => setPasswordMessage(null)}
                className="sm:flex-1"
              />
            ) : (
              <div className="hidden sm:block sm:flex-1" />
            )}
            <button
              type="submit"
              disabled={isSavingPassword}
              className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60 sm:w-40"
            >
              <Check className="h-3.5 w-3.5 text-white" />
              Change password
            </button>
          </div>
        </form>
        </SettingsSectionBody>
      </SettingsSection>
      {accessToken ? <AccountApiTokensSection accessToken={accessToken} /> : null}
      {accessToken ? <AccountDeleteSection accessToken={accessToken} userEmail={userEmail} /> : null}
        </>
      ) : null}
      {activeSection === "profile" ? (
      <SettingsSection>
        <SettingsSectionHeader
          title="Body metrics"
          description="Optional. Bodyweight, sex, and date of birth are used on Insights to compare your main lifts with published standards. They do not change the weights you log."
          icon={<UserRound className="h-4 w-4 text-zinc-500" />}
        />
        <SettingsSectionBody>
        <form onSubmit={handleMetricsSave} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              Sex
              <select
                value={sex}
                onChange={(event) => setSex(event.target.value)}
                className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
              >
                <option value="">Not set</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Date of birth
              <DateInput
                min="1900-01-01"
                max={todayIso}
                value={dateOfBirth}
                onChange={(event) => setDateOfBirth(event.target.value)}
                className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
              />
              {exactAge != null ? (
                <span className="mt-1 block text-sm text-zinc-500">{exactAge} years old</span>
              ) : yearOnlyAge != null ? (
                <span className="mt-1 block text-sm text-zinc-500">
                  Year of birth on file: {birthYearFallback}. About {yearOnlyAge} years old.
                </span>
              ) : null}
            </label>
            <label className="block text-sm font-medium">
              Height (cm)
              <input
                type="number"
                min={100}
                max={250}
                step="0.1"
                value={heightCm}
                onChange={(event) => setHeightCm(event.target.value)}
                className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </label>
            <label className="block text-sm font-medium">
              Bodyweight (kg)
              <input
                type="number"
                step="0.1"
                value={bodyweightKg}
                onChange={(event) => setBodyweightKg(event.target.value)}
                className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                placeholder="Optional"
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 sm:items-start">
            <div
              className={
                metricsMessage
                  ? "min-w-0 sm:col-span-2"
                  : "hidden min-h-0 sm:col-span-2 sm:block"
              }
            >
              {metricsMessage ? (
                <StatusNotice
                  message={metricsMessage}
                  tone={metricsMessageTone}
                  onDismiss={() => setMetricsMessage(null)}
                />
              ) : null}
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="hidden sm:block" aria-hidden />
              <button
                type="submit"
                disabled={isSavingMetrics}
                className="inline-flex h-10 w-full items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60"
              >
                <Save className="h-3.5 w-3.5 text-white" />
                {isSavingMetrics ? "Saving..." : "Save metrics"}
              </button>
            </div>
          </div>
        </form>
        <BodyweightLogPanel
          entries={bodyweightLog}
          today={todayIso}
          onSave={saveBodyweightEntry}
          onRemove={removeBodyweightEntry}
        />
        </SettingsSectionBody>
      </SettingsSection>
      ) : null}
      {activeSection === "exercises" ? (
        <>
      <SettingsSection>
        <SettingsSectionHeader
          title="Hidden exercises"
          description="Hidden exercises will not appear when you choose exercises for new workout entries. Your past workout sessions stay the same, and you can still set defaults for all exercises below."
          icon={<EyeOff className="h-4 w-4 text-zinc-500" />}
        />
        <SettingsSectionBody>
        {hiddenMessage ? (
          <StatusNotice
            message={hiddenMessage}
            tone={hiddenMessageTone}
            onDismiss={() => setHiddenMessage(null)}
            className="mt-3"
          />
        ) : null}
        <ExerciseFilteredList
          items={exerciseOptions}
          filterLabel="Filter list"
          renderItem={(option) => {
            const isHidden = hiddenExerciseIds.has(option.id);
            const isBusy = hiddenToggleExerciseId === option.id;
            return (
              <div className="flex items-center justify-between gap-2 rounded-md border border-transparent bg-white px-2 py-1.5 text-sm">
                <span className="inline-flex min-w-0 items-center gap-2">
                  <ExerciseBadgeChip slug={option.slug} />
                  <span className="truncate text-zinc-900">{option.label}</span>
                </span>
                <label className="flex shrink-0 items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={isHidden}
                    disabled={isBusy}
                    onChange={(event) => {
                      void handleHiddenToggle(option.id, event.target.checked);
                    }}
                  />
                  Hide
                </label>
              </div>
            );
          }}
        />
        </SettingsSectionBody>
      </SettingsSection>
      <SettingsSection>
        <SettingsSectionHeader
          title="Exercise defaults"
          description="Saved per exercise. Values here prefill when you add that exercise to a session."
          icon={<SlidersHorizontal className="h-4 w-4 text-zinc-500" />}
        />
        <SettingsSectionBody>
        <form onSubmit={handleDefaultsSave} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm font-medium sm:col-span-2">
              Exercise
              <ExerciseSearchSelect
                required
                className="mt-1 w-full"
                options={exerciseOptions}
                value={selectedExerciseId}
                onChange={setSelectedExerciseId}
              />
            </label>
            <label className="block text-sm font-medium">
              Base weight (kg)
              <input
                type="number"
                min={0}
                step="0.25"
                value={defaultBaseWeightKg}
                onChange={(event) => setDefaultBaseWeightKg(event.target.value)}
                className="mt-1 h-10 w-full rounded-md border bg-white px-3 py-2 text-sm"
                placeholder="e.g. 20"
              />
            </label>
          </div>
          <div className="space-y-2 border-t border-zinc-200 pt-3">
            <h3 className="text-sm font-medium text-zinc-800">Targets</h3>
            <p className="text-sm leading-snug text-zinc-600">
              Targets are your usual sets, weight, and reps for this exercise. Those values are
              prefilled when you add the exercise to a session.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium">
                Target working sets
                <input
                  type="number"
                  min={1}
                  value={defaultTargetSets}
                  onChange={(event) => setDefaultTargetSets(event.target.value)}
                  className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                  placeholder="e.g. 3"
                />
              </label>
              <label className="block text-sm font-medium">
                Target weight (kg)
                <input
                  type="number"
                  min={0}
                  step="0.25"
                  value={defaultTargetWeightKg}
                  onChange={(event) => setDefaultTargetWeightKg(event.target.value)}
                  className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                  placeholder="e.g. 60"
                />
              </label>
              <label className="block text-sm font-medium">
                Target reps (working sets)
                <input
                  type="number"
                  min={1}
                  value={defaultTargetReps}
                  onChange={(event) => setDefaultTargetReps(event.target.value)}
                  className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                  placeholder="e.g. 8"
                />
              </label>
            </div>
          </div>
          <div className="space-y-2 border-t border-zinc-200 pt-3">
            <h3 className="text-sm font-medium text-zinc-800">Suggestions</h3>
            <p className="text-sm leading-snug text-zinc-600">
              For this exercise only. Suggest warmups shows the warmup ladder toward the target
              weight. Leave maximum warmup sets empty to keep every step, or enter a number to keep
              that many of the heaviest steps.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block text-sm font-medium">
                Suggest a target weight
                <select
                  value={suggestTarget ? "yes" : "no"}
                  onChange={(event) => setSuggestTarget(event.target.value === "yes")}
                  className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Suggest warmups
                <select
                  value={suggestWarmups ? "yes" : "no"}
                  onChange={(event) => setSuggestWarmups(event.target.value === "yes")}
                  className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
              <label className="block text-sm font-medium">
                Maximum warmup sets
                <input
                  type="number"
                  step={1}
                  min={1}
                  value={maxWarmupSets}
                  onChange={(event) => setMaxWarmupSets(event.target.value)}
                  className="mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm"
                  placeholder="e.g. 2"
                />
              </label>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 sm:items-start">
            <div
              className={
                defaultsMessage
                  ? "min-w-0 sm:col-span-2"
                  : "hidden min-h-0 sm:col-span-2 sm:block"
              }
            >
              {defaultsMessage ? (
                <StatusNotice
                  message={defaultsMessage}
                  tone={defaultsMessageTone}
                  onDismiss={() => setDefaultsMessage(null)}
                />
              ) : null}
            </div>
            <div className="grid min-w-0 grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleClearDefaults}
                disabled={isClearingDefaults || !selectedExerciseId}
                className="inline-flex h-10 min-w-0 items-center justify-center gap-1 rounded-md border border-zinc-300 bg-zinc-50 px-1.5 py-0 text-xs font-medium text-zinc-800 hover:border-sky-300 hover:bg-zinc-100 disabled:opacity-60 sm:px-2 sm:text-sm"
              >
                <Eraser className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span className="min-w-0 text-center leading-tight">
                  {isClearingDefaults ? "Clearing..." : "Clear defaults"}
                </span>
              </button>
              <button
                type="submit"
                disabled={isSavingDefaults}
                className="inline-flex h-10 min-w-0 items-center justify-center gap-1 rounded-md border border-sky-700 bg-sky-700 px-1.5 py-0 text-xs font-medium text-white hover:border-sky-600 hover:bg-sky-600 disabled:opacity-60 sm:px-2 sm:text-sm"
              >
                <Save className="h-3.5 w-3.5 shrink-0 text-white" />
                <span className="min-w-0 text-center leading-tight">
                  {isSavingDefaults ? "Saving..." : "Save defaults"}
                </span>
              </button>
            </div>
          </div>
        </form>
        </SettingsSectionBody>
      </SettingsSection>
        </>
      ) : null}
    </PageShell>
  );
}
