/**
 * ScrollVideo — scroll-driven video scrubber with mobile support
 *
 * Mobile-critical patterns drawn from three production references:
 *   - threadhaus: play()/pause() unlock on first touch, coarse-device seek throttling
 *   - htmx_video_website_watch: requestVideoFrameCallback loop, simplified seek queue
 *   - wallpaperdemo: GSAP ScrollTrigger integration, decoder release timer fallback
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
    this.geometryTimer = 0;
    this.scrollTrigger = null;
    this.gsapContext = null;
    this.lenis = null;
    this.usesNativeScroll = false;
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
    this.seekInterval = this.coarse ? 50 : 33; // ms between seeks (20 fps mobile, 30 fps desktop)

    // Bind methods
    this.onMetadata = this.onMetadata.bind(this);
    this.onSeeked = this.onSeeked.bind(this);
    this.onVisibility = this.onVisibility.bind(this);
    this.onGeometry = this.onGeometry.bind(this);
    this.tick = this.tick.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this._onFirstInteraction = this._onFirstInteraction.bind(this);

    // ── Harden video element for iOS ──────────────────────────
    this.video.muted = true;
    this.video.defaultMuted = true;
    this.video.playsInline = true;
    this.video.autoplay = true;
    this.video.setAttribute("muted", "");
    this.video.setAttribute("playsinline", "");
    this.video.setAttribute("webkit-playsinline", "");
    this.video.setAttribute("autoplay", "");
    // preload=metadata is safer on mobile (auto can be ignored/blocked)
    this.video.preload = "metadata";

    // ── Event listeners ───────────────────────────────────────
    this.video.addEventListener("loadedmetadata", this.onMetadata);
    this.video.addEventListener("seeked", this.onSeeked);
    this.video.addEventListener("canplay", () => this._markReady());
    this.video.addEventListener("loadeddata", () => this._markReady());
    this.video.addEventListener("progress", () => this._flushPending());
    document.addEventListener("visibilitychange", this.onVisibility);
    addEventListener("resize", this.onGeometry, { passive: true });

    // Mobile unlock: iOS Safari requires a user gesture to init the audio/video pipeline.
    // We call play().then(pause) on first touch so subsequent currentTime seeks work.
    window.addEventListener("touchstart", this._onFirstInteraction, { passive: true, once: true });
    window.addEventListener("pointerdown", this._onFirstInteraction, { passive: true, once: true });

    this.observer = new ResizeObserver(this.onGeometry);
    this.observer.observe(root);

    this.installProgressDriver();
    this.onGeometry();
    this.updateChapters(0);

    // Kick off loading if metadata already available; otherwise force load()
    if (this.video.readyState >= 1) {
      this.onMetadata();
    } else {
      this.video.load();
    }
  }

  // ── Mobile video unlock ─────────────────────────────────────
  _onFirstInteraction() {
    if (!this.video) {
      this._removeUnlockListeners();
      return;
    }
    // play() triggers the iOS media pipeline; immediately pause so we can seek.
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

  // ── Prime the first frame (ensures decoder is ready to seek) ─
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

  // Mark video as visually ready
  _markReady() {
    if (!this.video || this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
    this.video.classList.add("is-ready");
    if (this.status) {
      this.status.textContent = "Film ready";
    }
  }

  // ── Flush queued seek after decoder reports it's free ────────
  _flushPending() {
    if (this.seekPending || this.video?.seeking || this.queuedTime === null) return;
    const next = this.queuedTime;
    this.queuedTime = null;
    this.requestSeek(next);
  }

  // ── Decoder lock management (with timeout fallback for mobile) ──
  _releaseSeekLock() {
    if (!this.seekPending) return;
    // Cancel the requestVideoFrameCallback if we used one
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

  // Wait for the decoder to actually paint the new frame.
  // Uses requestVideoFrameCallback when available, with a timeout fallback.
  _waitForDecodedFrame() {
    if (!this.video) return;
    clearTimeout(this.decoderTimer);
    // Fallback: if seeked never fires, release lock after 800ms (mobile) or 500ms (desktop)
    this.decoderTimer = setTimeout(
      () => this._releaseSeekLock(),
      this.coarse ? 800 : 500
    );
    // Precision path: wait for the actual decoded frame
    if ("requestVideoFrameCallback" in this.video) {
      this.videoFrameId = this.video.requestVideoFrameCallback(() => this._releaseSeekLock());
    }
  }

  // ── Progress driver (GSAP ScrollTrigger or native scroll) ───
  installProgressDriver() {
    if (!this.reduced && window.gsap && window.ScrollTrigger) {
      if (!window.__eskerScrollTriggerRegistered) {
        window.gsap.registerPlugin(window.ScrollTrigger);
        window.__eskerScrollTriggerRegistered = true;
      }

      // Initialize Lenis smooth scroll if available (desktop only)
      if (window.Lenis && !this.coarse) {
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
    this._markReady();

    if (this.reduced) {
      const representative = Math.min(this.duration * 0.9, this.duration - SCROLL_VIDEO_CONFIG.safeEndPadding);
      this.video.currentTime = Math.max(0, representative);
      return;
    }

    if (this.scrollTrigger) this.setProgress(this.scrollTrigger.progress);
    else this.onScroll();

    // Silent play/pause attempt to prime decoder on desktop and supported mobile
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

    // Adaptive damping: coarse devices get slightly softer response to reduce seek pressure
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
    this.updateChapters(this.progress ?? 0);
    this.start();
  }

  // ── Force a seek (used for priming; bypasses throttle) ──────
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
    // Throttle seeks: if decoder is busy or we're seeking too fast, queue instead
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
      // If the video lost its pipeline (common on iOS after tab-switch), reload
      if (this.video && this.video.readyState < HTMLMediaElement.HAVE_METADATA) {
        this.video.load();
      }
      this.start();
    }
  }

  destroy() {
    if (this.raf) cancelAnimationFrame(this.raf);
    clearTimeout(this.geometryTimer);
    clearTimeout(this.decoderTimer);

    // Cancel pending requestVideoFrameCallback
    if (this.videoFrameId && this.video && "cancelVideoFrameCallback" in this.video) {
      this.video.cancelVideoFrameCallback(this.videoFrameId);
    }

    this._removeUnlockListeners();

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
