import { Node, NodeProps } from "@motion-canvas/2d/lib/components";
import { SimpleSignal, createSignal } from "@motion-canvas/core/lib/signals";
import * as THREE from "three";

export interface ThreeCanvasProps extends NodeProps {
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Converts an axis and angle to a quaternion.
 * @param axis The axis to rotate around.
 * @param angle The angle to rotate by.
 * @returns The quaternion.
 */
export function axisAngle(
  axis: THREE.Vector3,
  angle: number,
): [number, number, number, number] {
  let st = Math.sin(angle / 2);
  let ct = Math.cos(angle / 2);

  return [ct, st * axis.x, st * axis.y, st * axis.z];
}

export class ThreeCanvas extends Node {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;

  /**
   * The actual three.js scene itself.
   * If you need to do something that isn't supported by this class,
   * you can use this property to access the scene directly.
   *
   * However, this may cause mutations, and any features should be requested
   * as a feature request.
   */
  public readonly threeScene: THREE.Scene;
  public readonly threeCamera: THREE.PerspectiveCamera;
  public readonly objects: SignalableObject3D[] = [];

  constructor(props: ThreeCanvasProps) {
    super(props);

    this.canvas = document.createElement("canvas");
    this.canvas.width = props.canvasWidth;
    this.canvas.height = props.canvasHeight;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
    });

    this.threeScene = new THREE.Scene();
    this.threeCamera = new THREE.PerspectiveCamera(
      75,
      this.canvas.width / this.canvas.height,
      0.1,
      100.0,
    );

    this.objects.push(new SignalableObject3D(this.threeCamera));

    this.renderer.clear(true);
  }

  get camera() {
    return this.objects[0];
  }

  push(...object: THREE.Object3D[]) {
    const signalable = object.map((o) => new SignalableObject3D(o));
    for (const obj of signalable) {
      obj.addTo(this.threeScene);
      this.addDynamicObject(obj);
    }
    return signalable;
  }

  create(...objectGenerators: (() => THREE.Object3D)[]) {
    return this.push(...objectGenerators.map((g) => g()));
  }

  render(context: CanvasRenderingContext2D): void {
    for (const obj of this.objects) {
      obj.update();
    }

    this.renderer.render(this.threeScene, this.threeCamera);

    context.drawImage(
      this.canvas,
      this.position.x() - this.canvas.width / 2,
      this.position.y() - this.canvas.height / 2,
    );
  }
}

export class SignalableObject3D {
  object: THREE.Object3D;

  readonly position: SimpleSignal<[number, number, number], this>;
  readonly scale: SimpleSignal<[number, number, number], this>;
  readonly quaternion: SimpleSignal<[number, number, number, number], this>;

  constructor(original: THREE.Object3D) {
    this.object = original;
    this.position = createSignal([
      this.object.position.x,
      this.object.position.y,
      this.object.position.z,
    ]);
    this.scale = createSignal([
      this.object.scale.x,
      this.object.scale.y,
      this.object.scale.z,
    ]);
    this.quaternion = createSignal([
      this.object.quaternion.x,
      this.object.quaternion.y,
      this.object.quaternion.z,
      this.object.quaternion.w,
    ]);
  }

  update() {
    this.object.position.set(...this.position());
    this.object.scale.set(...this.scale());
    this.object.quaternion.set(...this.quaternion());
  }
}