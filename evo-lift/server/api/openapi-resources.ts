const uuid = { type: "string", format: "uuid" };
const date = { type: "string", format: "date" };
const idParam = { name: "id", in: "path", required: true, schema: uuid };

function jsonBody(schema: Record<string, unknown>) {
  return {
    required: true,
    content: { "application/json": { schema } },
  };
}

function ok(description: string) {
  return {
    "200": { description },
    "401": { description: "Missing/invalid bearer token" },
  };
}

export const resourceApiPaths = {
  "/api/plans": {
    get: { summary: "List plans", responses: ok("Plan list") },
    post: {
      summary: "Create a plan",
      requestBody: jsonBody({
        type: "object",
        required: ["name", "days"],
        properties: {
          name: { type: "string", maxLength: 120 },
          notes: { type: "string", maxLength: 500, nullable: true },
          is_active: { type: "boolean" },
          days: { type: "array", items: { type: "object" } },
        },
      }),
      responses: { "201": { description: "Created plan" }, "400": { description: "Invalid request" }, "401": ok("x")["401"] },
    },
  },
  "/api/plans/{id}": {
    get: { summary: "Get a plan", parameters: [idParam], responses: ok("Plan") },
    put: { summary: "Replace a plan", parameters: [idParam], responses: ok("Updated plan") },
    delete: { summary: "Delete a plan", parameters: [idParam], responses: ok("Deleted") },
  },
  "/api/plans/{id}/active": {
    post: {
      summary: "Set or clear the active plan",
      parameters: [idParam],
      requestBody: jsonBody({
        type: "object",
        required: ["is_active"],
        properties: { is_active: { type: "boolean" } },
      }),
      responses: ok("Active plan updated"),
    },
  },
  "/api/plans/{id}/duplicate": {
    post: { summary: "Duplicate a plan", parameters: [idParam], responses: { "201": { description: "Copied plan" } } },
  },
  "/api/plans/{id}/days/{dayId}/sessions": {
    post: {
      summary: "Start a session from a plan day",
      parameters: [idParam, { name: "dayId", in: "path", required: true, schema: uuid }],
      requestBody: jsonBody({
        type: "object",
        required: ["performed_on"],
        properties: { performed_on: date, notes: { type: "string", nullable: true } },
      }),
      responses: { "201": { description: "Created session" } },
    },
  },
  "/api/goals": {
    get: { summary: "List goals", responses: ok("Goals") },
    post: { summary: "Create a goal", responses: { "201": { description: "Created goal" } } },
  },
  "/api/goals/{id}": {
    get: { summary: "Get a goal", parameters: [idParam], responses: ok("Goal") },
    put: { summary: "Replace a goal", parameters: [idParam], responses: ok("Updated goal") },
    delete: { summary: "Delete a goal", parameters: [idParam], responses: ok("Deleted") },
  },
  "/api/account": {
    get: { summary: "Read the account email", responses: ok("Account") },
    delete: { summary: "Delete the account", responses: ok("Deleted") },
  },
  "/api/account/email": {
    patch: { summary: "Change the account email", responses: ok("Updated email") },
  },
  "/api/account/password": {
    patch: { summary: "Change the account password", responses: ok("Updated password") },
  },
  "/api/account/profile": {
    get: { summary: "Read body metrics", responses: ok("Profile") },
    put: { summary: "Save body metrics", responses: ok("Saved profile") },
  },
  "/api/account/bodyweight": {
    get: { summary: "List bodyweight entries", responses: ok("Bodyweight log") },
    post: { summary: "Add a bodyweight entry", responses: { "201": { description: "Created entry" } } },
  },
  "/api/account/bodyweight/{id}": {
    patch: { summary: "Edit a bodyweight entry", parameters: [idParam], responses: ok("Updated entry") },
    delete: { summary: "Delete a bodyweight entry", parameters: [idParam], responses: ok("Deleted") },
  },
  "/api/account/exercises/hidden": {
    get: { summary: "List hidden exercises", responses: ok("Hidden exercise ids") },
    put: { summary: "Replace hidden exercises", responses: ok("Hidden exercise ids") },
  },
  "/api/account/exercise-defaults": {
    get: { summary: "List exercise defaults", responses: ok("Defaults") },
  },
  "/api/account/exercise-defaults/{exerciseId}": {
    put: {
      summary: "Save exercise defaults",
      parameters: [{ name: "exerciseId", in: "path", required: true, schema: uuid }],
      responses: ok("Saved defaults"),
    },
    delete: {
      summary: "Clear exercise defaults",
      parameters: [{ name: "exerciseId", in: "path", required: true, schema: uuid }],
      responses: ok("Cleared defaults"),
    },
  },
  "/api/account/export": {
    get: {
      summary: "Download account data as JSON or a CSV zip",
      parameters: [
        { name: "format", in: "query", required: true, schema: { type: "string", enum: ["json", "csv"] } },
      ],
      responses: ok("Account file"),
    },
  },
  "/api/account/import": {
    post: {
      summary: "Import an account JSON file or CSV set",
      responses: {
        "200": { description: "Imported" },
        "400": { description: "Invalid file" },
        "401": { description: "Missing/invalid bearer token" },
      },
    },
  },
  "/api/account/tokens": {
    get: { summary: "List API tokens", responses: ok("Tokens") },
    post: { summary: "Create an API token", responses: { "201": { description: "Created token" } } },
  },
  "/api/account/tokens/{id}": {
    delete: { summary: "Revoke an API token", parameters: [idParam], responses: ok("Revoked") },
  },
  "/api/insights": {
    get: {
      summary: "Read Insights for a date window",
      parameters: [
        { name: "range", in: "query", schema: { type: "string", enum: ["4w", "12w", "6m", "all"] } },
        { name: "from", in: "query", schema: date },
        { name: "to", in: "query", schema: date },
      ],
      responses: ok("Insights"),
    },
  },
  "/api/activity": {
    get: {
      summary: "Read Home activity",
      parameters: [
        { name: "from", in: "query", schema: date },
        { name: "to", in: "query", schema: date },
      ],
      responses: ok("Activity"),
    },
  },
  "/api/exercises/{slug}/history": {
    get: {
      summary: "Read an exercise history and the same stats as the exercise page",
      parameters: [
        { name: "slug", in: "path", required: true, schema: { type: "string" } },
        { name: "from", in: "query", schema: date },
        { name: "to", in: "query", schema: date },
        { name: "hide_warmups", in: "query", schema: { type: "boolean" } },
      ],
      responses: ok("Exercise history"),
    },
  },
};
