"use server";

import { createPublicServerClient } from "@/lib/supabase/server";
import type { PlanSaveInput } from "@/lib/plan-draft";
import {
  createPlan,
  deletePlan,
  duplicatePlan,
  getPlanById,
  instantiatePlanDay,
  listPlans,
  setPlanActive,
  updatePlan,
  type WorkoutPlanListItem,
  type WorkoutPlanWithDays,
} from "@/server/db/plans";

async function userClient(accessToken: string) {
  const client = createPublicServerClient(accessToken);
  const {
    data: { user },
    error,
  } = await client.auth.getUser(accessToken);
  if (error || !user) {
    throw new Error("Invalid user token.");
  }
  return { client, user };
}

export async function listUserPlans(accessToken: string): Promise<WorkoutPlanListItem[]> {
  const { client, user } = await userClient(accessToken);
  return listPlans(client, user.id);
}

export async function getUserPlanById(
  accessToken: string,
  planId: string,
): Promise<WorkoutPlanWithDays | null> {
  const { client, user } = await userClient(accessToken);
  return getPlanById(client, user.id, planId);
}

export async function createUserPlan(input: {
  accessToken: string;
  plan: PlanSaveInput;
}): Promise<WorkoutPlanWithDays> {
  const { client, user } = await userClient(input.accessToken);
  return createPlan(client, user.id, input.plan);
}

export async function updateUserPlan(input: {
  accessToken: string;
  planId: string;
  plan: PlanSaveInput;
}): Promise<WorkoutPlanWithDays> {
  const { client, user } = await userClient(input.accessToken);
  return updatePlan(client, user.id, input.planId, input.plan);
}

export async function deleteUserPlan(accessToken: string, planId: string): Promise<void> {
  const { client, user } = await userClient(accessToken);
  return deletePlan(client, user.id, planId);
}

export async function setUserPlanActive(input: {
  accessToken: string;
  planId: string;
  isActive: boolean;
}): Promise<void> {
  const { client, user } = await userClient(input.accessToken);
  return setPlanActive(client, user.id, input.planId, input.isActive);
}

export async function duplicateUserPlan(
  accessToken: string,
  planId: string,
): Promise<WorkoutPlanWithDays> {
  const { client, user } = await userClient(accessToken);
  return duplicatePlan(client, user.id, planId);
}

export async function instantiateUserPlanDay(input: {
  accessToken: string;
  planId: string;
  planDayId: string;
  performedOn: string;
  notes?: string | null;
}): Promise<string> {
  const { client, user } = await userClient(input.accessToken);
  return instantiatePlanDay(client, {
    userId: user.id,
    planId: input.planId,
    planDayId: input.planDayId,
    performedOn: input.performedOn,
    notes: input.notes,
  });
}
