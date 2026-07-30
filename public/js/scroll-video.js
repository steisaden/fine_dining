/**
 * ScrollVideo — scroll-driven video scrubber & unified timeline controller
 *
 * Implements:
 *   - Cinematic video scrub synced to scroll RAF loop
 *   - Local chapter progress (Approach → Active Reading Plateau → Exit)
 *   - CSS variable driven motion (--chapter-opacity, --chapter-y, --chapter-blur)
 *   - Unified progress rail & active navigation state
 *   - Accessible click & keyboard navigation on [data-index-item]
 */

export const SCROLL_VIDEO_CONFIG = Object.freeze({
  damping: 14.0,
  seekThreshold: 1 / 75,
  safeEndPadding: 1 / 120,
});

export class ScrollVideo {
  constructor(root) {
    this.root = root;
    this.video = root.querySelector("[data-scroll-video]");
    this.status = root.querySelector("[data-video-status]");
    this.chapters = [...root.querySelectorAll("[data-chapter]")];
    this.indexItems = [...root.querySelectorAll("[data-index-item]")];
    this.progressFill = root.querySelector("[data-progress-fill]");
    this.duration = 0;
    this.targetTime = 0;
    this.renderedTime = 0;
    this.queuedTime = null;
    this.latestIssued = 0;
    this.raf = 0;
    this.ticking = false;
    this.lastFrame = performance.now();
    this.visible = !document.hidden;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Mobile/Hardware throttles
    this.primed = false;
    this.seekPending = false;
    this.decoderTimer = 0;
    this.videoFrameId = 0;
    this.lastSeekAt = 0;
    this.coarse =
      matchMedia("(pointer: coarse)").matches ||
      navigator.hardwareConcurrency <= 4;
    this.seekInterval = this.coarse ? 45 : 30;

    // Cached layout geometry
    this.startY = 0;
    this.distance = 1;

    // Bind methods
    this.onMetadata = this.onMetadata.bind(this);
    this.onSeeked = this.onSeeked.bind(this);
    this.onVisibility = this.onVisibility.bind(this);
    this.onGeometry = this.onGeometry.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this.tick = this.tick.bind(this);
    this._onFirstInteraction = this._onFirstInteraction.bind(this);

    if (!this.video) return;

    // iOS WebKit video flags
    this.video.muted = true;
    this.video.defaultMuted = true;
    this.video.playsInline = true;
    this.video.autoplay = true;
    this.video.setAttribute("muted", "");
    this.video.setAttribute("playsinline", "");
    this.video.setAttribute("webkit-playsinline", "");
    this.video.setAttribute("autoplay", "");
    this.video.preload = "metadata";

    // Event listeners
    this.video.addEventListener("loadedmetadata", this.onMetadata);
    this.video.addEventListener("seeked", this.onSeeked);
    this.video.addEventListener("canplay", () => this._markReady());
    this.video.addEventListener("loadeddata", () => this._markReady());
    this.video.addEventListener("progress", () => this._flushPending());
    document.addEventListener("visibilitychange", this.onVisibility);

    // Mobile media unlock
    window.addEventListener("touchstart", this._onFirstInteraction, { passive: true, once: true });
    window.addEventListener("pointerdown", this._onFirstInteraction, { passive: true, once: true });

    // Click and keyboard navigation handlers
    this.installNavHandlers();

    // Geometry observer
    this.observer = new ResizeObserver(this.onGeometry);
    this.observer.observe(root);
    this.onGeometry();

    this.updateTimeline(0);

    // Kick off load
    if (this.video.readyState >= 1) {
      this.onMetadata();
    } else {
      this.video.load();
    }

    // Scroll listener
    window.addEventListener("scroll", this.onScroll, { passive: true });
    this.start();
  }

  // ── Cache geometry measurements (debounced / on geometry change) ─
  onGeometry() {
    const rect = this.root.getBoundingClientRect();
    this.startY = scrollY + rect.top;
    this.distance = Math.max(1, this.root.offsetHeight - window.innerHeight);
  }

  // ── Calculate scroll progress directly from DOM geometry ──
  calculateProgress() {
    const rect = this.root.getBoundingClientRect();
    const travel = Math.max(1, this.root.offsetHeight - window.innerHeight);
    return Math.min(1, Math.max(0, -rect.top / travel));
  }

