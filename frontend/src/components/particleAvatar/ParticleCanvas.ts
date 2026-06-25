import { Particle } from "./Particle";
import type { MousePosition, ParticleOptions, ParticleTemplate } from "./types";

const STOP_DELAY_MS = 5000;

export class ParticleCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private mouse: MousePosition | null = null;
  private rafId = 0;
  private stopTimerId = 0;
  private introStopTimerId = 0;
  private isAnimating = false;
  private options: ParticleOptions;
  private reducedMotion: boolean;
  private parseSize: number;
  private resizeObserver: ResizeObserver | null = null;
  private boundMouseEnter: () => void;
  private boundMouseMove: (event: MouseEvent) => void;
  private boundMouseLeave: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    options: ParticleOptions,
    parseSize: number,
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2D canvas context");
    }
    this.ctx = ctx;
    this.options = options;
    this.parseSize = parseSize;
    this.reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    this.boundMouseEnter = () => this.handleMouseEnter();
    this.boundMouseMove = (event) => this.handleMouseMove(event);
    this.boundMouseLeave = () => this.handleMouseLeave();
  }

  async init(templates: ParticleTemplate[]) {
    this.resize();
    this.particles = this.createParticles(templates);

    this.canvas.addEventListener("mouseenter", this.boundMouseEnter);
    this.canvas.addEventListener("mousemove", this.boundMouseMove);
    this.canvas.addEventListener("mouseleave", this.boundMouseLeave);

    this.resizeObserver = new ResizeObserver(() => {
      this.resize();
    });
    this.resizeObserver.observe(this.canvas.parentElement ?? this.canvas);

    if (this.reducedMotion) {
      this.drawStatic();
      return;
    }

    this.start();
    this.scheduleIntroStop();
  }

  private scheduleIntroStop() {
    if (this.introStopTimerId) {
      clearTimeout(this.introStopTimerId);
    }
    this.introStopTimerId = window.setTimeout(() => {
      this.introStopTimerId = 0;
      if (!this.mouse) {
        this.stop();
      }
    }, 3500);
  }

  private createParticles(templates: ParticleTemplate[]) {
    const scale = this.canvas.width / this.parseSize;
    const scaledOptions = {
      ...this.options,
      particleSize: this.options.particleSize * scale,
    };
    return templates.map(
      (template) =>
        new Particle(
          template.originX * scale,
          template.originY * scale,
          this.canvas.width,
          this.canvas.height,
          scaledOptions,
        ),
    );
  }

  setTintColor(color: string) {
    this.options.tintColor = color;
    if (!this.isAnimating) {
      this.drawStatic();
    }
  }

  private resize() {
    const parent = this.canvas.parentElement;
    const size =
      parent?.clientWidth && parent?.clientHeight
        ? Math.min(parent.clientWidth, parent.clientHeight)
        : parent?.clientWidth || this.options.maxSize;
    const sizeChanged =
      this.canvas.width > 0 && this.canvas.width !== size && this.particles.length > 0;

    if (sizeChanged) {
      const scale = size / this.canvas.width;
      for (const particle of this.particles) {
        particle.originX *= scale;
        particle.originY *= scale;
        particle.x *= scale;
        particle.y *= scale;
        particle.targetX *= scale;
        particle.targetY *= scale;
        particle.size *= scale;
      }
    }

    this.canvas.width = size;
    this.canvas.height = size;
    this.options.maxSize = size;

    if (!this.isAnimating && this.particles.length > 0) {
      this.drawStatic();
    }
  }

  private handleMouseEnter() {
    if (this.reducedMotion) return;
    if (this.introStopTimerId) {
      clearTimeout(this.introStopTimerId);
      this.introStopTimerId = 0;
    }
    this.clearStopTimer();
    this.start();
  }

  private handleMouseMove(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  private handleMouseLeave() {
    this.mouse = null;
    if (this.reducedMotion) return;
    this.scheduleStop();
  }

  private clearStopTimer() {
    if (this.stopTimerId) {
      clearTimeout(this.stopTimerId);
      this.stopTimerId = 0;
    }
  }

  private scheduleStop() {
    this.clearStopTimer();
    this.stopTimerId = window.setTimeout(() => {
      this.stopTimerId = 0;
      this.stop();
    }, STOP_DELAY_MS);
  }

  private drawStatic() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const particle of this.particles) {
      particle.snapToOrigin(this.ctx, this.options.tintColor);
    }
  }

  private tick = () => {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const particle of this.particles) {
      particle.update(this.ctx, this.mouse, this.options);
    }
    this.rafId = requestAnimationFrame(this.tick);
  };

  private start() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(this.tick);
  }

  private stop() {
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    this.isAnimating = false;
    this.drawStatic();
  }

  destroy() {
    this.clearStopTimer();
    if (this.introStopTimerId) {
      clearTimeout(this.introStopTimerId);
      this.introStopTimerId = 0;
    }
    cancelAnimationFrame(this.rafId);
    this.canvas.removeEventListener("mouseenter", this.boundMouseEnter);
    this.canvas.removeEventListener("mousemove", this.boundMouseMove);
    this.canvas.removeEventListener("mouseleave", this.boundMouseLeave);
    this.resizeObserver?.disconnect();
    this.particles = [];
    this.mouse = null;
    this.isAnimating = false;
  }
}
