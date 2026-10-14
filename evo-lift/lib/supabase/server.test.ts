import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;
const previous = new Map<string, string | undefined>();

function rememberEnv() {
  for (const key of ENV_KEYS) {
    if (!previous.has(key)) {
      previous.set(key, process.env[key]);
    }
  }
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = previous.get(key);
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("supabase server clients", () => {
  afterEach(() => {
    vi.resetModules();
    restoreEnv();
  });

  it("strips a copied REST path and keeps the service role off the public client", async () => {
    rememberEnv();
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co/rest/v1";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
    const { createPublicServerClient, createServiceRoleClient } = await import("./server");
    const service = createServiceRoleClient();
    const anon = createPublicServerClient();
    const withToken = createPublicServerClient("access-token");
    assert.equal(Reflect.get(service, "supabaseUrl"), "https://example.supabase.co");
    assert.equal(Reflect.get(service, "supabaseKey"), "service-key");
    assert.equal(Reflect.get(anon, "supabaseKey"), "anon-key");
    assert.notEqual(withToken, anon);
  });

  it("requires the service role key", async () => {
    rememberEnv();
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await assert.rejects(() => import("./server"), /Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY/);
  });
});
