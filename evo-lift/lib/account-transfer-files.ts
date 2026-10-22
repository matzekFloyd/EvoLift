import {
  AccountTransferError,
  MAX_ACCOUNT_TRANSFER_BYTES,
  parseAccountTransferJson,
  type AccountTransfer,
} from "@/lib/account-transfer";
import { ACCOUNT_CSV_FILES, accountTransferFromCsvFiles } from "@/lib/account-transfer-csv";
import { unzipStoredFiles } from "@/lib/account-transfer-zip";

export function documentFromUploads(
  files: ReadonlyArray<{ name: string; bytes: Uint8Array }>,
  today: string,
): AccountTransfer {
  if (files.length === 0) {
    throw new AccountTransferError("Please choose a JSON file or the CSV set.");
  }
  const total = files.reduce((sum, file) => sum + file.bytes.byteLength, 0);
  if (total > MAX_ACCOUNT_TRANSFER_BYTES) {
    throw new AccountTransferError("The file is too large.");
  }
  const kinds = files.map(fileKind);
  if (kinds.length === 1 && kinds[0] === "json") {
    return parseAccountTransferJson(decodeText(files[0]?.bytes ?? new Uint8Array()), today);
  }
  if (kinds.length === 1 && kinds[0] === "zip") {
    const unzipped = unzipStoredFiles(files[0]?.bytes ?? new Uint8Array());
    return accountTransferFromCsvFiles(csvTexts(unzipped), today);
  }
  if (kinds.every((kind) => kind === "csv")) {
    const texts = new Map<string, string>();
    for (const file of files) {
      const name = baseName(file.name);
      if (texts.has(name)) {
        throw new AccountTransferError(`The CSV set includes ${name} more than once.`);
      }
      texts.set(name, decodeText(file.bytes));
    }
    return accountTransferFromCsvFiles(texts, today);
  }
  throw new AccountTransferError("Please choose a JSON file or the CSV set.");
}

function csvTexts(files: ReadonlyMap<string, Uint8Array>): Map<string, string> {
  const texts = new Map<string, string>();
  for (const name of ACCOUNT_CSV_FILES) {
    const bytes = files.get(name);
    if (bytes) {
      texts.set(name, decodeText(bytes));
    }
  }
  return texts;
}

function fileKind(file: { name: string; bytes: Uint8Array }): "json" | "zip" | "csv" | "unknown" {
  const name = baseName(file.name).toLowerCase();
  if (name.endsWith(".json")) {
    return "json";
  }
  if (name.endsWith(".zip")) {
    return "zip";
  }
  if (name.endsWith(".csv")) {
    return "csv";
  }
  if (file.bytes[0] === 0x7b) {
    return "json";
  }
  if (file.bytes[0] === 0x50 && file.bytes[1] === 0x4b) {
    return "zip";
  }
  return "unknown";
}

function baseName(name: string): string {
  return name.split(/[/\\]/).pop() ?? name;
}

function decodeText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
