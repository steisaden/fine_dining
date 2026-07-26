import * as THREE from "three";
import { Artwork } from "./Artwork.js";

const box = (group, material, size, position, rotationY = 0, name = "") => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.y = rotationY;
  mesh.receiveShadow = true;
  mesh.castShadow = size[1] > 1;
  mesh.name = name;
  group.add(mesh);
  return mesh;
};

const roomLabel = (text, position) => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  context.fillStyle = "rgba(20, 20, 18, .86)";
  context.fillRect(0, 0, 512, 96);
  context.font = "500 32px sans-serif";
  context.fillStyle = "#fff4df";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 256, 48);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true })
  );
  sprite.position.set(...position);
  sprite.scale.set(4, 0.75, 1);
  return sprite;
};

const artworkLayout = {
  "residence-01": { position: [-3.89, 2.15, -4.2], size: [5.4, 3.2], rotationY: Math.PI / 2 },
  "residence-02": { position: [8.6, 1.6, -13.53], size: [1.55, 1.15], rotationY: Math.PI },
  "residence-03": { position: [11.8, 1.6, -16.47], size: [1.6, 1.15] },
  "residence-04": { position: [15.2, 1.56, -13.53], size: [1.7, 1.2], rotationY: Math.PI },
  "residence-05": { position: [19.4, 2.45, -18.18], size: [3.25, 2.35] },
  "residence-06": { position: [22.7, 2.3, -12.73], size: [3.7, 2.45], rotationY: Math.PI },
  "residence-07": { position: [26.1, 4.25, -17.95], size: [2.8, 2.05] },
  "residence-08": { position: [32.72, 2.45, -21.2], size: [4.5, 3.0], rotationY: -Math.PI / 2 },
  "residence-09": { position: [27.12, 3.45, -29.1], size: [5.3, 3.35], rotationY: Math.PI / 2 },
  "residence-10": { position: [31, 2.25, -42.86], size: [5.45, 3.25] },
  "residence-11": { position: [31, 2.45, -55.74], size: [7.1, 3.9] }
};

export class GalleryWorld {
  constructor(scene, materials, manifest, textures, debug = false) {
    this.scene = scene;
    this.materials = materials;
    this.group = new THREE.Group();
    this.group.name = "Gallery House";
    this.artworks = [];
    scene.add(this.group);
    this.createArchitecture(debug);

    manifest.forEach((item) => {
      const artwork = new Artwork(item, textures.get(item.id), materials, artworkLayout[item.id]);
      this.artworks.push(artwork);
      this.group.add(artwork.group);
    });
  }

