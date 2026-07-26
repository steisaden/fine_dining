import * as THREE from "three";

const createFallbackTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 24;
  canvas.height = 24;
  const context = canvas.getContext("2d");
  context.fillStyle = "#776f65";
  context.fillRect(0, 0, 24, 24);
  context.strokeStyle = "#9f9688";
  context.lineWidth = 1;
  for (let index = -24; index < 48; index += 6) {
    context.beginPath();
    context.moveTo(index, 0);
    context.lineTo(index + 24, 24);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

export class ImageLoader {
  constructor(onProgress = () => {}) {
    this.manager = new THREE.LoadingManager();
    this.loader = new THREE.TextureLoader(this.manager);
    this.fallback = createFallbackTexture();
    this.manager.onProgress = (_url, loaded, total) => onProgress(loaded / total);
    this.manager.onError = () => onProgress(1);
  }

  async loadManifest(manifest) {
    const entries = await Promise.all(
      manifest.map(async (item) => {
        try {
          const texture = await this.loader.loadAsync(item.src);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 4;
          texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
          return [item.id, texture];
        } catch {
          return [item.id, this.fallback.clone()];
        }
      })
    );

    return new Map(entries);
  }
}
