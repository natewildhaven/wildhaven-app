import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { uploadToS3, streamFromS3, s3IsConfigured } from "../lib/s3Storage.js";

const localUploadsDir = path.join("/tmp", "uploads");

if (!fs.existsSync(localUploadsDir)) {
  fs.mkdirSync(localUploadsDir, { recursive: true });
}

const memoryStorage = multer.memoryStorage();

const imageUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const audioUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg",
      "audio/x-wav", "audio/wave", "audio/mp4", "audio/aac", "audio/x-m4a",
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

const videoUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["video/mp4", "video/webm", "video/ogg", "image/gif"];
    cb(null, allowed.includes(file.mimetype));
  },
});

const anyUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Encode an R2 key so it can be embedded as a single URL path segment
function encodeKey(key: string): string {
  return encodeURIComponent(key);
}

async function saveFile(
  file: Express.Multer.File,
  prefix = "uploads"
): Promise<string> {
  if (s3IsConfigured()) {
    const result = await uploadToS3(file.buffer, file.originalname, file.mimetype, prefix);
    if (result) {
      if (result.publicUrl) return result.publicUrl;
      return `/api/uploads/r2/${encodeKey(result.key)}`;
    }
  }

  const ext = path.extname(file.originalname);
  const filename = `${prefix.replace(/\//g, "-")}-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const filePath = path.join(localUploadsDir, filename);
  fs.writeFileSync(filePath, file.buffer);
  return `/api/uploads/${filename}`;
}

const router = Router();

// ── Upload endpoints ──────────────────────────────────────────────────────────

router.post("/uploads/card-image", imageUpload.single("file"), async (req: any, res: any): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "No file uploaded or invalid file type" }); return; }
  try { res.json({ url: await saveFile(req.file, "card-images") }); }
  catch { res.status(500).json({ error: "Upload failed" }); }
});

router.post("/uploads/image", anyUpload.single("file"), async (req: any, res: any): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
  try { res.json({ url: await saveFile(req.file, "images") }); }
  catch { res.status(500).json({ error: "Upload failed" }); }
});

router.post("/uploads/audio", audioUpload.single("file"), async (req: any, res: any): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
  try { res.json({ url: await saveFile(req.file, "audio") }); }
  catch { res.status(500).json({ error: "Upload failed" }); }
});

router.post("/uploads/video", videoUpload.single("file"), async (req: any, res: any): Promise<void> => {
  if (!req.file) { res.status(400).json({ error: "No file uploaded or invalid file type" }); return; }
  try { res.json({ url: await saveFile(req.file, "video") }); }
  catch { res.status(500).json({ error: "Upload failed" }); }
});

// ── Proxy: stream a file from R2 by its key ───────────────────────────────────

router.get("/uploads/r2/*key", async (req: any, res: any): Promise<void> => {
  const rawKey = req.params["key"];
  const key = decodeURIComponent(Array.isArray(rawKey) ? rawKey.join("/") : rawKey);
  const result = await streamFromS3(key);
  if (!result) { res.status(404).json({ error: "File not found" }); return; }
  res.setHeader("Content-Type", result.contentType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  (result.body as NodeJS.ReadableStream).pipe(res);
});

// ── Local disk fallback serve ─────────────────────────────────────────────────

router.get("/uploads/:filename", (req: any, res: any): void => {
  const filename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
  const filePath = path.join(localUploadsDir, filename);
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: "File not found" }); return; }
  res.sendFile(filePath);
});

export default router;
