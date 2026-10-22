type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
};

/** True in the Android shell, where a normal download link is unreliable. */
export function isNativeAppShell(): boolean {
  const capacitor = (globalThis as { Capacitor?: CapacitorGlobal }).Capacitor;
  return capacitor?.isNativePlatform?.() === true;
}

export function accountFileDelivery(input: { nativeShell: boolean; canShareFiles: boolean }): "share" | "anchor" {
  return input.nativeShell && input.canShareFiles ? "share" : "anchor";
}

export async function saveAccountFile(input: {
  filename: string;
  bytes: Uint8Array;
  mediaType: string;
  nativeShell?: boolean;
  canShareFiles?: (file: File) => boolean;
  shareFile?: (file: File) => Promise<void>;
  anchorDownload?: (filename: string, blob: Blob) => void;
}): Promise<"share" | "anchor"> {
  const blob = blobFromBytes(input.bytes, input.mediaType);
  const file = new File([blob], input.filename, { type: input.mediaType });
  const nativeShell = input.nativeShell ?? isNativeAppShell();
  const canShare = input.canShareFiles?.(file) ?? false;
  const delivery = accountFileDelivery({ nativeShell, canShareFiles: canShare });
  if (delivery === "share" && input.shareFile) {
    try {
      await input.shareFile(file);
      return "share";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "share";
      }
    }
  }
  const anchor =
    input.anchorDownload ??
    ((filename, contents) => {
      const url = URL.createObjectURL(contents);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    });
  anchor(input.filename, blob);
  return "anchor";
}

export function blobFromBytes(bytes: Uint8Array, mediaType: string): Blob {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return new Blob([copy], { type: mediaType });
}

export function filenameFromContentDisposition(header: string | null, fallback: string): string {
  const match = /filename="([^"]+)"/.exec(header ?? "");
  return match?.[1] || fallback;
}
