import sharp from "sharp";

export interface TransformResult {
  objectKey: string;
  contentType: string;
  data: Buffer;
}

export async function generateThumbnail(
  sourceBuffer: Buffer,
  jobId: string,
): Promise<TransformResult> {
  const data = await sharp(sourceBuffer)
    .resize(200, 200, { fit: "cover" })
    .webp({ quality: 80 })
    .toBuffer();

  return {
    objectKey: `outputs/${jobId}/thumbnail.webp`,
    contentType: "image/webp",
    data,
  };
}

export async function generateResized(
  sourceBuffer: Buffer,
  jobId: string,
): Promise<TransformResult> {
  const data = await sharp(sourceBuffer)
    .resize(800, 800, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  return {
    objectKey: `outputs/${jobId}/resized-800.webp`,
    contentType: "image/webp",
    data,
  };
}

export async function generateWebp(sourceBuffer: Buffer, jobId: string): Promise<TransformResult> {
  const data = await sharp(sourceBuffer).webp({ quality: 90 }).toBuffer();

  return {
    objectKey: `outputs/${jobId}/optimized.webp`,
    contentType: "image/webp",
    data,
  };
}
