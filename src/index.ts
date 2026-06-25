import { createApp } from "./app";
import { config } from "./config";
import { ensureDirs, rebuildAll } from "./services/ssg";
import { warnInsecureDefaults } from "./utils/security";

warnInsecureDefaults();
await ensureDirs();
await rebuildAll();

const app = createApp().listen(config.port);

console.log(
  `Blog SSG is running at http://${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
