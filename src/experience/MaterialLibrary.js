import * as THREE from "three";

const makeNoiseTexture = () => {
  const size = 64;
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const wave = Math.sin(x * 1.73 + y * 0.91) * 8;
      const grain = ((x * 17 + y * 29 + x * y * 7) % 23) - 11;
      const value = Math.max(0, Math.min(255, 126 + wave + grain));
      data[index] = value;
      data[index + 1] = value;
      data[index + 2] = value;
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 7);
  texture.needsUpdate = true;
  return texture;
};

export class MaterialLibrary {
  constructor() {
    const roughnessMap = makeNoiseTexture();

    this.plaster = new THREE.MeshStandardMaterial({
      color: 0xc9c1b3,
      roughness: 0.92,
      roughnessMap,
      metalness: 0
    });
    this.plasterDark = new THREE.MeshStandardMaterial({
      color: 0x78726a,
      roughness: 0.96,
      roughnessMap,
      metalness: 0
    });
    this.charcoal = new THREE.MeshStandardMaterial({
      color: 0x242321,
      roughness: 0.88,
      roughnessMap,
      metalness: 0
    });
    this.floor = new THREE.MeshStandardMaterial({
      color: 0x5a5147,
      roughness: 0.82,
      roughnessMap,
      metalness: 0
    });
    this.walnut = new THREE.MeshStandardMaterial({
      color: 0x39291f,
      roughness: 0.76,
      roughnessMap,
      metalness: 0
    });
    this.bronze = new THREE.MeshStandardMaterial({
      color: 0x765d41,
      roughness: 0.58,
      metalness: 0.26
    });
    this.frame = new THREE.MeshStandardMaterial({
      color: 0x171715,
      roughness: 0.68,
      metalness: 0.08
    });
    this.ceiling = new THREE.MeshStandardMaterial({
      color: 0xb7afa3,
      roughness: 0.94,
      roughnessMap,
      metalness: 0
    });
    this.shutter = new THREE.MeshStandardMaterial({
      color: 0x837a6d,
      roughness: 0.9,
      roughnessMap,
      metalness: 0
    });
    this.light = new THREE.MeshBasicMaterial({
      color: 0xffe4bd,
      toneMapped: false
    });
  }

  dispose() {
    const materials = new Set(Object.values(this));
    materials.forEach((material) => {
      material.roughnessMap?.dispose();
      material.dispose?.();
    });
  }
}
