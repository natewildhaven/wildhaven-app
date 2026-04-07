import express from "express";
import cors from "cors";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app = express();

app.use((req: any, res: any, next: any) => {
  const start = Date.now();

  res.on("finish", () => {
    logger.info(
      {
        req: { method: req.method, url: req.path ?? req.url },
        res: { statusCode: res.statusCode },
        responseTime: Date.now() - start,
      },
      "request completed",
    );
  });

  next();
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", router);

export default app;
