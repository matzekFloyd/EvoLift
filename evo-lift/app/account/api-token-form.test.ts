import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  API_TOKEN_NAME_INITIAL,
  API_TOKEN_NAME_MAX_LENGTH,
  API_TOKEN_NAME_PLACEHOLDER,
} from "./api-token-form";

describe("api token form defaults", () => {
  it("starts empty and does not suggest Cursor or another IDE", () => {
    assert.equal(API_TOKEN_NAME_INITIAL, "");
    assert.equal(API_TOKEN_NAME_MAX_LENGTH, 40);
    assert.doesNotMatch(API_TOKEN_NAME_PLACEHOLDER, /cursor|vscode|jetbrains|copilot/i);
    assert.ok(API_TOKEN_NAME_PLACEHOLDER.trim().length > 0);
  });
});
