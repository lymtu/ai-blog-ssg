import type { ParticleOptions, ParticleTemplate } from "./types";
import { getSampleInterval } from "./types";

export async function createParticlesFromBuffer(
  buffer: ArrayBuffer,
  options: ParticleOptions,
): Promise<ParticleTemplate[]> {
  const blob = new Blob([buffer], { type: "image/png" });
  const bitmap = await createImageBitmap(blob);

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = options.maxSize;
  tempCanvas.height = options.maxSize;

  const scale = Math.min(
    options.maxSize / bitmap.width,
    options.maxSize / bitmap.height,
  );
  const drawWidth = bitmap.width * scale;
  const drawHeight = bitmap.height * scale;
  const offsetX = (options.maxSize - drawWidth) / 2;
  const offsetY = (options.maxSize - drawHeight) / 2;

  const tempCtx = tempCanvas.getContext("2d");
  if (!tempCtx) {
    bitmap.close();
    return [];
  }

  tempCtx.drawImage(bitmap, offsetX, offsetY, drawWidth, drawHeight);
  bitmap.close();

  const imageData = tempCtx.getImageData(0, 0, options.maxSize, options.maxSize);
  const step = getSampleInterval(options);
  const templates: ParticleTemplate[] = [];

  for (let y = 0; y < options.maxSize; y += step) {
    for (let x = 0; x < options.maxSize; x += step) {
      const index = (y * options.maxSize + x) * 4;
      const alpha = imageData.data[index + 3];
      if (alpha === 0) continue;

      const r = imageData.data[index];
      const g = imageData.data[index + 1];
      const b = imageData.data[index + 2];
      if (r + g + b + alpha < 100) continue;

      templates.push({ originX: x, originY: y });
    }
  }

  return templates;
}
