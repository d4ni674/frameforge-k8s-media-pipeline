import sharp from "sharp";
import { generateThumbnail, generateResized, generateWebp } from "./image";

describe("Image transforms", () => {
  const createTestBuffer = async (): Promise<Buffer> => {
    return sharp({
      create: {
        width: 1000,
        height: 1000,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();
  };

  it("generateThumbnail should produce 200x200 webp", async () => {
    const source = await createTestBuffer();
    const result = await generateThumbnail(source, "job-1");

    expect(result.objectKey).toBe("outputs/job-1/thumbnail.webp");
    expect(result.contentType).toBe("image/webp");

    const metadata = await sharp(result.data).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBeLessThanOrEqual(200);
    expect(metadata.height).toBeLessThanOrEqual(200);
  });

  it("generateResized should produce 800x800 webp", async () => {
    const source = await createTestBuffer();
    const result = await generateResized(source, "job-2");

    expect(result.objectKey).toBe("outputs/job-2/resized-800.webp");

    const metadata = await sharp(result.data).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBeLessThanOrEqual(800);
    expect(metadata.height).toBeLessThanOrEqual(800);
  });

  it("generateWebp should produce optimized webp", async () => {
    const source = await createTestBuffer();
    const result = await generateWebp(source, "job-3");

    expect(result.objectKey).toBe("outputs/job-3/optimized.webp");

    const metadata = await sharp(result.data).metadata();
    expect(metadata.format).toBe("webp");
  });
});
