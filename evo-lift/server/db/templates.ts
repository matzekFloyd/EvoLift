import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { ApiHttpError } from "@/server/api/http";
import {
  createWorkoutSession,
  requireWorkoutSessionDetail,
  type WorkoutSessionDetail,
} from "@/server/db/workouts";

type TemplateExerciseInput = {
  exerciseId: string;
  targetSets: number | null;
  targetReps: number | null;
  targetWeightKg: number | null;
  baseWeightKg: number | null;
  notes: string | null;
};

export type WorkoutTemplateListItem = {
  id: string;
  name: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  exerciseCount: number;
};

export type WorkoutTemplateExerciseRow =
  Database["public"]["Tables"]["workout_template_exercises"]["Row"];

export type WorkoutTemplateWithExercises =
  Database["public"]["Tables"]["workout_templates"]["Row"] & {
    exercises: WorkoutTemplateExerciseRow[];
  };

function requireNonEmptyName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new ApiHttpError(400, "Please enter a template name.");
  }
  if (trimmed.length > 120) {
    throw new ApiHttpError(400, "Template name cannot be longer than 120 characters.");
  }
  return trimmed;
}

export async function listTemplates(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<WorkoutTemplateListItem[]> {
  const { data, error } = await client
    .from("workout_templates")
    .select("id, name, notes, created_at, updated_at, workout_template_exercises(id)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list templates: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    exerciseCount: row.workout_template_exercises?.length ?? 0,
  }));
}

export async function getTemplateById(
  client: SupabaseClient<Database>,
  userId: string,
  templateId: string,
): Promise<WorkoutTemplateWithExercises | null> {
  const { data: template, error: templateError } = await client
    .from("workout_templates")
    .select("*")
    .eq("id", templateId)
    .eq("user_id", userId)
    .maybeSingle();

  if (templateError) {
    throw new Error(`Failed to load template: ${templateError.message}`);
  }
  if (!template) {
    return null;
  }

  const { data: exercises, error: exercisesError } = await client
    .from("workout_template_exercises")
    .select("*")
    .eq("template_id", templateId)
    .order("position", { ascending: true });

  if (exercisesError) {
    throw new Error(`Failed to load template exercises: ${exercisesError.message}`);
  }

  return {
    ...template,
    exercises: exercises ?? [],
  };
}

export async function createTemplate(
  client: SupabaseClient<Database>,
  input: {
    userId: string;
    name: string;
    notes?: string | null;
    exercises: TemplateExerciseInput[];
  },
): Promise<WorkoutTemplateWithExercises> {
  const trimmedName = requireNonEmptyName(input.name);
  const notes = input.notes?.trim() ? input.notes.trim() : null;

  if (input.exercises.length === 0) {
    throw new ApiHttpError(400, "Add at least one exercise to the template.");
  }

  const { data: template, error: insertError } = await client
    .from("workout_templates")
    .insert({
      user_id: input.userId,
      name: trimmedName,
      notes,
    })
    .select()
    .single();

  if (insertError || !template) {
    throw new Error(`Failed to create template: ${insertError?.message ?? "unknown error"}`);
  }

  const exerciseRows: Database["public"]["Tables"]["workout_template_exercises"]["Insert"][] =
    input.exercises.map((row, index) => ({
      template_id: template.id,
      exercise_id: row.exerciseId,
      position: index + 1,
      target_sets: row.targetSets,
      target_reps: row.targetReps,
      target_weight_kg: row.targetWeightKg,
      base_weight_kg: row.baseWeightKg,
      notes: row.notes,
    }));

  const { error: exercisesError } = await client
    .from("workout_template_exercises")
    .insert(exerciseRows);

  if (exercisesError) {
    await client.from("workout_templates").delete().eq("id", template.id);
    throw new Error(`Failed to save template exercises: ${exercisesError.message}`);
  }

  const full = await getTemplateById(client, input.userId, template.id);
  if (!full) {
    throw new Error("Template was created but could not be reloaded.");
  }
  return full;
}

