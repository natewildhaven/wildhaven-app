import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/keepalive", async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ status: "ok" });
  } catch (err) {
    res.status(503).json({ status: "error", message: "Database unreachable" });
  }
});

export default router;
