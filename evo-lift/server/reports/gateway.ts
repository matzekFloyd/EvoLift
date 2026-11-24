import { ApiHttpError } from "@/server/api/errors";
import {
  REPORT_FAILED_MESSAGE,
  REPORT_UNAVAILABLE_MESSAGE,
  reportAllowancePaused,
  reportGatewayFailure,
  reportSpendableUsd,
  trainingReportInstructions,
  withMedicalLine,
  type ReportKind,
} from "@/lib/training-report";

/** Text model from the AI Gateway getting-started sample. Spend stays inside the team budget. */
export const REPORT_MODEL = "google/gemini-2.5-flash-lite";

const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
const CREDITS_URL = "https://ai-gateway.vercel.sh/v1/credits";
const MAX_OUTPUT_TOKENS = 900;

function gatewayCredential(): string | null {
  const key = process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim();
  return key || null;
}

/** True when the shared balance was read and cannot cover another report. A failed read stays open. */
export async function reportAllowanceIsPaused(): Promise<boolean> {
  const credential = gatewayCredential();
  if (!credential) {
    return false;
  }
  try {
    const response = await fetch(CREDITS_URL, {
      method: "GET",
      headers: { authorization: `Bearer ${credential}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return false;
    }
    return reportAllowancePaused(reportSpendableUsd(await response.json()));
  } catch (error) {
    console.error("[reports] credits request failed", error instanceof Error ? error.name : "error");
    return false;
  }
}

export async function writeTrainingReport(
  facts: string,
  kind: ReportKind = "recent",
): Promise<{ text: string; model: string }> {
  const credential = gatewayCredential();
  if (!credential) {
    throw new ApiHttpError(503, REPORT_UNAVAILABLE_MESSAGE);
  }

  let response: Response;
  try {
    response = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${credential}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: REPORT_MODEL,
        temperature: 0.2,
        max_tokens: MAX_OUTPUT_TOKENS,
        messages: [
          { role: "system", content: trainingReportInstructions(kind) },
          { role: "user", content: facts },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    console.error("[reports] gateway request failed", error instanceof Error ? error.name : "error");
    throw new ApiHttpError(503, REPORT_FAILED_MESSAGE);
  }

  if (!response.ok) {
    console.error("[reports] gateway status", response.status);
    const failure = reportGatewayFailure(response.status);
    throw new ApiHttpError(failure.status, failure.message);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? withMedicalLine(content) : "";
  if (!text) {
    throw new ApiHttpError(503, REPORT_FAILED_MESSAGE);
  }
  return { text: text.slice(0, 12000), model: REPORT_MODEL };
}
