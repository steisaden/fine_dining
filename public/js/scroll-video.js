export const SCROLL_VIDEO_CONFIG = Object.freeze({
  damping: 14.0,
  seekThreshold: 1 / 75,
  safeEndPadding: 1 / 120,
  chapters: [0, 0.17, 0.39, 0.64, 0.82, 1],
});

export class ScrollVideo {
  constructor(root) {
    this.root = root;
    this.video = root.querySelector("[data-scroll-video]");
    this.status = root.querySelector("[data-video-status]");
    this.chapters = [...root.querySelectorAll("[data-chapter]")];
    this.indexItems = [...root.querySelectorAll("[data-index-item]")];
    this.duration = 0;
    this.targetTime = 0;
    this.renderedTime = 0;
    this.queuedTime = null;
    this.latestIssued = 0;
    this.raf = 0;
    this.geometryTimer = 0;
    this.scrollTrigger = null;
    this.gsapContext = null;
    this.lenis = null;
    this.usesNativeScroll = false;
    this.lastFrame = performance.now();
    this.visible = !document.hidden;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.onMetadata = this.onMetadata.bind(this);
    this.onSeeked = this.onSeeked.bind(this);
    this.onVisibility = this.onVisibility.bind(this);
    this.onGeometry = this.onGeometry.bind(this);
    this.tick = this.tick.bind(this);
    this.onScroll = this.onScroll.bind(this);

    this.video.addEventListener("loadedmetadata", this.onMetadata);
    this.video.addEventListener("seeked", this.onSeeked);
    document.addEventListener("visibilitychange", this.onVisibility);
    addEventListener("resize", this.onGeometry, { passive: true });

    this.observer = new ResizeObserver(this.onGeometry);
    this.observer.observe(root);

    this.installProgressDriver();
    this.onGeometry();
    this.updateChapters(0);

    if (this.video.readyState >= 1) this.onMetadata();
  }

  installProgressDriver() {
    if (!this.reduced && window.gsap && window.ScrollTrigger) {
      if (!window.__eskerScrollTriggerRegistered) {
        window.gsap.registerPlugin(window.ScrollTrigger);
        window.__eskerScrollTriggerRegistered = true;
      }

      // Initialize Lenis smooth scroll if available
      if (window.Lenis) {
        try {
          this.lenis = new window.Lenis({
            duration: 1.1,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smoothWheel: true,
            smoothTouch: false,
          });
          this.lenis.on("scroll", () => window.ScrollTrigger.update());
          window.gsap.ticker.add((time) => {
            if (this.lenis) this.lenis.raf(time * 1000);
          });
          window.gsap.ticker.lagSmoothing(0);
        } catch {
          this.lenis = null;
        }
      }

      this.gsapContext = window.gsap.context(() => {
        this.scrollTrigger = window.ScrollTrigger.create({
          trigger: this.root,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) => this.setProgress(self.progress),
          onRefresh: (self) => this.setProgress(self.progress),
        });
      }, this.root);
      return;
    }

