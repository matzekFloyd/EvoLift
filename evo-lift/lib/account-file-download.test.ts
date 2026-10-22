import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  accountFileDelivery,
  filenameFromContentDisposition,
  saveAccountFile,
} from "@/lib/account-file-download";

describe("account file download", () => {
  it("shares a file in the Android shell and otherwise uses a download link", () => {
    assert.equal(accountFileDelivery({ nativeShell: true, canShareFiles: true }), "share");
    assert.equal(accountFileDelivery({ nativeShell: true, canShareFiles: false }), "anchor");
    assert.equal(accountFileDelivery({ nativeShell: false, canShareFiles: true }), "anchor");
  });

  it("reads the download filename and falls back when sharing fails", async () => {
    assert.equal(
      filenameFromContentDisposition('attachment; filename="evolift-account.json"', "fallback.json"),
      "evolift-account.json",
    );
    assert.equal(filenameFromContentDisposition(null, "fallback.json"), "fallback.json");

    const saved: { shared: string | null; anchored: string | null } = { shared: null, anchored: null };
    const bytes = new TextEncoder().encode("hello");
    const sharedResult = await saveAccountFile({
      filename: "evolift-account.json",
      bytes,
      mediaType: "application/json",
      nativeShell: true,
      canShareFiles: () => true,
      shareFile: async (file) => {
        saved.shared = file.name;
      },
      anchorDownload: (filename) => {
        saved.anchored = filename;
      },
    });
    assert.equal(sharedResult, "share");
    assert.equal(saved.shared, "evolift-account.json");
    assert.equal(saved.anchored, null);

    const fallback = await saveAccountFile({
      filename: "evolift-account.csv.zip",
      bytes,
      mediaType: "application/zip",
      nativeShell: true,
      canShareFiles: () => true,
      shareFile: async () => {
        throw new Error("share failed");
      },
      anchorDownload: (filename) => {
        saved.anchored = filename;
      },
    });
    assert.equal(fallback, "anchor");
    assert.equal(saved.anchored, "evolift-account.csv.zip");
  });
});
