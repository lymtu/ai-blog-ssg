import type { MousePosition, ParticleOptions } from "./types";

export class Particle {
  x: number;
  y: number;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  vx = 0;
  vy = 0;
  size: number;

  constructor(
    originX: number,
    originY: number,
    canvasWidth: number,
    canvasHeight: number,
    options: ParticleOptions,
  ) {
    this.x = Math.random() * canvasWidth;
    this.y = Math.random() * canvasHeight;
    this.originX = originX;
    this.originY = originY;
    this.targetX = originX;
    this.targetY = originY;
    this.size = options.particleSize;
  }

  update(
    ctx: CanvasRenderingContext2D,
    mouse: MousePosition | null,
    options: ParticleOptions,
  ) {
    if (!mouse) {
      this.vx = (this.originX - this.x) * options.particleAcceleration;
      this.vy = (this.originY - this.y) * options.particleAcceleration;
    } else {
      const distanceX = this.originX - mouse.x;
      const distanceY = this.originY - mouse.y;
      const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

      if (distance < options.mouseInfluenceRange) {
        const angle = Math.atan2(distanceY, distanceX);
        this.targetX =
          mouse.x + Math.cos(angle) * options.mouseInfluenceRange;
        this.targetY =
          mouse.y + Math.sin(angle) * options.mouseInfluenceRange;
      } else {
        this.targetX = this.originX;
        this.targetY = this.originY;
      }

      this.vx = (this.targetX - this.x) * options.particleAcceleration;
      this.vy = (this.targetY - this.y) * options.particleAcceleration;
    }

    this.x += this.vx;
    this.y += this.vy;
    this.draw(ctx, options.tintColor);
  }

  snapToOrigin(ctx: CanvasRenderingContext2D, tintColor: string) {
    this.x = this.originX;
    this.y = this.originY;
    this.draw(ctx, tintColor);
  }

  draw(ctx: CanvasRenderingContext2D, tintColor: string) {
    ctx.fillStyle = tintColor;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}