  // ── Interactive Navigation (Click / Keydown) ───────────────
  installNavHandlers() {
    this.indexItems.forEach((item, index) => {
      const selectChapter = (e) => {
        e.preventDefault();
        const total = this.indexItems.length;
        if (!total) return;
        const targetP = index / (total - 1);
        const targetScroll = this.startY + (targetP * this.distance);
        window.scrollTo({
          top: targetScroll,
          behavior: this.reduced ? "instant" : "smooth",
        });
      };

      item.addEventListener("click", selectChapter);
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          selectChapter(e);
        }
      });
    });
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

  // ── Unified Timeline Update (Text Motion Curve, Menu, Rail) ─
  updateTimeline(progress) {
    const totalChapters = this.chapters.length;
    if (!totalChapters) return;

    const step = 1 / (totalChapters - 1); // 0.25 for 5 chapters
    let active = 0;

    for (let i = 0; i < totalChapters; i++) {
      if (progress >= i * step - step * 0.5) {
        active = i;
      }
    }

    // Active navigation item and aria-current
    this.indexItems.forEach((item, i) => {
      const isActive = i === active;
      item.classList.toggle("is-active", isActive);
      if (isActive) item.setAttribute("aria-current", "true");
      else item.removeAttribute("aria-current");
    });

    // Update Progress Rail
    if (this.progressFill) {
      this.progressFill.style.transform = `scaleY(${progress.toFixed(4)})`;
    }

    // Scroll-Linked Text Motion Curve:
    //   - Approach (-1.0 to -0.25): translateY 28px->0, opacity 0->1, blur 8px->0
    //   - Plateau (-0.25 to +0.25): translateY 0, opacity 1, blur 0
    //   - Exit (+0.25 to +1.0): translateY 0->-28px, opacity 1->0, blur 0->6px
    this.chapters.forEach((chapter, i) => {
      const targetP = i * step;
      const dist = (progress - targetP) / step; // -1 to +1

      let opacity = 0;
      let translateY = 28;
      let blur = 8;

      if (dist < -1.0 || dist > 1.0) {
        opacity = 0;
        translateY = dist < 0 ? 28 : -28;
        blur = dist < 0 ? 8 : 6;
      } else if (dist >= -1.0 && dist < -0.25) {
        const ratio = (dist + 1.0) / 0.75;
        opacity = ratio;
        translateY = (1 - ratio) * 28;
        blur = (1 - ratio) * 8;
      } else if (dist >= -0.25 && dist <= 0.25) {
        opacity = 1.0;
        translateY = 0;
        blur = 0;
      } else if (dist > 0.25 && dist <= 1.0) {
        const ratio = (dist - 0.25) / 0.75;
        opacity = 1.0 - ratio;
        translateY = -ratio * 28;
        blur = ratio * 6;
      }

      if (this.reduced) {
        blur = 0;
        translateY = 0;
      }

      // Expose properties to CSS Custom Properties
      chapter.style.setProperty("--chapter-opacity", opacity.toFixed(3));
      chapter.style.setProperty("--chapter-y", `${translateY.toFixed(1)}px`);
      chapter.style.setProperty("--chapter-blur", `${blur.toFixed(1)}px`);

      if (opacity > 0.005) {
        chapter.style.visibility = "visible";
      } else {
        chapter.style.visibility = "hidden";
      }
    });
  }

  onScroll() {
    if (this.ticking) return;
    this.ticking = true;
    requestAnimationFrame(() => {
      if (this.visible && !this.reduced) {
        const rawProgress = this.calculateProgress();
        this.setProgress(rawProgress);
        this.updateTimeline(rawProgress);
      }
      this.ticking = false;
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

    const rawProgress = this.calculateProgress();
    this.setProgress(rawProgress);

    if (this.duration > 0) {
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

    this.updateTimeline(this.progress ?? 0);
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

    this.observer?.disconnect();
    this._removeUnlockListeners();
    window.removeEventListener("scroll", this.onScroll);
    this.video?.removeEventListener("loadedmetadata", this.onMetadata);
    this.video?.removeEventListener("seeked", this.onSeeked);
    document.removeEventListener("visibilitychange", this.onVisibility);
  }
}
