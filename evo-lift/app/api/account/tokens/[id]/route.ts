import { NextRequest } from "next/server";
import { ApiHttpError, handleApi, jsonData, readRouteParams, requireUuid } from "@/server/api/http";
import { revokeApiToken } from "@/server/db/api-tokens";
import { requireOwnedApiTokenId } from "@/server/db/owned";

type TokenParams = { id: string };

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<TokenParams> | TokenParams },
) {
  return handleApi(request, async (auth) => {
    const { id } = await readRouteParams(context.params);
    const tokenId = await requireOwnedApiTokenId(
      auth.client,
      auth.userId,
      requireUuid(id, "token id"),
    );
    const revoked = await revokeApiToken(auth.client, auth.userId, tokenId);
    if (!revoked) {
      throw new ApiHttpError(400, "Could not revoke that API token. It may already be revoked.");
    }
    return jsonData({ deleted: true });
  });
}