export async function updateTemplate(
  client: SupabaseClient<Database>,
  userId: string,
  templateId: string,
  input: {
    name: string;
    notes?: string | null;
    exercises: TemplateExerciseInput[];
  },
): Promise<WorkoutTemplateWithExercises> {
  const trimmedName = requireNonEmptyName(input.name);
  const notes = input.notes?.trim() ? input.notes.trim() : null;

  if (input.exercises.length === 0) {
    throw new ApiHttpError(400, "Add at least one exercise to the template.");
  }

  const { data: updated, error: updateError } = await client
    .from("workout_templates")
    .update({
      name: trimmedName,
      notes,
    })
    .eq("id", templateId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw new Error(`Failed to update template: ${updateError.message}`);
  }
  if (!updated) {
    throw new ApiHttpError(404, "Template not found.");
  }

  const { error: deleteError } = await client
    .from("workout_template_exercises")
    .delete()
    .eq("template_id", templateId);

  if (deleteError) {
    throw new Error(`Failed to update template exercises: ${deleteError.message}`);
  }

  const exerciseRows: Database["public"]["Tables"]["workout_template_exercises"]["Insert"][] =
    input.exercises.map((row, index) => ({
      template_id: templateId,
      exercise_id: row.exerciseId,
      position: index + 1,
      target_sets: row.targetSets,
      target_reps: row.targetReps,
      target_weight_kg: row.targetWeightKg,
      base_weight_kg: row.baseWeightKg,
      notes: row.notes,
    }));

  const { error: insertError } = await client
    .from("workout_template_exercises")
    .insert(exerciseRows);

  if (insertError) {
    throw new Error(`Failed to save template exercises: ${insertError.message}`);
  }

  const full = await getTemplateById(client, userId, templateId);
  if (!full) {
    throw new Error("Template was updated but could not be reloaded.");
  }
  return full;
}

export async function deleteTemplate(
  client: SupabaseClient<Database>,
  userId: string,
  templateId: string,
): Promise<void> {
  const existing = await getTemplateById(client, userId, templateId);
  if (!existing) {
    throw new ApiHttpError(404, "Template not found.");
  }
  const { error } = await client
    .from("workout_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", userId);
  if (error) {
    throw new Error(`Failed to delete template: ${error.message}`);
  }
}

export async function instantiateTemplate(
  client: SupabaseClient<Database>,
  input: {
    userId: string;
    templateId: string;
    performedOn: string;
    notes?: string | null;
  },
): Promise<string> {
  const session = await instantiateTemplateSession(client, input);
  return session.id;
}

export async function instantiateTemplateSession(
  client: SupabaseClient<Database>,
  input: {
    userId: string;
    templateId: string;
    performedOn: string;
    notes?: string | null;
  },
): Promise<WorkoutSessionDetail> {
  const template = await getTemplateById(client, input.userId, input.templateId);
  if (!template) {
    throw new ApiHttpError(404, "Template not found.");
  }
  if (template.exercises.length === 0) {
    throw new ApiHttpError(400, "Add at least one exercise to the template.");
  }

  const notes = input.notes?.trim() ? input.notes.trim() : null;
  const session = await createWorkoutSession(client, {
    userId: input.userId,
    performedOn: input.performedOn,
    notes,
    sourceTemplateId: template.id,
  });

  const exerciseRows: Database["public"]["Tables"]["workout_session_exercises"]["Insert"][] =
    template.exercises.map((row) => ({
      session_id: session.id,
      exercise_id: row.exercise_id,
      position: row.position,
      target_sets: row.target_sets,
      target_reps: row.target_reps,
      target_weight_kg: row.target_weight_kg,
      base_weight_kg: row.base_weight_kg,
      notes: row.notes,
    }));

  const { error: exercisesError } = await client
    .from("workout_session_exercises")
    .insert(exerciseRows);

  if (exercisesError) {
    await client.from("workout_sessions").delete().eq("id", session.id).eq("user_id", input.userId);
    throw new Error(`Failed to start session from template: ${exercisesError.message}`);
  }

  return requireWorkoutSessionDetail(client, input.userId, session.id);
}
