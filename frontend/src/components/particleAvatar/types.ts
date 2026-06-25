import {
  AVATAR_PARSE_SIZE,
  AVATAR_SAMPLE_STEP,
  getSampleInterval,
  type ParticleTemplate,
} from "@/lib/avatarParticles";

export type { ParticleTemplate };
export { AVATAR_PARSE_SIZE, AVATAR_SAMPLE_STEP, getSampleInterval };

export interface ParticleOptions {
  particleSize: number;
  particleMargin: number;
  sampleStep: number;
  maxSize: number;
  particleAcceleration: number;
  mouseInfluenceRange: number;
  tintColor: string;
}

export interface MousePosition {
  x: number;
  y: number;
}

export const DEFAULT_PARTICLE_OPTIONS: ParticleOptions = {
  particleSize: 2,
  particleMargin: 0,
  sampleStep: AVATAR_SAMPLE_STEP,
  maxSize: AVATAR_PARSE_SIZE,
  particleAcceleration: 0.05,
  mouseInfluenceRange: 50,
  tintColor: "#000000",
};
