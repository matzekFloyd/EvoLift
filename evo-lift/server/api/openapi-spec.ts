import { resourceApiPaths } from "@/server/api/openapi-resources";

const errorResponse = {
  "400": { description: "Invalid request" },
  "401": { description: "Missing/invalid bearer token" },
  "404": { description: "Not found" },
};

function tagForPath(path: string): string | undefined {
  if (path.startsWith("/api/sessions")) {
    return "Sessions";
  }
  if (path.startsWith("/api/templates")) {
    return "Templates";
  }
  if (path.startsWith("/api/plans")) {
    return "Plans";
  }
  if (path.startsWith("/api/goals")) {
    return "Goals";
  }
  if (path.startsWith("/api/account")) {
    return "Account";
  }
  if (path.startsWith("/api/insights") || path.startsWith("/api/activity") || path.endsWith("/history")) {
    return "Insights";
  }
  if (path.startsWith("/api/exercises")) {
    return "Exercises";
  }
  return undefined;
}

function withOperationTags(
  paths: Record<string, Record<string, Record<string, unknown>>>,
): Record<string, Record<string, Record<string, unknown>>> {
  for (const [path, methods] of Object.entries(paths)) {
    const tag = tagForPath(path);
    if (!tag) {
      continue;
    }
    for (const operation of Object.values(methods)) {
      operation.tags = [tag];
    }
  }
  return paths;
}

function jsonData(schema: Record<string, unknown>) {
  return {
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: { data: schema },
          required: ["data"],
        },
      },
    },
  };
}

const sessionExerciseInput = {
  type: "object",
  required: ["exercise_id"],
  properties: {
    exercise_id: { type: "string", format: "uuid" },
    target_sets: { type: "integer", minimum: 1, nullable: true },
    target_reps: { type: "integer", minimum: 1, nullable: true },
    target_weight_kg: { type: "number", minimum: 0, nullable: true },
    base_weight_kg: { type: "number", minimum: 0, nullable: true },
    notes: { type: "string", maxLength: 500, nullable: true },
  },
};

