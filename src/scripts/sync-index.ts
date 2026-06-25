import { regenerateMdInfo } from "../services/ssg";

await regenerateMdInfo();
console.log("Index page synced from markdown.");
