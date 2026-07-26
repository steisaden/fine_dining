import * as THREE from "three";
import { damp } from "../utils/math.js";

const positionPoints = [
  [0, 1.65, 12],
  [0, 1.65, 7],
  [0, 1.65, 2],
  [0, 1.65, -5],
  [0, 1.65, -10],
  [2.2, 1.62, -13],
  [6.2, 1.6, -15],
  [11, 1.6, -15],
  [16, 1.62, -15],
  [20.5, 1.7, -15],
  [26.5, 1.7, -15],
  [29.3, 1.68, -18.3],
  [31, 1.65, -23],
  [31, 1.65, -30],
  [31, 1.62, -36],
  [31, 1.65, -43],
  [31, 1.65, -49.5]
];

const targetPoints = [
  [0, 1.7, 3],
  [0, 1.7, 1],
  [-3.5, 2.0, -3],
  [-3.5, 2.0, -5],
  [3, 1.7, -13],
  [6, 1.7, -15],
  [11, 1.7, -14.2],
  [13, 1.7, -16],
  [19, 2, -15],
  [23, 3, -15],
  [29, 2, -17],
  [32, 2, -22],
  [28, 3, -29],
  [31, 2, -37],
  [31, 2, -42],
  [31, 2, -52],
  [31, 2, -56]
];

export class CameraRig {
  constructor(camera, scene, debug = false) {
    this.camera = camera;
    this.positionCurve = new THREE.CatmullRomCurve3(
      positionPoints.map((point) => new THREE.Vector3(...point)),
      false,
      "catmullrom",
      0.23
    );
    this.targetCurve = new THREE.CatmullRomCurve3(
      targetPoints.map((point) => new THREE.Vector3(...point)),
      false,
      "catmullrom",
      0.28
    );
    this.currentPosition = this.positionCurve.getPointAt(0);
    this.currentTarget = this.targetCurve.getPointAt(0);
    this.desiredPosition = new THREE.Vector3();
    this.desiredTarget = new THREE.Vector3();
    this.debugTarget = null;
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);

    if (debug) this.addDebug(scene);
  }

  addDebug(scene) {
    const pathPoints = this.positionCurve.getPoints(180);
    const pathGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const pathMaterial = new THREE.LineBasicMaterial({ color: 0xff5e49 });
    scene.add(new THREE.Line(pathGeometry, pathMaterial));

    const targetGeometry = new THREE.SphereGeometry(0.11, 12, 8);
    const targetMaterial = new THREE.MeshBasicMaterial({ color: 0x46d7ff });
    this.debugTarget = new THREE.Mesh(targetGeometry, targetMaterial);
    scene.add(this.debugTarget);
  }

  update(progress, delta, reducedMotion = false) {
    this.positionCurve.getPointAt(progress, this.desiredPosition);
    this.targetCurve.getPointAt(progress, this.desiredTarget);

    if (reducedMotion) {
      this.currentPosition.copy(this.desiredPosition);
      this.currentTarget.copy(this.desiredTarget);
    } else {
      const positionLambda = 6.5;
      const targetLambda = 5.5;
      this.currentPosition.x = damp(
        this.currentPosition.x,
        this.desiredPosition.x,
        positionLambda,
        delta
      );
      this.currentPosition.y = damp(
        this.currentPosition.y,
        this.desiredPosition.y,
        positionLambda,
        delta
      );
      this.currentPosition.z = damp(
        this.currentPosition.z,
        this.desiredPosition.z,
        positionLambda,
        delta
      );
      this.currentTarget.x = damp(
        this.currentTarget.x,
        this.desiredTarget.x,
        targetLambda,
        delta
      );
      this.currentTarget.y = damp(
        this.currentTarget.y,
        this.desiredTarget.y,
        targetLambda,
        delta
      );
      this.currentTarget.z = damp(
        this.currentTarget.z,
        this.desiredTarget.z,
        targetLambda,
        delta
      );
    }

    const chamberWidening = Math.sin(
      Math.max(0, Math.min(1, (progress - 0.43) / 0.15)) * Math.PI
    );
    this.camera.fov = 45 + chamberWidening * 2.4;
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentTarget);
    this.camera.updateProjectionMatrix();
    this.debugTarget?.position.copy(this.currentTarget);
  }
}
