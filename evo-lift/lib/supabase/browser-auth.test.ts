import assert from "node:assert/strict";
import { afterEach, describe, it, vi } from "vitest";

const getUser = vi.fn();
const getSession = vi.fn();

vi.mock("@/lib/supabase/browser", () => ({
  supabaseBrowserClient: {
    auth: {
      getUser: (...args: unknown[]) => getUser(...args),
      getSession: (...args: unknown[]) => getSession(...args),
    },
  },
}));

afterEach(() => {
  getUser.mockReset();
  getSession.mockReset();
});

describe("browser-auth", () => {
  it("returns null from getBrowserUser when Auth rejects the session", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: { message: "invalid" } });
    const { getBrowserUser } = await import("./browser-auth");
    assert.equal(await getBrowserUser(), null);
    assert.equal(getSession.mock.calls.length, 0);
  });

  it("loads the access token only after getUser succeeds", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    getSession.mockResolvedValue({
      data: {
        session: {
          access_token: "tok",
          user: { id: "user-1" },
        },
      },
      error: null,
    });
    const { getBrowserAuthSession } = await import("./browser-auth");
    const session = await getBrowserAuthSession();
    assert.equal(session?.access_token, "tok");
    assert.equal(getUser.mock.calls.length, 1);
    assert.equal(getSession.mock.calls.length, 1);
  });
});
