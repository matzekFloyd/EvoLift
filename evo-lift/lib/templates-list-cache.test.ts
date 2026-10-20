import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { invalidateTemplatesList, loadTemplatesList, peekTemplatesList } from "./templates-list-cache";

function templatesClient(result: { data: unknown; error: { message: string } | null }) {
  let calls = 0;
  const client = {
    from() {
      calls += 1;
      const builder = {
        select() {
          return builder;
        },
        order() {
          return Promise.resolve(result);
        },
      };
      return builder;
    },
  };
  return {
    client,
    get calls() {
      return calls;
    },
  };
}

describe("templates list cache", () => {
  beforeEach(() => {
    invalidateTemplatesList();
  });

  it("remembers templates and counts exercises", async () => {
    const source = templatesClient({
      data: [
        {
          id: "template-1",
          name: "Squat day",
          notes: null,
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-02T00:00:00Z",
          workout_template_exercises: [{ id: "e1" }],
        },
      ],
      error: null,
    });
    const loaded = await loadTemplatesList(source.client as never, "user-1");
    await loadTemplatesList(source.client as never, "user-1");
    assert.equal(source.calls, 1);
    assert.equal(loaded.rows[0]?.exerciseCount, 1);
    assert.equal(peekTemplatesList("user-1")?.[0]?.name, "Squat day");
  });

  it("returns the templates load error", async () => {
    const source = templatesClient({ data: null, error: { message: "down" } });
    assert.equal((await loadTemplatesList(source.client as never, "user-1")).error, "Could not load templates.");
  });
});
