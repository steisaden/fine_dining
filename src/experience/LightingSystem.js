import * as THREE from "three";

export class LightingSystem {
  constructor(scene) {
    this.scene = scene;
    this.lights = [];

    const hemisphere = new THREE.HemisphereLight(0xe7d9c0, 0x211d19, 0.62);
    scene.add(hemisphere);

    const ambient = new THREE.AmbientLight(0xb8a78e, 0.34);
    scene.add(ambient);

    this.addRect(0xffd7a8, 15, 4.8, 2.1, [0, 3.95, 2.4], [-Math.PI / 2, 0, 0]);
    this.addRect(0xe7cfaa, 11, 3.5, 1.3, [10.5, 2.85, -15], [0, Math.PI / 2, 0]);
    this.addRect(0xffd7a8, 18, 6, 3, [23, 6.3, -15], [-Math.PI / 2, 0, 0]);
    this.addRect(0xf1dbc0, 22, 4.5, 4.5, [30, 6.9, -27], [-Math.PI / 2, 0, 0]);
    this.addRect(0xe2c39b, 12, 3.5, 2, [31, 4.15, -39], [-Math.PI / 2, 0, 0]);
    this.addRect(0xffd4a0, 19, 5, 2.6, [31, 4.65, -49], [-Math.PI / 2, 0, 0]);

    this.sun = new THREE.DirectionalLight(0xffe0b0, 1.6);
    this.sun.position.set(26, 10, -24);
    this.sun.target.position.set(31, 0, -30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -8;
    this.sun.shadow.camera.right = 8;
    this.sun.shadow.camera.top = 8;
    this.sun.shadow.camera.bottom = -8;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 25;
    this.sun.shadow.bias = -0.00035;
    scene.add(this.sun, this.sun.target);
  }

  addRect(color, intensity, width, height, position, rotation) {
    const light = new THREE.RectAreaLight(color, intensity, width, height);
    light.position.set(...position);
    light.rotation.set(...rotation);
    this.scene.add(light);
    this.lights.push(light);
  }

  update(progress) {
    const lightWell = Math.max(0, 1 - Math.abs(progress - 0.735) / 0.12);
    const salon = Math.max(0, Math.min(1, (progress - 0.88) / 0.12));
    this.sun.intensity = 1.25 + lightWell * 1.5;
    this.lights.at(-1).intensity = 16 + salon * 8;
  }
}
