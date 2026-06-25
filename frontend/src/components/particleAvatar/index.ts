import { html, LitElement, unsafeCSS } from "lit";
import { getParticleTemplates } from "@/lib/avatarBufferCache";
import { ParticleCanvas } from "./ParticleCanvas";
import StyleInline from "./style.css?inline";
import { getParticleTintColor, watchParticleTintColor } from "./themeColor";
import { AVATAR_PARSE_SIZE, DEFAULT_PARTICLE_OPTIONS } from "./types";

class ParticleAvatar extends LitElement {
  private particleCanvas: ParticleCanvas | null = null;
  private canvasRef: HTMLCanvasElement | null = null;
  private unwatchTheme: (() => void) | null = null;

  createRenderRoot() {
    return this;
  }

  firstUpdated() {
    void this.initCanvas();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unwatchTheme?.();
    this.unwatchTheme = null;
    this.particleCanvas?.destroy();
    this.particleCanvas = null;
  }

  private async initCanvas() {
    this.canvasRef = this.querySelector("canvas");
    if (!this.canvasRef) return;

    const options = {
      ...DEFAULT_PARTICLE_OPTIONS,
      maxSize: AVATAR_PARSE_SIZE,
      tintColor: getParticleTintColor(),
    };

    try {
      const templates = await getParticleTemplates(options);
      this.particleCanvas = new ParticleCanvas(
        this.canvasRef,
        options,
        AVATAR_PARSE_SIZE,
      );
      await this.particleCanvas.init(templates);

      this.unwatchTheme?.();
      this.unwatchTheme = watchParticleTintColor((color) => {
        this.particleCanvas?.setTintColor(color);
      });
    } catch (error) {
      console.error("Failed to initialize particle avatar:", error);
    }
  }

  render() {
    return html`<canvas class="avatar-canvas" aria-label="Avatar"></canvas>`;
  }

  static styles = unsafeCSS(StyleInline);
}

window.customElements.define("my-particle-avatar", ParticleAvatar);

export { ParticleAvatar };