export function buildOpenApiSpec(baseUrl: string) {
  return {
    openapi: "3.0.3",
    info: {
      title: "Evo Lift API",
      version: "1.1.0",
      description:
        "Authenticated HTTP API for the same actions as the app UI.\n\nUse a session JWT or a personal API token from Account (Bearer evo_…).\n\nCreate a session with exercises, from a template, or from a plan day. Then add sets on each session exercise. Upcoming sessions (future performed_on) cannot have sets yet. Plans, goals, account settings, Insights, and exercise history use the same rules as the app.",
    },
    servers: [{ url: baseUrl }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT or personal API token",
          description:
            "Supabase session access token, or a personal API token created on Account (prefix evo_).",
        },
      },
      schemas: {
        ExerciseTranslation: {
          type: "object",
          properties: {
            lang_code: { type: "string", enum: ["en", "de"] },
            name: { type: "string" },
          },
          required: ["lang_code", "name"],
        },
        Exercise: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            slug: { type: "string" },
            translations: {
              type: "array",
              items: { $ref: "#/components/schemas/ExerciseTranslation" },
            },
          },
          required: ["id", "slug", "translations"],
        },
        WorkoutSet: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            session_exercise_id: { type: "string", format: "uuid" },
            set_number: { type: "integer" },
            reps: { type: "integer" },
            weight_kg: { type: "number", nullable: true },
            is_warmup: { type: "boolean" },
            notes: { type: "string", nullable: true },
            performed_at: { type: "string" },
            created_at: { type: "string" },
          },
        },
        SessionExercise: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            session_id: { type: "string", format: "uuid" },
            exercise_id: { type: "string", format: "uuid" },
            position: { type: "integer" },
            base_weight_kg: { type: "number", nullable: true },
            target_sets: { type: "integer", nullable: true },
            target_reps: { type: "integer", nullable: true },
            target_weight_kg: { type: "number", nullable: true },
            notes: { type: "string", nullable: true },
            not_done: { type: "boolean" },
            created_at: { type: "string" },
            sets: {
              type: "array",
              items: { $ref: "#/components/schemas/WorkoutSet" },
            },
          },
        },
        WorkoutSession: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            performed_on: { type: "string", format: "date" },
            notes: { type: "string", nullable: true },
            source_template_id: { type: "string", format: "uuid", nullable: true },
            plan_id: { type: "string", format: "uuid", nullable: true },
            plan_day_id: { type: "string", format: "uuid", nullable: true },
            created_at: { type: "string" },
            updated_at: { type: "string" },
            exercises: {
              type: "array",
              items: { $ref: "#/components/schemas/SessionExercise" },
            },
          },
        },
        WorkoutSessionListItem: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            performed_on: { type: "string", format: "date" },
            notes: { type: "string", nullable: true },
            source_template_id: { type: "string", format: "uuid", nullable: true },
            plan_id: { type: "string", format: "uuid", nullable: true },
            plan_day_id: { type: "string", format: "uuid", nullable: true },
            created_at: { type: "string" },
            updated_at: { type: "string" },
            exercise_count: { type: "integer" },
          },
        },
        TemplateExercise: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            template_id: { type: "string", format: "uuid" },
            exercise_id: { type: "string", format: "uuid" },
            position: { type: "integer" },
            target_sets: { type: "integer", nullable: true },
            target_reps: { type: "integer", nullable: true },
            target_weight_kg: { type: "number", nullable: true },
            base_weight_kg: { type: "number", nullable: true },
            notes: { type: "string", nullable: true },
            created_at: { type: "string" },
          },
        },
        WorkoutTemplate: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
            name: { type: "string" },
            notes: { type: "string", nullable: true },
            created_at: { type: "string" },
            updated_at: { type: "string" },
            exercises: {
              type: "array",
              items: { $ref: "#/components/schemas/TemplateExercise" },
            },
          },
        },
        WorkoutTemplateListItem: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            notes: { type: "string", nullable: true },
            created_at: { type: "string" },
            updated_at: { type: "string" },
            exercise_count: { type: "integer" },
          },
        },
        SessionExerciseInput: sessionExerciseInput,
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      {
        name: "Sessions",
        description: "Workout sessions, session exercises, and sets.",
      },
      {
        name: "Templates",
        description: "Reusable workout templates and starting a session from a template.",
      },
      {
        name: "Exercises",
        description: "Exercise catalog with translations.",
      },
      {
        name: "Plans",
        description: "Workout plans, the active plan, and starting a session from a plan day.",
      },
      {
        name: "Goals",
        description: "Strength goals for an exercise.",
      },
      {
        name: "Account",
        description: "Email, password, profile, bodyweight, exercise defaults, hidden exercises, and API tokens.",
      },
      {
        name: "Insights",
        description: "Insights, Home activity, and exercise history.",
      },
    ],
    paths: withOperationTags({
      "/api/exercises": {
        get: {
          summary: "List exercises with translations",
          parameters: [
            {
              name: "lang",
              in: "query",
              required: false,
              schema: { type: "string", enum: ["en", "de"] },
              description: "Optional language filter.",
            },
          ],
          responses: {
            "200": {
              description: "Exercise list",
              ...jsonData({
                type: "array",
                items: { $ref: "#/components/schemas/Exercise" },
              }),
            },
            "401": errorResponse["401"],
          },
        },
      },
      "/api/sessions": {
        get: {
          summary: "List workout sessions",
          parameters: [
            {
              name: "from",
              in: "query",
              schema: { type: "string", format: "date" },
              description: "Inclusive performed_on start (YYYY-MM-DD).",
            },
            {
              name: "to",
              in: "query",
              schema: { type: "string", format: "date" },
              description: "Inclusive performed_on end (YYYY-MM-DD).",
            },
          ],
          responses: {
            "200": {
              description: "Session list",
              ...jsonData({
                type: "array",
                items: { $ref: "#/components/schemas/WorkoutSessionListItem" },
              }),
            },
            "401": errorResponse["401"],
          },
        },
        post: {
          summary: "Create a workout session",
          description:
            "Provide exercises, or template_id to copy a template. Do not send both.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["performed_on"],
                  properties: {
                    performed_on: { type: "string", format: "date" },
                    notes: { type: "string", maxLength: 500, nullable: true },
                    template_id: { type: "string", format: "uuid" },
                    exercises: {
                      type: "array",
                      items: { $ref: "#/components/schemas/SessionExerciseInput" },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Created session",
              ...jsonData({ $ref: "#/components/schemas/WorkoutSession" }),
            },
            ...errorResponse,
          },
        },
      },
      "/api/sessions/{id}": {
        get: {
          summary: "Get a workout session with exercises and sets",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": {
              description: "Session",
              ...jsonData({ $ref: "#/components/schemas/WorkoutSession" }),
            },
            "401": errorResponse["401"],
            "404": errorResponse["404"],
          },
        },
        patch: {
          summary: "Update session date and notes",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    performed_on: { type: "string", format: "date" },
                    notes: { type: "string", maxLength: 500, nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Updated session",
              ...jsonData({ $ref: "#/components/schemas/WorkoutSession" }),
            },
            ...errorResponse,
          },
        },
        delete: {
          summary: "Delete a workout session",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": {
              description: "Deleted",
              ...jsonData({
                type: "object",
                properties: { deleted: { type: "boolean" } },
              }),
            },
            "401": errorResponse["401"],
            "404": errorResponse["404"],
          },
        },
      },
      "/api/sessions/{id}/exercises": {
        post: {
          summary: "Add an exercise to a session",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/SessionExerciseInput" },
              },
            },
          },
          responses: {
            "201": {
              description: "Updated session",
              ...jsonData({ $ref: "#/components/schemas/WorkoutSession" }),
            },
            ...errorResponse,
          },
        },
      },
      "/api/sessions/{id}/exercises/{sessionExerciseId}": {
        patch: {
          summary: "Update a session exercise",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
            {
              name: "sessionExerciseId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    target_sets: { type: "integer", minimum: 1, nullable: true },
                    target_reps: { type: "integer", minimum: 1, nullable: true },
                    target_weight_kg: { type: "number", minimum: 0, nullable: true },
                    base_weight_kg: { type: "number", minimum: 0, nullable: true },
                    notes: { type: "string", maxLength: 500, nullable: true },
                    not_done: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Updated session",
              ...jsonData({ $ref: "#/components/schemas/WorkoutSession" }),
            },
            ...errorResponse,
          },
        },
        delete: {
          summary: "Remove an exercise from a session",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
            {
              name: "sessionExerciseId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Updated session",
              ...jsonData({ $ref: "#/components/schemas/WorkoutSession" }),
            },
            ...errorResponse,
          },
        },
      },
      "/api/sessions/{id}/exercises/{sessionExerciseId}/sets": {
        post: {
          summary: "Log a set",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
            {
              name: "sessionExerciseId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["reps"],
                  properties: {
                    reps: { type: "integer", minimum: 1 },
                    weight_kg: { type: "number", minimum: 0, nullable: true },
                    is_warmup: { type: "boolean" },
                    notes: { type: "string", maxLength: 500, nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Updated session",
              ...jsonData({ $ref: "#/components/schemas/WorkoutSession" }),
            },
            ...errorResponse,
          },
        },
      },
      "/api/sessions/{id}/exercises/{sessionExerciseId}/sets/{setId}": {
        patch: {
          summary: "Update a logged set",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
            {
              name: "sessionExerciseId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "setId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    reps: { type: "integer", minimum: 1 },
                    weight_kg: { type: "number", minimum: 0, nullable: true },
                    is_warmup: { type: "boolean" },
                    notes: { type: "string", maxLength: 500, nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Updated session",
              ...jsonData({ $ref: "#/components/schemas/WorkoutSession" }),
            },
            ...errorResponse,
          },
        },
        delete: {
          summary: "Delete a logged set",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
            {
              name: "sessionExerciseId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
            {
              name: "setId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: {
            "200": {
              description: "Updated session",
              ...jsonData({ $ref: "#/components/schemas/WorkoutSession" }),
            },
            ...errorResponse,
          },
        },
      },
      "/api/templates": {
        get: {
          summary: "List workout templates",
          responses: {
            "200": {
              description: "Template list",
              ...jsonData({
                type: "array",
                items: { $ref: "#/components/schemas/WorkoutTemplateListItem" },
              }),
            },
            "401": errorResponse["401"],
          },
        },
        post: {
          summary: "Create a workout template",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "exercises"],
                  properties: {
                    name: { type: "string", maxLength: 120 },
                    notes: { type: "string", maxLength: 500, nullable: true },
                    exercises: {
                      type: "array",
                      items: { $ref: "#/components/schemas/SessionExerciseInput" },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Created template",
              ...jsonData({ $ref: "#/components/schemas/WorkoutTemplate" }),
            },
            ...errorResponse,
          },
        },
      },
      "/api/templates/{id}": {
        get: {
          summary: "Get a workout template",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": {
              description: "Template",
              ...jsonData({ $ref: "#/components/schemas/WorkoutTemplate" }),
            },
            "401": errorResponse["401"],
            "404": errorResponse["404"],
          },
        },
        put: {
          summary: "Replace a workout template",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "exercises"],
                  properties: {
                    name: { type: "string", maxLength: 120 },
                    notes: { type: "string", maxLength: 500, nullable: true },
                    exercises: {
                      type: "array",
                      items: { $ref: "#/components/schemas/SessionExerciseInput" },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Updated template",
              ...jsonData({ $ref: "#/components/schemas/WorkoutTemplate" }),
            },
            ...errorResponse,
          },
        },
        delete: {
          summary: "Delete a workout template",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          responses: {
            "200": {
              description: "Deleted",
              ...jsonData({
                type: "object",
                properties: { deleted: { type: "boolean" } },
              }),
            },
            "401": errorResponse["401"],
            "404": errorResponse["404"],
          },
        },
      },
      "/api/templates/{id}/sessions": {
        post: {
          summary: "Start a session from a template",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["performed_on"],
                  properties: {
                    performed_on: { type: "string", format: "date" },
                    notes: { type: "string", maxLength: 500, nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Created session",
              ...jsonData({ $ref: "#/components/schemas/WorkoutSession" }),
            },
            ...errorResponse,
          },
        },
      },
      ...resourceApiPaths,
    }),
  };
}
