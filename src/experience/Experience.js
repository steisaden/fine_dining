import * as THREE from "three";
import { CameraRig } from "./CameraRig.js";
import { ImageLoader } from "./ImageLoader.js";
import { LightingSystem } from "./LightingSystem.js";
import { MaterialLibrary } from "./MaterialLibrary.js";
import { ScrollController } from "./ScrollController.js";
import { GalleryWorld } from "../world/GalleryWorld.js";

const supportsWebGL = () => {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGL2RenderingContext && canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true })
    );
  } catch {
    return false;
  }
};

export class Experience {
  constructor({ canvas, manifest, onProgress, onUpdate }) {
    this.canvas = canvas;
    this.manifest = manifest;
    this.onProgress = onProgress;
    this.onUpdate = onUpdate;
    this.debug = new URLSearchParams(window.location.search).get("debug") === "1";
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.mobile = window.matchMedia("(max-width: 760px)").matches;
    this.clock = new THREE.Clock();
    this.frame = null;
    this.ready = false;

    if (!supportsWebGL()) {
      document.documentElement.classList.add("no-webgl");
      onProgress(1);
      return;
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x171716);
    this.scene.fog = new THREE.FogExp2(0x1b1917, 0.016);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.08, 125);
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !this.mobile,
      alpha: false,
      powerPreference: "high-performance"
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.mobile ? 1.2 : 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.98;
    this.renderer.shadowMap.enabled = !this.mobile;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.materials = new MaterialLibrary();
    this.lighting = new LightingSystem(this.scene);
    this.cameraRig = new CameraRig(this.camera, this.scene, this.debug);
    this.scroll = new ScrollController({ reducedMotion: this.reducedMotion });
    this.resize = this.resize.bind(this);
    this.tick = this.tick.bind(this);
    window.addEventListener("resize", this.resize, { passive: true });
    this.resize();
  }

  async init() {
    if (!this.renderer) {
      this.onUpdate(0, { fallback: true });
      return;
    }

    const loader = new ImageLoader(this.onProgress);
    const textures = await loader.loadManifest(this.manifest);
    this.world = new GalleryWorld(
      this.scene,
      this.materials,
      this.manifest,
      textures,
      this.debug
    );
    this.ready = true;
    this.onProgress(1);
    document.documentElement.classList.add("is-ready");
    this.tick();
  }

  resize() {
    if (!this.renderer) return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.mobile = width <= 760;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.mobile ? 1.2 : 1.75));
  }

  tick() {
    if (!this.ready) return;
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const progress = this.scroll.update(delta);
    this.cameraRig.update(progress, delta, this.reducedMotion);
    this.world.update(progress, this.reducedMotion);
    this.lighting.update(progress);
    this.renderer.render(this.scene, this.camera);
    this.onUpdate(progress, {
      calls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles
    });
    this.frame = requestAnimationFrame(this.tick);
  }

  destroy() {
    cancelAnimationFrame(this.frame);
    window.removeEventListener("resize", this.resize);
    this.scroll?.destroy();
    this.world?.dispose();
    this.materials?.dispose();
    this.renderer?.dispose();
  }
}
