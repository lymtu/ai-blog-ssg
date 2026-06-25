export interface ParticleTemplate {
  originX: number;
  originY: number;
}

export const AVATAR_BIN_MAGIC = "PAV1";
export const AVATAR_PARSE_SIZE = 360;
export const AVATAR_SAMPLE_STEP = 2;

export function getSampleInterval(sampleStep: number, particleMargin = 0) {
  return sampleStep + particleMargin * 2;
}

export function sampleParticleTemplates(
  rgba: Uint8ClampedArray,
  maxSize: number,
  sampleStep: number,
  particleMargin = 0,
): ParticleTemplate[] {
  const step = getSampleInterval(sampleStep, particleMargin);
  const templates: ParticleTemplate[] = [];

  for (let y = 0; y < maxSize; y += step) {
    for (let x = 0; x < maxSize; x += step) {
      const index = (y * maxSize + x) * 4;
      const alpha = rgba[index + 3];
      if (alpha === 0) continue;

      const r = rgba[index];
      const g = rgba[index + 1];
      const b = rgba[index + 2];
      if (r + g + b + alpha < 100) continue;

      templates.push({ originX: x, originY: y });
    }
  }

  return templates;
}

export function encodeParticleTemplates(
  templates: ParticleTemplate[],
  parseSize: number,
  sampleStep: number,
): Uint8Array {
  const buffer = new ArrayBuffer(12 + templates.length * 4);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  bytes[0] = "P".charCodeAt(0);
  bytes[1] = "A".charCodeAt(0);
  bytes[2] = "V".charCodeAt(0);
  bytes[3] = "1".charCodeAt(0);
  view.setUint16(4, parseSize, true);
  view.setUint16(6, sampleStep, true);
  view.setUint32(8, templates.length, true);

  let offset = 12;
  for (const template of templates) {
    view.setUint16(offset, template.originX, true);
    view.setUint16(offset + 2, template.originY, true);
    offset += 4;
  }

  return bytes;
}

export function decodeParticleTemplates(
  buffer: ArrayBuffer,
): ParticleTemplate[] | null {
  if (buffer.byteLength < 12) return null;

  const bytes = new Uint8Array(buffer);
  if (
    bytes[0] !== "P".charCodeAt(0) ||
    bytes[1] !== "A".charCodeAt(0) ||
    bytes[2] !== "V".charCodeAt(0) ||
    bytes[3] !== "1".charCodeAt(0)
  ) {
    return null;
  }

  const view = new DataView(buffer);
  const count = view.getUint32(8, true);
  const expectedSize = 12 + count * 4;
  if (buffer.byteLength !== expectedSize) return null;

  const templates: ParticleTemplate[] = [];
  let offset = 12;
  for (let i = 0; i < count; i++) {
    templates.push({
      originX: view.getUint16(offset, true),
      originY: view.getUint16(offset + 2, true),
    });
    offset += 4;
  }

  return templates;
}
