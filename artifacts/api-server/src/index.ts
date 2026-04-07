import app from "./app";
import { logger } from "./lib/logger";
import cron from "node-cron";
import { createBackup } from "./routes/backups";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  cron.schedule("0 2 * * *", async () => {
    try {
      const id = await createBackup();
      logger.info({ id }, "Daily auto-backup created");
    } catch (err) {
      logger.error({ err }, "Daily auto-backup failed");
    }
  });

  logger.info("Daily backup scheduled at 02:00 AM");
});
