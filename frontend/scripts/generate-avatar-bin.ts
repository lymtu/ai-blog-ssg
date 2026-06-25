import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const source = join(root, "src/assets/img/me.png");
const targets = [
  join(root, "public/assets/me.bin"),
  join(root, "../public/assets/me.bin"),
];

const buffer = await readFile(source);

for (const target of targets) {
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, buffer);
  console.log(`Generated ${target}`);
}
