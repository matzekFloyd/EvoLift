import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  SOCIAL_SIGN_IN_ENABLED,
  SOCIAL_SIGN_IN_PROVIDERS,
  socialSignInControlDisabled,
  friendlyOAuthError,
  loadSocialAuthSettings,
  oauthCallbackDecision,
  oauthLoginNotice,
  oauthLoginPath,
  socialProvidersFromAuthSettings,
  socialSignInBlockedMessage,
} from "./social-sign-in";

describe("social sign-in", () => {
  it("offers Google and Apple with equal labels and no magic link", () => {
    assert.deepEqual(
      SOCIAL_SIGN_IN_PROVIDERS.map((item) => item.provider),
      ["google", "apple"],
    );
    assert.deepEqual(
      SOCIAL_SIGN_IN_PROVIDERS.map((item) => item.label),
      ["Sign in with Google", "Sign in with Apple"],
    );
    assert.equal(SOCIAL_SIGN_IN_ENABLED.google, false);
    assert.equal(SOCIAL_SIGN_IN_ENABLED.apple, false);
    assert.equal(socialSignInControlDisabled({ provider: "google", busy: false }), true);
    assert.equal(socialSignInControlDisabled({ provider: "apple", busy: false }), true);
  });

  it("turns the OAuth return into a fixed login notice", () => {
    assert.deepEqual(oauthCallbackDecision(new URLSearchParams("code=abc&sb_flow_id=flow-1")), {
      action: "exchange",
      code: "abc",
      flowId: "flow-1",
    });
    assert.deepEqual(oauthCallbackDecision(new URLSearchParams("code=abc")), {
      action: "exchange",
      code: "abc",
      flowId: null,
    });
    assert.deepEqual(oauthCallbackDecision(new URLSearchParams("error=access_denied")), {
      action: "login",
      notice: "cancelled",
    });
    assert.deepEqual(
      oauthCallbackDecision(
        new URLSearchParams(
          "error=server_error&error_code=email_exists&error_description=User%20already%20registered",
        ),
      ),
      { action: "login", notice: "email_taken" },
    );
    assert.deepEqual(
      oauthCallbackDecision(
        new URLSearchParams("error=server_error&error_description=Identity%20is%20already%20linked"),
      ),
      { action: "login", notice: "email_taken" },
    );
    assert.deepEqual(
      oauthCallbackDecision(
        new URLSearchParams("error=server_error&error_description=database%20error%20querying%20schema"),
      ),
      { action: "login", notice: "failed" },
    );
    assert.equal(oauthLoginPath("failed"), "/login?oauth=failed");
  });

  it("shows only our own oauth notices", () => {
    assert.equal(oauthLoginNotice("cancelled"), "Sign-in was cancelled.");
    assert.equal(
      oauthLoginNotice("email_taken"),
      "This email already has an EvoLift account. Log in with email and password.",
    );
    assert.match(oauthLoginNotice("failed") ?? "", /Google or Apple/);
    assert.equal(oauthLoginNotice("database error querying schema"), null);
    assert.equal(oauthLoginNotice(null), null);
  });

  it("never returns the raw provider message", () => {
    const raw = "AuthApiError: gotrue panic provider is not enabled for tenant xyz";
    const google = friendlyOAuthError(raw, "google");
    const apple = friendlyOAuthError("unexpected oauth failure token=secret", "apple");
    assert.equal(google, "Google sign-in is not available right now. Use email and password.");
    assert.equal(apple, "Could not sign in with Apple. Try again, or use email and password.");
    assert.equal(
      friendlyOAuthError("email rate limit exceeded", "google"),
      "Too many attempts. Wait a few minutes, then try again.",
    );
    assert.doesNotMatch(google, /gotrue|tenant xyz|panic/i);
    assert.doesNotMatch(apple, /secret|unexpected oauth/i);
  });

  it("starts OAuth only when Auth reports that provider enabled", () => {
    const settings = { external: { google: true, apple: false, email: true } };
    assert.deepEqual(socialProvidersFromAuthSettings(settings), ["google"]);
    assert.equal(socialSignInBlockedMessage(settings, "google"), null);
    assert.equal(
      socialSignInBlockedMessage(settings, "apple"),
      "Apple sign-in is not available right now. Use email and password.",
    );
    assert.equal(
      socialSignInBlockedMessage(null, "google"),
      "Google sign-in is not available right now. Use email and password.",
    );
    assert.deepEqual(socialProvidersFromAuthSettings({ external: "nope" }), []);
  });

  it("reads provider flags without calling the network when fetch is injected", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ external: { apple: true } }), { status: 200 });
    const settings = await loadSocialAuthSettings({
      supabaseUrl: "http://127.0.0.1:54321/rest/v1",
      anonKey: "anon",
      fetchImpl: fetchImpl as typeof fetch,
    });
    assert.deepEqual(socialProvidersFromAuthSettings(settings), ["apple"]);
    assert.equal(
      await loadSocialAuthSettings({ supabaseUrl: " ", anonKey: "anon", fetchImpl: fetchImpl as typeof fetch }),
      null,
    );
  });
});
