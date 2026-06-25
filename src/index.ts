import { createApp } from "./app";
import { config } from "./config";
import { ensureDirs, rebuildAll } from "./services/ssg";
import { warnInsecureDefaults } from "./utils/security";

warnInsecureDefaults();
await ensureDirs();

const hostname = process.env.HOST ?? "0.0.0.0";
const app = createApp().listen({ port: config.port, hostname });

console.log(
  `Blog SSG is running at http://${app.server?.hostname}:${app.server?.port}`,
);

rebuildAll()
  .then(() => console.log("[ssg] rebuildAll finished"))
  .catch((error) => console.error("[ssg] rebuildAll failed:", error));

export type App = typeof app;
