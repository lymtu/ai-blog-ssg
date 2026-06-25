import { createParticlesFromBuffer } from "@/components/particleAvatar/createParticlesFromBuffer";
import type {
  ParticleOptions,
  ParticleTemplate,
} from "@/components/particleAvatar/types";

let bufferCache: ArrayBuffer | null = null;
let templateCache: ParticleTemplate[] | null = null;
let templateOptionsKey: string | null = null;

function optionsKey(options: ParticleOptions) {
  const { tintColor: _tintColor, ...rest } = options;
  return JSON.stringify(rest);
}

export async function getAvatarBuffer(): Promise<ArrayBuffer> {
  if (bufferCache) return bufferCache;

  const response = await fetch("/assets/me.bin");
  if (!response.ok) {
    throw new Error(`Failed to load avatar buffer: ${response.status}`);
  }

  bufferCache = await response.arrayBuffer();
  return bufferCache;
}

export async function getParticleTemplates(
  options: ParticleOptions,
): Promise<ParticleTemplate[]> {
  const key = optionsKey(options);
  if (templateCache && templateOptionsKey === key) {
    return templateCache;
  }

  const buffer = await getAvatarBuffer();
  templateCache = await createParticlesFromBuffer(buffer, options);
  templateOptionsKey = key;
  return templateCache;
}
