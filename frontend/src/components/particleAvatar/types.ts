export interface ParticleOptions {
  particleSize: number;
  particleMargin: number;
  sampleStep: number;
  maxSize: number;
  particleAcceleration: number;
  mouseInfluenceRange: number;
  tintColor: string;
}

export interface ParticleTemplate {
  originX: number;
  originY: number;
}

export interface MousePosition {
  x: number;
  y: number;
}

export const AVATAR_PARSE_SIZE = 360;

export function getSampleInterval(
  options: Pick<ParticleOptions, "sampleStep" | "particleMargin">,
) {
  return options.sampleStep + options.particleMargin * 2;
}

export const DEFAULT_PARTICLE_OPTIONS: ParticleOptions = {
  particleSize: 2,
  particleMargin: 0,
  sampleStep: 2,
  maxSize: AVATAR_PARSE_SIZE,
  particleAcceleration: 0.05,
  mouseInfluenceRange: 50,
  tintColor: "#000000",
};
