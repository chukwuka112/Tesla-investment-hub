import app from "./app";
import { logger } from "./lib/logger";

const port = process.env.PORT || 8080;

// For local development
if (process.env.NODE_ENV !== "production") {
  app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}

export default app;
