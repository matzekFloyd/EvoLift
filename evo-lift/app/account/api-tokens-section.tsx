"use client";

import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ActionButton } from "@/app/components/action-button";
import { AppTable } from "@/app/components/app-table";
import { SettingsSection, SettingsSectionBody } from "@/app/components/settings-section";
import { SettingsSectionHeader } from "@/app/components/settings-section-header";
import { StatusNotice } from "@/app/components/status-notice";
import {
  createUserApiToken,
  listUserApiTokens,
  revokeUserApiToken,
} from "@/server/actions/api-tokens";
import type { ApiTokenListItem } from "@/server/db/api-tokens";

type AccountApiTokensSectionProps = {
  accessToken: string;
};

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function AccountApiTokensSection({ accessToken }: AccountApiTokensSectionProps) {
  const [tokens, setTokens] = useState<ApiTokenListItem[]>([]);
  const [name, setName] = useState("Cursor");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"error" | "success" | "warning">("success");
  const [plaintextToken, setPlaintextToken] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTokens() {
      try {
        const rows = await listUserApiTokens(accessToken);
        if (isMounted) {
          setTokens(rows);
        }
      } catch (error) {
        if (isMounted) {
          setMessageTone("error");
          setMessage(
            error instanceof Error ? error.message : "Could not load API tokens.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadTokens();

    return () => {
      isMounted = false;
    };
  }, [accessToken]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setMessage(null);
    try {
      const created = await createUserApiToken({ accessToken, name });
      setTokens((prev) => [created.item, ...prev]);
      setPlaintextToken(created.token);
      setMessageTone("warning");
      setMessage("Copy this token now. It will not be shown again.");
      setName("Cursor");
    } catch (error) {
      setPlaintextToken(null);
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not create API token.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCopy() {
    if (!plaintextToken) {
      return;
    }
    try {
      await navigator.clipboard.writeText(plaintextToken);
      setMessageTone("success");
      setMessage("Token copied.");
    } catch {
      setMessageTone("error");
      setMessage("Could not copy the token. Select it and copy manually.");
    }
  }

  async function handleRevoke(tokenId: string) {
    setRevokingId(tokenId);
    setMessage(null);
    try {
      await revokeUserApiToken({ accessToken, tokenId });
      setTokens((prev) => prev.filter((row) => row.id !== tokenId));
      setMessageTone("success");
      setMessage("API token revoked.");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : "Could not revoke API token.");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <SettingsSection>
      <SettingsSectionHeader
        title="API tokens"
        description="Long-lived tokens for Cursor and other tools. They do not expire. Revoke a token if it leaks. The full value is shown only once."
        icon={<KeyRound className="h-4 w-4 text-zinc-500" />}
      />
      <p className="mt-1.5 text-sm text-zinc-600">
        <Link className="font-medium text-sky-800 hover:text-sky-950" href="/docs">
          Open API docs
        </Link>{" "}
        to try endpoints in the browser with your session.
      </p>
      <SettingsSectionBody>
        <form onSubmit={handleCreate} className="space-y-3">
          <label className="block text-sm font-medium">
            Token name
            <input
              type="text"
              maxLength={40}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              placeholder="Cursor"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {message ? (
              <StatusNotice
                message={message}
                tone={messageTone}
                onDismiss={() => setMessage(null)}
                className="sm:flex-1"
              />
            ) : (
              <div className="hidden sm:block sm:flex-1" />
            )}
            <ActionButton type="submit" variant="primary" disabled={isCreating} className="w-full sm:w-40">
              <Plus className="h-3.5 w-3.5" />
              Create token
            </ActionButton>
          </div>
        </form>

        {plaintextToken ? (
          <div className="mt-4 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3">
            <p className="text-sm font-medium text-zinc-800">New token</p>
            <code className="block break-all rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-800">
              {plaintextToken}
            </code>
            <ActionButton type="button" variant="secondary" size="sm" onClick={() => void handleCopy()}>
              <Copy className="h-3 w-3" />
              Copy token
            </ActionButton>
          </div>
        ) : null}

        <div className="mt-4">
          {isLoading ? (
            <p className="text-sm text-zinc-600">Loading API tokens...</p>
          ) : tokens.length === 0 ? (
            <p className="text-sm text-zinc-600">No active API tokens.</p>
          ) : (
            <AppTable>
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-600">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Prefix</th>
                  <th className="px-3 py-2">Created</th>
                  <th className="px-3 py-2">Last used</th>
                  <th className="px-3 py-2 text-right"> </th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-3 py-2 text-zinc-800">{row.name}</td>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-700">{row.tokenPrefix}…</td>
                    <td className="px-3 py-2 text-zinc-600">{formatTimestamp(row.createdAt)}</td>
                    <td className="px-3 py-2 text-zinc-600">
                      {row.lastUsedAt ? formatTimestamp(row.lastUsedAt) : "Never"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <ActionButton
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={revokingId === row.id}
                        onClick={() => void handleRevoke(row.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                        Revoke
                      </ActionButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </AppTable>
          )}
        </div>
      </SettingsSectionBody>
    </SettingsSection>
  );
}
