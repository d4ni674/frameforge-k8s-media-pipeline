import { detectMimeType, validateFileMagic } from "./file-magic";

describe("file-magic", () => {
  describe("detectMimeType", () => {
    it("should detect JPEG", () => {
      const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(detectMimeType(buffer)).toBe("image/jpeg");
    });

    it("should detect PNG", () => {
      const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
      expect(detectMimeType(buffer)).toBe("image/png");
    });

    it("should detect GIF", () => {
      const buffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      expect(detectMimeType(buffer)).toBe("image/gif");
    });

    it("should detect WebP", () => {
      const buffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);
      expect(detectMimeType(buffer)).toBe("image/webp");
    });

    it("should return null for unknown bytes", () => {
      const buffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      expect(detectMimeType(buffer)).toBeNull();
    });
  });

  describe("validateFileMagic", () => {
    it("should validate matching JPEG", () => {
      const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(validateFileMagic(buffer, "image/jpeg")).toBe(true);
    });

    it("should reject mismatched type", () => {
      const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
      expect(validateFileMagic(buffer, "image/png")).toBe(false);
    });

    it("should reject unknown bytes", () => {
      const buffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      expect(validateFileMagic(buffer, "image/jpeg")).toBe(false);
    });

    it("should validate WebP with proper RIFF+WEBP structure", () => {
      const buffer = Buffer.alloc(16);
      buffer[0] = 0x52;
      buffer[1] = 0x49;
      buffer[2] = 0x46;
      buffer[3] = 0x46;
      buffer.writeUInt32LE(8, 4);
      buffer[8] = 0x56;
      buffer[9] = 0x50;
      buffer[10] = 0x38;
      buffer[11] = 0x20;
      expect(validateFileMagic(buffer, "image/webp")).toBe(true);
    });

    it("should reject WebP with RIFF header but wrong subtype", () => {
      const buffer = Buffer.alloc(16);
      buffer[0] = 0x52;
      buffer[1] = 0x49;
      buffer[2] = 0x46;
      buffer[3] = 0x46;
      buffer.writeUInt32LE(8, 4);
      buffer[8] = 0x41;
      buffer[9] = 0x56;
      buffer[10] = 0x49;
      buffer[11] = 0x31;
      expect(validateFileMagic(buffer, "image/webp")).toBe(false);
    });
  });
});
