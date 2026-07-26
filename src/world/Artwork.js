import * as THREE from "three";
import { getArtworkState } from "../animation/artworkAnimations.js";

const ART_DEPTH = 0.08;

const configureCover = (texture, width, height) => {
  const image = texture.image;
  if (!image?.width || !image?.height) return;

  const imageAspect = image.width / image.height;
  const planeAspect = width / height;

  if (imageAspect > planeAspect) {
    texture.repeat.set(planeAspect / imageAspect, 1);
    texture.offset.set((1 - texture.repeat.x) * 0.5, 0);
  } else {
    texture.repeat.set(1, imageAspect / planeAspect);
    texture.offset.set(0, (1 - texture.repeat.y) * 0.5);
  }
  texture.needsUpdate = true;
};

const createImageMaterial = (texture) =>
  new THREE.MeshStandardMaterial({
    map: texture,
    color: 0xffffff,
    roughness: 0.78,
    metalness: 0,
    transparent: true,
    opacity: 0,
    emissive: 0x8a7458,
    emissiveIntensity: 0.08
  });

export class Artwork {
  constructor(item, texture, materials, options) {
    this.item = item;
    this.group = new THREE.Group();
    this.group.name = item.id;
    this.group.position.set(...options.position);
    this.group.rotation.y = options.rotationY ?? 0;
    this.basePosition = this.group.position.clone();
    this.baseRotation = this.group.rotation.clone();
    this.width = options.size[0];
    this.height = options.size[1];
    this.fragmentMeshes = [];
    this.shutters = [];

    configureCover(texture, this.width, this.height);
    this.imageMaterial = createImageMaterial(texture);

    const shadow = new THREE.Mesh(
      new THREE.BoxGeometry(this.width + 0.18, this.height + 0.18, ART_DEPTH),
      materials.frame
    );
    shadow.position.z = -0.07;
    shadow.castShadow = true;
    shadow.receiveShadow = true;
    this.group.add(shadow);

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd9a6,
      transparent: true,
      opacity: 0.08,
      toneMapped: false
    });
    this.glow = new THREE.Mesh(
      new THREE.PlaneGeometry(this.width + 0.34, this.height + 0.34),
      glowMaterial
    );
    this.glow.position.z = -0.115;
    this.group.add(this.glow);

    if (item.animation === "fragmentedAssemble") {
      this.createFragments(texture);
    } else {
      this.image = new THREE.Mesh(
        new THREE.PlaneGeometry(this.width, this.height),
        this.imageMaterial
      );
      this.image.position.z = 0.01;
      this.image.castShadow = true;
      this.group.add(this.image);
    }

    if (item.animation === "apertureReveal") {
      this.createShutters(materials.shutter);
    }
  }

  createFragments(texture) {
    const stripWidth = this.width / 3;
    const offsets = [-1, 0, 1];

    offsets.forEach((offset, index) => {
      const stripTexture = texture.clone();
      stripTexture.repeat.set(texture.repeat.x / 3, texture.repeat.y);
      stripTexture.offset.set(
        texture.offset.x + (texture.repeat.x / 3) * index,
        texture.offset.y
      );
      stripTexture.needsUpdate = true;

      const material = createImageMaterial(stripTexture);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(stripWidth + 0.012, this.height),
        material
      );
      mesh.position.x = offset * stripWidth;
      mesh.position.z = 0.012;
      mesh.userData.baseX = mesh.position.x;
      mesh.userData.offset = offset;
      mesh.userData.material = material;
      mesh.castShadow = true;
      this.fragmentMeshes.push(mesh);
      this.group.add(mesh);
    });
  }

  createShutters(material) {
    [-1, 1].forEach((direction) => {
      const shutter = new THREE.Mesh(
        new THREE.BoxGeometry(this.width * 0.51, this.height + 0.08, 0.12),
        material
      );
      shutter.position.set(direction * this.width * 0.255, 0, 0.09);
      shutter.userData.direction = direction;
      shutter.castShadow = true;
      this.shutters.push(shutter);
      this.group.add(shutter);
    });
  }

  update(progress, reducedMotion = false) {
    const state = getArtworkState(this.item, progress);
    const t = reducedMotion ? (progress >= this.item.start ? 1 : 0) : state.t;
    const opacity = reducedMotion ? (progress >= this.item.start ? 1 : 0.24) : state.opacity;

    this.group.position.set(
      this.basePosition.x + state.x,
      this.basePosition.y + (reducedMotion ? 0 : state.y),
      this.basePosition.z + (reducedMotion ? 0 : state.z)
    );
    this.group.rotation.set(
      this.baseRotation.x + (reducedMotion ? 0 : state.rotationX),
      this.baseRotation.y + (reducedMotion ? 0 : state.rotationY),
      this.baseRotation.z
    );
    this.group.scale.setScalar(reducedMotion ? 1 : state.scale);

    this.imageMaterial.opacity = opacity;
    this.imageMaterial.emissiveIntensity = reducedMotion ? 0.14 : state.glow * 0.22;
    this.glow.material.opacity = reducedMotion ? 0.08 : state.glow * 0.1;

    this.fragmentMeshes.forEach((mesh) => {
      const separation = reducedMotion ? 0 : 1 - t;
      mesh.position.x = mesh.userData.baseX + mesh.userData.offset * 0.24 * separation;
      mesh.position.y = mesh.userData.offset * 0.14 * separation;
      mesh.position.z = 0.012 + Math.abs(mesh.userData.offset) * 0.38 * separation;
      mesh.userData.material.opacity = opacity;
      mesh.userData.material.emissiveIntensity = state.glow * 0.2;
    });

    this.shutters.forEach((shutter) => {
      const closedX = shutter.userData.direction * this.width * 0.255;
      const openX = shutter.userData.direction * this.width * 0.78;
      shutter.position.x = THREE.MathUtils.lerp(openX, closedX, reducedMotion ? 0 : state.shutter);
    });
  }

  dispose() {
    this.group.traverse((object) => {
      object.geometry?.dispose();
      if (object.material && object.material !== this.imageMaterial) {
        object.material.dispose?.();
      }
    });
    this.imageMaterial.dispose();
  }
}
