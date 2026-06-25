import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  AVATAR_PARSE_SIZE,
  AVATAR_SAMPLE_STEP,
  encodeParticleTemplates,
  sampleParticleTemplates,
} from "../src/lib/avatarParticles.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const source = join(root, "src/assets/img/me.png");
const targets = [
  join(root, "public/assets/me.bin"),
  join(root, "../public/assets/me.bin"),
];

const { data, info } = await sharp(source)
  .resize(AVATAR_PARSE_SIZE, AVATAR_PARSE_SIZE, {
    fit: "contain",
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

if (info.width !== AVATAR_PARSE_SIZE || info.height !== AVATAR_PARSE_SIZE) {
  throw new Error(
    `Unexpected avatar raster size: ${info.width}x${info.height}`,
  );
}

const templates = sampleParticleTemplates(
  new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
  AVATAR_PARSE_SIZE,
  AVATAR_SAMPLE_STEP,
);

const encoded = encodeParticleTemplates(
  templates,
  AVATAR_PARSE_SIZE,
  AVATAR_SAMPLE_STEP,
);

for (const target of targets) {
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, encoded);
  console.log(
    `Generated ${target} (${encoded.byteLength} bytes, ${templates.length} particles)`,
  );
}
