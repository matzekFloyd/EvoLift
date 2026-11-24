import { describe, expect, it } from "vitest";
import { readGatewayCredential } from "@/lib/gateway-credential";

describe("readGatewayCredential", () => {
  it("uses the API key when both credentials are set", () => {
    expect(
      readGatewayCredential({
        AI_GATEWAY_API_KEY: " gateway-key ",
        VERCEL_OIDC_TOKEN: "oidc-token",
      }),
    ).toBe("gateway-key");
  });

  it("uses the OIDC token when no API key is set", () => {
    expect(readGatewayCredential({ VERCEL_OIDC_TOKEN: " oidc-token " })).toBe("oidc-token");
  });

  it("returns null when both values are blank", () => {
    expect(readGatewayCredential({ AI_GATEWAY_API_KEY: " ", VERCEL_OIDC_TOKEN: "" })).toBeNull();
  });
});
