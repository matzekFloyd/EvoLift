import { PLAN_ALREADY_OPEN_MESSAGE } from "@/lib/plan-cycle";
import { ApiHttpError } from "@/server/api/errors";

const PLAN_ERROR_MESSAGES = [
  "You must be logged in.",
  "Please enter a plan name.",
  "Plan name cannot be longer than 120 characters.",
  "Plan notes cannot be longer than 500 characters.",
  "Please provide the plan days.",
  "Please enter a name for each day.",
  "A plan can have at most 7 days.",
  "Day name cannot be longer than 80 characters.",
  "Each day can only appear once.",
  "That day is not part of this plan.",
  "Please choose an exercise for each row.",
  "A plan with this name already exists.",
  "Another plan is already active. Try again.",
  "Plan not found.",
  "Add at least one exercise to this day.",
  PLAN_ALREADY_OPEN_MESSAGE,
] as const;

export function planWriteFailure(error: { message: string }, fallback: string): never {
  for (const message of PLAN_ERROR_MESSAGES) {
    if (error.message.includes(message)) {
      const status =
        message === "You must be logged in." ? 401 : message === "Plan not found." ? 404 : 400;
      throw new ApiHttpError(status, message);
    }
  }
  if (error.message.includes("workout_plans_user_lower_name_uniq")) {
    throw new ApiHttpError(400, "A plan with this name already exists.");
  }
  if (error.message.includes("workout_plans_one_active_per_user")) {
    throw new ApiHttpError(400, "Another plan is already active. Try again.");
  }
  throw new Error(`${fallback}: ${error.message}`);
}