    this.usesNativeScroll = true;
    addEventListener("scroll", this.onScroll, { passive: true });
  }

  onMetadata() {
    this.duration = Number.isFinite(this.video.duration) ? this.video.duration : 0;
    if (!this.duration) return;
    this.video.classList.add("is-ready");
    this.status.textContent = "Film ready";

    if (this.reduced) {
      const representative = Math.min(this.duration * 0.9, this.duration - SCROLL_VIDEO_CONFIG.safeEndPadding);
      this.video.currentTime = Math.max(0, representative);
      return;
    }

    if (this.scrollTrigger) this.setProgress(this.scrollTrigger.progress);
    else this.onScroll();
    this.start();
  }

  onGeometry() {
    const rect = this.root.getBoundingClientRect();
    this.startY = scrollY + rect.top;
    this.distance = Math.max(1, this.root.offsetHeight - innerHeight);
    if (this.scrollTrigger) {
      clearTimeout(this.geometryTimer);
      this.geometryTimer = setTimeout(() => this.scrollTrigger?.refresh(), 160);
    } else {
      this.onScroll();
    }
  }

  onScroll() {
    if (this.reduced) return;
    const progress = Math.min(1, Math.max(0, (scrollY - this.startY) / this.distance));
    this.setProgress(progress);
  }

  setProgress(progress) {
    this.progress = progress;
    if (this.duration) {
      this.targetTime = progress * Math.max(0, this.duration - SCROLL_VIDEO_CONFIG.safeEndPadding);
    }
  }

  updateChapters(progress) {
    let active = 0;
    for (let i = 0; i < SCROLL_VIDEO_CONFIG.chapters.length - 1; i++) {
      if (progress >= SCROLL_VIDEO_CONFIG.chapters[i]) active = i;
    }

    this.indexItems.forEach((item, i) => item.classList.toggle("is-active", i === active));
    this.chapters.forEach((chapter, i) => {
      const start = SCROLL_VIDEO_CONFIG.chapters[i];
      const end = SCROLL_VIDEO_CONFIG.chapters[i + 1];
      const local = Math.min(1, Math.max(0, (progress - start) / Math.max(0.001, end - start)));
      const entering = i === 0 ? 1 : local * 7;
      const exiting = i === this.chapters.length - 1 ? 1 : (1 - local) * 7;
      const presence = Math.min(1, entering, exiting);
      const x = i % 2 ? (1 - presence) * 18 : 0;
      const y = (1 - presence) * 12;

      if (window.gsap) {
        window.gsap.set(chapter, { autoAlpha: Math.max(0, presence), x, y });
      } else {
        chapter.style.visibility = presence > 0.01 ? "visible" : "hidden";
        chapter.style.opacity = String(Math.max(0, presence));
        chapter.style.transform = `translate3d(${x}px,${y}px,0)`;
      }
    });
  }

  start() {
    if (!this.raf && this.visible && !this.reduced) {
      this.lastFrame = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  tick(now) {
    this.raf = 0;
    if (!this.visible || this.reduced || !this.duration) return;

    const dt = Math.min(0.1, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;

    const alpha = 1 - Math.exp(-SCROLL_VIDEO_CONFIG.damping * dt);
    const diff = this.targetTime - this.renderedTime;

    if (Math.abs(diff) < 0.0001) {
      this.renderedTime = this.targetTime;
    } else {
      this.renderedTime += diff * alpha;
    }

    this.requestSeek(this.renderedTime);
    this.updateChapters(this.progress ?? 0);
    this.start();
  }

  requestSeek(value) {
    const clamped = Math.min(Math.max(0, this.duration - SCROLL_VIDEO_CONFIG.safeEndPadding), Math.max(0, value));
    if (Math.abs(clamped - this.video.currentTime) < SCROLL_VIDEO_CONFIG.seekThreshold) return;

    if (this.video.seeking) {
      this.queuedTime = clamped;
      return;
    }

    this.queuedTime = null;
    this.latestIssued = clamped;
    this.video.currentTime = clamped;
  }

  onSeeked() {
    // When the decoder finishes seeking, seek immediately to the latest renderedTime
    // if it differs from current position by more than the threshold.
    if (Math.abs(this.renderedTime - this.video.currentTime) >= SCROLL_VIDEO_CONFIG.seekThreshold) {
      this.requestSeek(this.renderedTime);
    } else {
      this.queuedTime = null;
    }
  }

  onVisibility() {
    this.visible = !document.hidden;
    if (!this.visible && this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.visible) this.start();
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    clearTimeout(this.geometryTimer);

    if (this.lenis) {
      try {
        this.lenis.destroy();
      } catch {
        // ignore
      }
      this.lenis = null;
    }

    this.scrollTrigger?.kill();
    this.gsapContext?.revert();
    this.observer.disconnect();

    this.video.removeEventListener("loadedmetadata", this.onMetadata);
    this.video.removeEventListener("seeked", this.onSeeked);
    document.removeEventListener("visibilitychange", this.onVisibility);

    if (this.usesNativeScroll) removeEventListener("scroll", this.onScroll);
    removeEventListener("resize", this.onGeometry);
  }
}
