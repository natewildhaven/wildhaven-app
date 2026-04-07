import { Router } from "express";
import { db, sql } from "@workspace/db";

const router = Router();

router.get("/keepalive", async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ status: "ok" });
  } catch (err) {
    res.status(503).json({ status: "error", message: "Database unreachable" });
  }
});

export default router;
