const MAGIC_BYTES: Map<string, number[]> = new Map([
  ["image/jpeg", [0xff, 0xd8, 0xff]],
  ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  ["image/gif", [0x47, 0x49, 0x46, 0x38]],
  ["image/webp", [0x52, 0x49, 0x46, 0x46]],
]);

export function detectMimeType(buffer: Buffer): string | null {
  for (const [mimeType, magic] of MAGIC_BYTES) {
    let match = true;
    for (let i = 0; i < magic.length; i++) {
      if (buffer[i] !== magic[i]) {
        match = false;
        break;
      }
    }
    if (match) return mimeType;
  }
  return null;
}

export function validateFileMagic(buffer: Buffer, declaredMimetype: string): boolean {
  const detected = detectMimeType(buffer);
  if (!detected) return false;

  if (declaredMimetype === "image/webp") {
    if (detected !== "image/webp" || buffer.length < 12) return false;
    const chunk = buffer.slice(8, 12).toString("ascii");
    return chunk === "VP8 " || chunk === "VP8L" || chunk === "VP8X";
  }

  return detected === declaredMimetype;
}