  createArchitecture(debug) {
    const { group, materials } = this;

    // Arrival and first gallery: a pale, compressed vestibule opening into one taller volume.
    box(group, materials.floor, [9, 0.18, 28], [0, -0.09, -1]);
    box(group, materials.plaster, [0.22, 4.5, 28], [-4.1, 2.25, -1]);
    box(group, materials.plaster, [0.22, 4.5, 19], [4.1, 2.25, 3.5]);
    box(group, materials.ceiling, [8.4, 0.18, 13], [0, 4.41, 5.5]);
    box(group, materials.ceiling, [8.4, 0.18, 8], [0, 4.41, -9]);
    box(group, materials.charcoal, [6.6, 4.5, 1.8], [0, 2.25, -13.8], 0, "turning monolith");
    box(group, materials.plasterDark, [2.7, 4.5, 0.35], [2.7, 2.25, -13.1]);
    box(group, materials.plaster, [0.32, 3.7, 6.3], [-3.75, 2.1, -4.2]);

    // The true right turn: a narrow walnut-lined corridor runs east behind the monolith.
    box(group, materials.floor, [18.5, 0.16, 3.25], [12.2, -0.08, -15]);
    box(group, materials.walnut, [18.5, 3.15, 0.18], [12.2, 1.575, -13.42]);
    box(group, materials.charcoal, [18.5, 3.15, 0.18], [12.2, 1.575, -16.58]);
    box(group, materials.walnut, [18.5, 0.16, 3.25], [12.2, 3.07, -15]);

    // Floating chamber: the lowered corridor releases into a double-height room.
    box(group, materials.floor, [12.5, 0.2, 11], [23.8, -0.1, -15]);
    box(group, materials.plasterDark, [12.5, 7.2, 0.22], [23.8, 3.6, -20.4]);
    box(group, materials.plaster, [12.5, 7.2, 0.22], [23.8, 3.6, -9.6]);
    box(group, materials.ceiling, [12.5, 0.18, 11], [23.8, 7.1, -15]);
    box(group, materials.bronze, [0.08, 6.1, 0.08], [19.25, 3.05, -18.1]);
    box(group, materials.bronze, [0.08, 6.1, 0.08], [26.2, 3.05, -17.85]);

    // Soft left curve, approximated with tightly spaced plaster planes.
    const curveRadius = 5.35;
    for (let index = 0; index < 8; index += 1) {
      const angle = -Math.PI * 0.5 + (index / 7) * Math.PI * 0.5;
      const x = 26.2 + Math.cos(angle) * curveRadius;
      const z = -20.4 + Math.sin(angle) * curveRadius;
      box(
        group,
        materials.plaster,
        [2.35, 5.3, 0.2],
        [x, 2.65, z],
        -angle,
        "curved plaster wall"
      );
    }
    box(group, materials.floor, [7.2, 0.18, 11], [29.3, -0.09, -22.3]);

    // Light well with a tall open slot and a wall-wide shuttered work.
    box(group, materials.floor, [8.4, 0.2, 13], [31, -0.1, -28.6]);
    box(group, materials.plaster, [0.2, 8.7, 13], [26.92, 4.35, -28.6]);
    box(group, materials.plaster, [0.2, 8.7, 13], [35.08, 4.35, -28.6]);
    box(group, materials.plasterDark, [8.3, 8.7, 0.2], [31, 4.35, -35]);
    box(group, materials.ceiling, [2.7, 0.18, 13], [28.25, 8.6, -28.6]);
    box(group, materials.ceiling, [2.7, 0.18, 13], [33.75, 8.6, -28.6]);
    box(group, materials.light, [2.25, 0.03, 8.4], [31, 8.57, -28.2]);

    // Assembly room: darker, lower and deliberately still.
    box(group, materials.floor, [8.4, 0.2, 9], [31, -0.1, -40]);
    box(group, materials.charcoal, [0.2, 4.7, 9], [26.92, 2.35, -40]);
    box(group, materials.charcoal, [0.2, 4.7, 9], [35.08, 2.35, -40]);
    box(group, materials.charcoal, [8.4, 4.7, 0.2], [31, 2.35, -44.45]);
    box(group, materials.charcoal, [8.4, 0.18, 9], [31, 4.61, -40]);

    // Final salon: generous width, low furniture plinths and a single end-wall image.
    box(group, materials.floor, [13.5, 0.2, 13], [31, -0.1, -50.2]);
    box(group, materials.plasterDark, [0.2, 5.2, 13], [24.35, 2.6, -50.2]);
    box(group, materials.plasterDark, [0.2, 5.2, 13], [37.65, 2.6, -50.2]);
    box(group, materials.plaster, [13.5, 5.2, 0.22], [31, 2.6, -56]);
    box(group, materials.ceiling, [13.5, 0.18, 13], [31, 5.11, -50.2]);
    box(group, materials.walnut, [3.7, 0.32, 1.15], [28.35, 0.16, -50.4]);
    box(group, materials.walnut, [2.5, 0.22, 1.4], [33.6, 0.11, -51.2]);
    box(group, materials.bronze, [0.05, 4.4, 0.05], [26.5, 2.2, -54.6]);

    // Narrow, warm reveals punctuate the route without turning into UI-like decoration.
    [
      [0, 4.3, -2.5, 4.6, 0.03],
      [10.2, 3.0, -16.45, 2.4, 0.025],
      [23.8, 6.95, -10.0, 4.1, 0.035],
      [31, 4.45, -44.3, 3.7, 0.04],
      [31, 4.85, -55.7, 6.8, 0.045]
    ].forEach(([x, y, z, width, depth]) => {
      const reveal = box(group, materials.light, [width, depth, 0.04], [x, y, z]);
      reveal.renderOrder = 2;
    });

    if (debug) {
      [
        ["01 ARRIVAL", [0, 3.6, 8]],
        ["02 GALLERY", [0, 3.6, -4]],
        ["03 CORRIDOR", [11, 2.45, -15]],
        ["04 FLOATING", [23, 5.9, -15]],
        ["05 LIGHT WELL", [31, 7.2, -29]],
        ["06 ASSEMBLY", [31, 3.8, -40]],
        ["07 SALON", [31, 4.35, -51]]
      ].forEach(([text, position]) => group.add(roomLabel(text, position)));
    }
  }

  update(progress, reducedMotion) {
    this.artworks.forEach((artwork) => artwork.update(progress, reducedMotion));
  }

  dispose() {
    this.artworks.forEach((artwork) => artwork.dispose());
    this.group.traverse((object) => object.geometry?.dispose());
  }
}
