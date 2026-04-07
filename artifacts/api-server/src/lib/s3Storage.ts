import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import path from "path";

export function s3IsConfigured(): boolean {
  return !!(
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  );
}

function buildClient(): any {
  return new S3Client({
    region: process.env.S3_REGION ?? "auto",
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  });
}

/**
 * Uploads a file buffer to S3-compatible storage.
 * Returns { key, publicUrl } — publicUrl is null if no S3_PUBLIC_URL is configured
 * (caller should fall back to a proxy route using the key).
 */
export async function uploadToS3(
  buffer: Buffer,
  originalName: string,
  contentType: string,
  prefix = "uploads"
): Promise<{ key: string; publicUrl: string | null } | null> {
  if (!s3IsConfigured()) return null;

  const ext = path.extname(originalName) || "";
  const key = `${prefix}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  const bucket = process.env.S3_BUCKET!;

  const client = buildClient();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  const base = process.env.S3_PUBLIC_URL?.replace(/\/$/, "");
  return { key, publicUrl: base ? `${base}/${key}` : null };
}

/**
 * Fetches a file from S3-compatible storage by key and streams it to the response.
 */
export async function streamFromS3(key: string): Promise<{ body: NodeJS.ReadableStream; contentType: string } | null> {
  if (!s3IsConfigured()) return null;

  const client = buildClient();
  const bucket = process.env.S3_BUCKET!;

  try {
    const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!result.Body) return null;
    const body = result.Body as unknown as NodeJS.ReadableStream;
    const contentType = result.ContentType ?? "application/octet-stream";
    return { body, contentType };
  } catch {
    return null;
  }
}
