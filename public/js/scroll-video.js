/**
 * ScrollVideo — scroll-driven video scrubber with mobile support
 *
 * Robust geometry-based scroll progress (-rect.top / travel) matching production references
 * (threadhaus, htmx_video_website_watch, wallpaperdemo) for 100% reliable mobile iOS/Android support.
 */

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
    this.lastFrame = performance.now();
    this.visible = !document.hidden;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Mobile-critical state ────────────────────────────────
    this.primed = false;                       // has video decoded at least one frame?
    this.seekPending = false;                  // waiting for decoder to finish a seek?
    this.decoderTimer = 0;                     // fallback timer when seeked never fires
    this.videoFrameId = 0;                     // requestVideoFrameCallback handle
    this.lastSeekAt = 0;                       // timestamp of last seek to throttle on mobile
    this.coarse =
      matchMedia("(pointer: coarse)").matches ||
      navigator.hardwareConcurrency <= 4;
    this.seekInterval = this.coarse ? 45 : 30; // ms between seeks (~22 fps mobile, 33 fps desktop)

    // Bind methods
    this.onMetadata = this.onMetadata.bind(this);
    this.onSeeked = this.onSeeked.bind(this);
    this.onVisibility = this.onVisibility.bind(this);
    this.tick = this.tick.bind(this);
    this._onFirstInteraction = this._onFirstInteraction.bind(this);

    if (!this.video) return;

    // ── Harden video element for iOS Safari & Chrome ─────────
    this.video.muted = true;
    this.video.defaultMuted = true;
    this.video.playsInline = true;
    this.video.autoplay = true;
    this.video.setAttribute("muted", "");
    this.video.setAttribute("playsinline", "");
    this.video.setAttribute("webkit-playsinline", "");
    this.video.setAttribute("autoplay", "");
    this.video.preload = "metadata";

    // ── Event listeners ───────────────────────────────────────
    this.video.addEventListener("loadedmetadata", this.onMetadata);
    this.video.addEventListener("seeked", this.onSeeked);
    this.video.addEventListener("canplay", () => this._markReady());
    this.video.addEventListener("loadeddata", () => this._markReady());
    this.video.addEventListener("progress", () => this._flushPending());
    document.addEventListener("visibilitychange", this.onVisibility);

    // Mobile unlock: iOS Safari requires a user gesture to init the audio/video pipeline.
    window.addEventListener("touchstart", this._onFirstInteraction, { passive: true, once: true });
    window.addEventListener("pointerdown", this._onFirstInteraction, { passive: true, once: true });

    this.updateChapters(0);

    // Force load if needed
    if (this.video.readyState >= 1) {
      this.onMetadata();
    } else {
      this.video.load();
    }

    this.start();
  }

  // ── Calculate scroll progress directly from DOM geometry ──
  // Works 100% reliably on all browsers (iOS Safari, Chrome mobile, desktop)
  calculateProgress() {
    const rect = this.root.getBoundingClientRect();
    const travel = Math.max(1, this.root.offsetHeight - window.innerHeight);
    return Math.min(1, Math.max(0, -rect.top / travel));
  }

  // ── Mobile video unlock ─────────────────────────────────────
  _onFirstInteraction() {
    if (!this.video) {
      this._removeUnlockListeners();
      return;
    }
    const playback = this.video.play();
    if (playback && typeof playback.then === "function") {
      playback
        .then(() => {
          this.video.pause();
          this._primeFrame();
        })
        .catch(() => this._primeFrame());
    } else {
      this._primeFrame();
    }
    this._removeUnlockListeners();
  }

  _removeUnlockListeners() {
    window.removeEventListener("touchstart", this._onFirstInteraction);
    window.removeEventListener("pointerdown", this._onFirstInteraction);
  }

  // ── Prime the first frame ───────────────────────────────────
  _primeFrame() {
    if (!this.video || this.video.readyState < HTMLMediaElement.HAVE_METADATA || !this.duration) return;
    if (!this.primed) {
      this.primed = true;
      this.video.pause();
      const initialTime = Math.max(0.001, Math.min(this.targetTime || 0.001, this.duration));
      this.renderedTime = initialTime;
      this._forceSeek(initialTime);
    }
    this._flushPending();
  }

  _markReady() {
    if (!this.video || this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    this.video.classList.add("is-ready");
    if (this.status) {
      this.status.textContent = "Film ready";
    }
  }

  _flushPending() {
    if (this.seekPending || this.video?.seeking || this.queuedTime === null) return;
    const next = this.queuedTime;
    this.queuedTime = null;
    this.requestSeek(next);
  }

  _releaseSeekLock() {
    if (!this.seekPending) return;
    if (this.videoFrameId && this.video && "cancelVideoFrameCallback" in this.video) {
      this.video.cancelVideoFrameCallback(this.videoFrameId);
      this.videoFrameId = 0;
    }
    clearTimeout(this.decoderTimer);
    this.decoderTimer = 0;
    this.seekPending = false;
    this._markReady();
    this._flushPending();
  }

  _waitForDecodedFrame() {
    if (!this.video) return;
    clearTimeout(this.decoderTimer);
    this.decoderTimer = setTimeout(
      () => this._releaseSeekLock(),
      this.coarse ? 700 : 400
    );
    if ("requestVideoFrameCallback" in this.video) {
      this.videoFrameId = this.video.requestVideoFrameCallback(() => this._releaseSeekLock());
    }
  }

  onMetadata() {
    this.duration = Number.isFinite(this.video.duration) ? this.video.duration : 0;
    if (!this.duration) return;
    this._markReady();

    if (this.reduced) {
      const representative = Math.min(this.duration * 0.9, this.duration - SCROLL_VIDEO_CONFIG.safeEndPadding);
      this.video.currentTime = Math.max(0, representative);
      return;
    }

    const progress = this.calculateProgress();
    this.setProgress(progress);

    // Silent play/pause attempt to prime decoder
    const p = this.video.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        this.video.pause();
        this._primeFrame();
      }).catch(() => this._primeFrame());
    } else {
      this._primeFrame();
    }

    this.start();
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
    if (!this.visible || this.reduced || !this.video) return;

    const dt = Math.min(0.1, Math.max(0.001, (now - this.lastFrame) / 1000));
    this.lastFrame = now;

    // Direct geometry calculation every tick ensures scroll progress is ALWAYS up to date
    const rawProgress = this.calculateProgress();
    this.setProgress(rawProgress);

    if (this.duration > 0) {
      // Smooth exponential damping
      const distance = Math.abs(this.targetTime - this.renderedTime);
      const response = this.coarse
        ? (distance > 1.25 ? 12 : distance > 0.25 ? 9 : 7)
        : SCROLL_VIDEO_CONFIG.damping;

      const alpha = 1 - Math.exp(-response * dt);
      const diff = this.targetTime - this.renderedTime;

      if (Math.abs(diff) < 0.0001) {
        this.renderedTime = this.targetTime;
      } else {
        this.renderedTime += diff * alpha;
      }

      this.requestSeek(this.renderedTime);
    }

    this.updateChapters(this.progress ?? 0);
    this.start();
  }

  _forceSeek(time) {
    if (!this.video || !this.duration || this.video.readyState < HTMLMediaElement.HAVE_METADATA) return;
    const clamped = Math.min(this.duration, Math.max(0.001, time));
    this.seekPending = true;
    this.lastSeekAt = performance.now();
    try {
      this.video.currentTime = clamped;
      this._waitForDecodedFrame();
    } catch {
      this.seekPending = false;
      this.queuedTime = clamped;
    }
  }

  requestSeek(value) {
    if (!this.video || !this.duration || this.video.readyState < HTMLMediaElement.HAVE_METADATA) return;

    const clamped = Math.min(
      Math.max(0, this.duration - SCROLL_VIDEO_CONFIG.safeEndPadding),
      Math.max(0.001, value)
    );

    if (Math.abs(clamped - this.video.currentTime) < SCROLL_VIDEO_CONFIG.seekThreshold) return;

    const now = performance.now();
    if (this.seekPending || this.video.seeking || (now - this.lastSeekAt < this.seekInterval)) {
      this.queuedTime = clamped;
      return;
    }

    this.queuedTime = null;
    this.seekPending = true;
    this.latestIssued = clamped;
    this.lastSeekAt = now;
    try {
      this.video.currentTime = clamped;
      this._waitForDecodedFrame();
    } catch {
      this.seekPending = false;
      this.queuedTime = clamped;
    }
  }

  onSeeked() {
    this._releaseSeekLock();
  }

  onVisibility() {
    this.visible = !document.hidden;
    if (!this.visible && this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.visible) {
      this.lastFrame = performance.now();
      if (this.video && this.video.readyState < HTMLMediaElement.HAVE_METADATA) {
        this.video.load();
      }
      this.start();
    }
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    clearTimeout(this.decoderTimer);

    if (this.videoFrameId && this.video && "cancelVideoFrameCallback" in this.video) {
      this.video.cancelVideoFrameCallback(this.videoFrameId);
    }

    this._removeUnlockListeners();
    this.video?.removeEventListener("loadedmetadata", this.onMetadata);
    this.video?.removeEventListener("seeked", this.onSeeked);
    document.removeEventListener("visibilitychange", this.onVisibility);
  }
}
