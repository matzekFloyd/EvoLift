import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";

const ENV_KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"] as const;
const previous = new Map<string, string | undefined>();

describe("supabase browser client", () => {
  afterEach(() => {
    vi.resetModules();
    for (const key of ENV_KEYS) {
      const value = previous.get(key);
      if (value == null) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("strips a copied REST path from the project URL", async () => {
    for (const key of ENV_KEYS) {
      previous.set(key, process.env[key]);
    }
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321/rest/v1/";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    const { supabaseBrowserClient } = await import("./browser");
    assert.equal(Reflect.get(supabaseBrowserClient, "supabaseUrl"), "http://127.0.0.1:54321");
    assert.equal(Reflect.get(supabaseBrowserClient, "supabaseKey"), "anon-key");
  });

  it("requires the public URL and anon key", async () => {
    for (const key of ENV_KEYS) {
      previous.set(key, process.env[key]);
    }
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    await assert.rejects(() => import("./browser"), /Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL/);

    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    await assert.rejects(
      () => import("./browser"),
      /Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });
});
