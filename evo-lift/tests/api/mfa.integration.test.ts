import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { afterAll, describe, it } from "vitest";
import { GET as getExercises } from "@/app/api/exercises/route";
import { friendlyAuthError } from "@/lib/friendly-auth-error";
import { authenticatorAssuranceLevelFromJwt, MFA_SESSION_REQUIRED } from "@/lib/mfa-assurance";
import {
  adminClient,
  anonClient,
  assertHttpStatus,
  assertLocalSupabase,
  buildRequest,
  deleteTestUsers,
  readJson,
  TEST_PASSWORD,
} from "./integration-helpers";

assertLocalSupabase();

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/g, "").toUpperCase().replace(/\s/g, "");
  let bits = "";
  for (const char of cleaned) {
    const value = BASE32.indexOf(char);
    if (value < 0) {
      throw new Error("Setup key is not base32.");
    }
    bits += value.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function totpCode(secret: string, at = Date.now()): string {
  const counter = Math.floor(at / 30_000);
  const counterBytes = Buffer.alloc(8);
  counterBytes.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", base32Decode(secret)).update(counterBytes).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7f_ff_ff_ff;
  return String(binary % 1_000_000).padStart(6, "0");
}

function wrongTotpCode(secret: string): string {
  const blocked = new Set(
    [-2, -1, 0, 1, 2].map((step) => totpCode(secret, Date.now() + step * 30_000)),
  );
  for (let value = 0; value < 1_000_000; value += 1) {
    const candidate = String(value).padStart(6, "0");
    if (!blocked.has(candidate)) {
      return candidate;
    }
  }
  return "000000";
}

describe("optional authenticator MFA", () => {
  const admin = adminClient();
  const userIds: string[] = [];

  afterAll(async () => {
    await deleteTestUsers(admin, userIds);
  });

  it("enrolls an authenticator, rejects a bad code, and accepts the real one", async () => {
    const email = `mfa-${crypto.randomUUID()}@example.com`;
    const created = await admin.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    assert.equal(created.error, null, created.error?.message ?? "Could not create a test user.");
    assert.ok(created.data.user);
    userIds.push(created.data.user.id);

    const plain = anonClient();
    const plainSignIn = await plain.auth.signInWithPassword({ email, password: TEST_PASSWORD });
    assert.equal(plainSignIn.error, null, plainSignIn.error?.message ?? "Could not sign in.");
    const plainToken = plainSignIn.data.session?.access_token;
    assert.ok(plainToken);
    const before = await readJson(await getExercises(buildRequest("/api/exercises", "GET", plainToken)));
    assertHttpStatus(before.status, 200, before.body.error);

    const enrolled = await plain.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator app",
      issuer: "EvoLift",
    });
    assert.equal(enrolled.error, null, enrolled.error?.message ?? "Could not enroll an authenticator.");
    assert.ok(enrolled.data);
    const factorId = enrolled.data.id;
    const secret = enrolled.data.totp.secret;

    const challenge = await plain.auth.mfa.challenge({ factorId });
    assert.equal(challenge.error, null, challenge.error?.message ?? "Could not start a challenge.");
    assert.ok(challenge.data);
    const verified = await plain.auth.mfa.verify({
      factorId,
      challengeId: challenge.data.id,
      code: totpCode(secret),
    });
    if (verified.error) {
      const retryChallenge = await plain.auth.mfa.challenge({ factorId });
      assert.ok(retryChallenge.data);
      const retry = await plain.auth.mfa.verify({
        factorId,
        challengeId: retryChallenge.data.id,
        code: totpCode(secret),
      });
      assert.equal(retry.error, null, retry.error?.message ?? "Could not verify the authenticator.");
    }

    const login = anonClient();
    const loginSignIn = await login.auth.signInWithPassword({ email, password: TEST_PASSWORD });
    assert.equal(loginSignIn.error, null, loginSignIn.error?.message ?? "Could not sign in again.");
    const aal1 = loginSignIn.data.session?.access_token;
    assert.ok(aal1);
    assert.equal(authenticatorAssuranceLevelFromJwt(aal1), "aal1");
    const blocked = await readJson(await getExercises(buildRequest("/api/exercises", "GET", aal1)));
    assert.equal(blocked.status, 401);
    assert.equal(blocked.body.error, MFA_SESSION_REQUIRED);

    const badChallenge = await login.auth.mfa.challenge({ factorId });
    assert.ok(badChallenge.data);
    const bad = await login.auth.mfa.verify({
      factorId,
      challengeId: badChallenge.data.id,
      code: wrongTotpCode(secret),
    });
    assert.ok(bad.error);
    const friendly = friendlyAuthError(bad.error.message, "mfa");
    assert.equal(friendly, "That code is not valid. Check the authenticator app and try again.");
    assert.notEqual(friendly, bad.error.message);

    const goodChallenge = await login.auth.mfa.challenge({ factorId });
    assert.ok(goodChallenge.data);
    let good = await login.auth.mfa.verify({
      factorId,
      challengeId: goodChallenge.data.id,
      code: totpCode(secret),
    });
    if (good.error) {
      const again = await login.auth.mfa.challenge({ factorId });
      assert.ok(again.data);
      good = await login.auth.mfa.verify({
        factorId,
        challengeId: again.data.id,
        code: totpCode(secret),
      });
    }
    assert.equal(good.error, null, good.error?.message ?? "Could not verify the authenticator.");
    const elevated = (await login.auth.getSession()).data.session?.access_token;
    assert.ok(elevated);
    assert.equal(authenticatorAssuranceLevelFromJwt(elevated), "aal2");
    const allowed = await readJson(await getExercises(buildRequest("/api/exercises", "GET", elevated)));
    assertHttpStatus(allowed.status, 200, allowed.body.error);
  });
});
