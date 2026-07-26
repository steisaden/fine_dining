import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { clamp01, damp } from "../utils/math.js";

gsap.registerPlugin(ScrollTrigger);

export class ScrollController {
  constructor({ reducedMotion = false } = {}) {
    this.reducedMotion = reducedMotion;
    this.target = 0;
    this.current = 0;
    this.lenis = null;

    if (!reducedMotion) {
      this.lenis = new Lenis({
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 0.86,
        lerp: 0.09
      });
      this.lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((time) => this.lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }

    this.read = this.read.bind(this);
    window.addEventListener("scroll", this.read, { passive: true });
    this.read();
  }

  read() {
    const maximum = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    this.target = clamp01(window.scrollY / maximum);
  }

  update(delta) {
    this.current = this.reducedMotion
      ? this.target
      : damp(this.current, this.target, 7.5, Math.min(delta, 0.05));
    return this.current;
  }

  destroy() {
    window.removeEventListener("scroll", this.read);
    this.lenis?.destroy();
  }
}
