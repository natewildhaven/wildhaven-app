import { Router } from "express";
import {
  db,
  eq,
  and,
  asc,
  classesTable,
  studentsTable,
  studentClassesTable,
} from "@workspace/db";

const router = Router();

router.get("/classes", async (_req: any, res: any): Promise<void> => {
  const classes = await db.select().from(classesTable).orderBy(asc(classesTable.sortOrder), asc(classesTable.createdAt));
  res.json(classes);
});

router.post("/classes", async (req: any, res: any): Promise<void> => {
  const { name, teacher, color } = req.body as { name?: string; teacher?: string; color?: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "Class name required" });
    return;
  }
  const [cls] = await db
    .insert(classesTable)
    .values({ name: name.trim(), teacher: teacher?.trim() || null, color: color?.trim() || "#6366f1" })
    .returning();
  res.status(201).json(cls);
});

router.patch("/classes/:id", async (req: any, res: any): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { name, teacher, color, sortOrder } = req.body as { name?: string; teacher?: string; color?: string; sortOrder?: number };
  const updates: Partial<{ name: string; teacher: string | null; color: string; sortOrder: number }> = {};
  if (name !== undefined) updates.name = name.trim();
  if (teacher !== undefined) updates.teacher = teacher ? teacher.trim() || null : null;
  if (color !== undefined) updates.color = color ? color.trim() || "#6366f1" : "#6366f1";
  if (sortOrder !== undefined) updates.sortOrder = sortOrder;
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Nothing to update" }); return; }
  const [cls] = await db.update(classesTable).set(updates).where(eq(classesTable.id, id)).returning();
  if (!cls) { res.status(404).json({ error: "Not found" }); return; }
  res.json(cls);
});

router.post("/classes/reorder", async (req: any, res: any): Promise<void> => {
  const { items } = req.body as { items?: Array<{ id: number; sortOrder: number }> };
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "items array required" });
    return;
  }
  await Promise.all(
    items.map(({ id, sortOrder }) =>
      db.update(classesTable).set({ sortOrder }).where(eq(classesTable.id, id))
    )
  );
  res.json({ ok: true });
});

router.delete("/classes/:id", async (req: any, res: any): Promise<void> => {
  const id = Number(req.params.id);
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const [cls] = await db.delete(classesTable).where(eq(classesTable.id, id)).returning();
  if (!cls) { res.status(404).json({ error: "Not found" }); return; }
  res.sendStatus(204);
});

// Add a student to a class
router.post("/students/:id/classes", async (req: any, res: any): Promise<void> => {
  const studentId = Number(req.params.id);
  const { classId } = req.body as { classId?: number };
  if (!studentId || !classId) {
    res.status(400).json({ error: "studentId and classId required" });
    return;
  }
  await db
    .insert(studentClassesTable)
    .values({ studentId, classId })
    .onConflictDoNothing();
  res.json({ studentId, classId });
});

// Remove a student from a class
router.delete("/students/:id/classes/:classId", async (req: any, res: any): Promise<void> => {
  const studentId = Number(req.params.id);
  const classId = Number(req.params.classId);
  if (!studentId || !classId) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  await db
    .delete(studentClassesTable)
    .where(
      and(
        eq(studentClassesTable.studentId, studentId),
        eq(studentClassesTable.classId, classId),
      )
    );
  res.json({ studentId, classId });
});

export default router;
