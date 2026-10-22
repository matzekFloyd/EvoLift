import { inflateRawSync } from "node:zlib";
import { AccountTransferError, MAX_ACCOUNT_TRANSFER_BYTES } from "@/lib/account-transfer";

const LOCAL_HEADER = 0x04034b50;
const CENTRAL_HEADER = 0x02014b50;
const EOCD_HEADER = 0x06054b50;
const UTF8_FLAG = 0x800;

export function zipStoredFiles(files: ReadonlyArray<{ name: string; bytes: Uint8Array }>): Uint8Array {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.bytes);
    const local = new Uint8Array(30 + name.length);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, LOCAL_HEADER, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, UTF8_FLAG, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, file.bytes.length, true);
    localView.setUint32(22, file.bytes.length, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);
    local.set(name, 30);
    locals.push(local, file.bytes);

    const central = new Uint8Array(46 + name.length);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, CENTRAL_HEADER, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, UTF8_FLAG, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, file.bytes.length, true);
    centralView.setUint32(24, file.bytes.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);
    offset += local.length + file.bytes.length;
  }

  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, EOCD_HEADER, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, files.length, true);
  eocdView.setUint16(10, files.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, offset, true);
  eocdView.setUint16(20, 0, true);

  const total = offset + centralSize + eocd.length;
  const archive = new Uint8Array(total);
  let cursor = 0;
  for (const part of locals) {
    archive.set(part, cursor);
    cursor += part.length;
  }
  for (const part of centrals) {
    archive.set(part, cursor);
    cursor += part.length;
  }
  archive.set(eocd, cursor);
  return archive;
}

export function unzipStoredFiles(bytes: Uint8Array): Map<string, Uint8Array> {
  if (bytes.byteLength < 22) {
    throw new AccountTransferError("The CSV archive is not a zip file.");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  const start = Math.max(0, bytes.length - 22 - 65535);
  for (let index = bytes.length - 22; index >= start; index -= 1) {
    if (view.getUint32(index, true) === EOCD_HEADER) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) {
    throw new AccountTransferError("The CSV archive is not a zip file.");
  }
  const count = view.getUint16(eocd + 10, true);
  let cursor = view.getUint32(eocd + 16, true);
  const files = new Map<string, Uint8Array>();
  const decoder = new TextDecoder();
  for (let index = 0; index < count; index += 1) {
    if (cursor + 46 > bytes.length || view.getUint32(cursor, true) !== CENTRAL_HEADER) {
      throw new AccountTransferError("The CSV archive is not a zip file.");
    }
    const method = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const nameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localOffset = view.getUint32(cursor + 42, true);
    const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    cursor += 46 + nameLength + extraLength + commentLength;
    if (uncompressedSize > MAX_ACCOUNT_TRANSFER_BYTES || compressedSize > MAX_ACCOUNT_TRANSFER_BYTES) {
      throw new AccountTransferError("The file is too large.");
    }
    if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== LOCAL_HEADER) {
      throw new AccountTransferError("The CSV archive is not a zip file.");
    }
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
    if (dataStart + compressedSize > bytes.length) {
      throw new AccountTransferError("The CSV archive is not a zip file.");
    }
    const payload = inflateEntry(method, compressed, uncompressedSize);
    const baseName = name.split(/[/\\]/).pop() ?? name;
    if (!baseName || baseName.startsWith(".") || name.includes("__MACOSX")) {
      continue;
    }
    if (files.has(baseName)) {
      throw new AccountTransferError(`The CSV set includes ${baseName} more than once.`);
    }
    files.set(baseName, payload);
  }
  return files;
}

function inflateEntry(method: number, compressed: Uint8Array, declared: number): Uint8Array {
  if (method === 0) {
    return compressed;
  }
  if (method !== 8) {
    throw new AccountTransferError("The CSV archive uses a compression this app cannot read.");
  }
  try {
    const inflated = inflateRawSync(compressed, { maxOutputLength: MAX_ACCOUNT_TRANSFER_BYTES });
    if (inflated.byteLength !== declared && declared !== 0) {
      return new Uint8Array(inflated);
    }
    return new Uint8Array(inflated);
  } catch {
    throw new AccountTransferError("The file is too large.");
  }
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
