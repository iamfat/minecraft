import {
    Scene,
    FreeCamera,
    ICameraInput,
    UniversalCamera,
    Vector3,
    PointerEventTypes,
    Observer,
    PointerInfo,
    EventState,
    KeyboardEventTypes,
    KeyboardInfo,
    MeshBuilder,
    Mesh,
    HighlightLayer,
    Color3,
    Color4
} from '@babylonjs/core';
import { World } from './World';
import { Block } from './Block';

class SteveInput implements ICameraInput<FreeCamera> {
    private steve: Steve;
    private noPreventDefault = false;
    private pointerInfo?: Observer<PointerInfo> | null;
    private keyboardInfo?: Observer<KeyboardInfo> | null;
    private inputMap: Set<string> = new Set();

    camera: FreeCamera;
    touchEnabled = false;
    buttons = [0, 1, 2];
    angularSensibility = 2000.0;
    restrictionX = 180;
    restrictionY = 180;

    constructor(steve: Steve) {
        this.steve = steve;
        this.camera = steve.eyes;
    }

    getClassName = () => 'SteveInput';
    getSimpleName = () => 'SteveInput';

    private onKeyboardInput = (ki: KeyboardInfo, _: EventState) => {
        const engine = this.camera.getEngine();
        if (!engine.isPointerLock) return;

        const { event, type } = ki;
        if (type === KeyboardEventTypes.KEYUP) {
            if (event.code === 'Escape') {
                engine.exitPointerlock();
            } else {
                this.inputMap.delete(event.code);
            }
        } else if (type === KeyboardEventTypes.KEYDOWN) {
            this.inputMap.add(event.code);
        }
        if (!this.noPreventDefault) {
            event.preventDefault();
        }
    };

    private onPointerInput = ({ type, event }: PointerInfo, _: EventState) => {
        const engine = this.camera.getEngine();
        if (!engine.isPointerLock) {
            if (type === PointerEventTypes.POINTERTAP) {
                engine.enterPointerlock();
                if (!this.noPreventDefault) {
                    event.preventDefault();
                }
            }
            return;
        }

        const { steve, camera, angularSensibility } = this;
        if (type === PointerEventTypes.POINTERDOWN) {
            this.inputMap.add('Mouse');
        } else if (type === PointerEventTypes.POINTERUP) {
            this.inputMap.delete('Mouse');
        } else if (type === PointerEventTypes.POINTERMOVE) {
            const scene = camera.getScene();
            if (scene.useRightHandedSystem) {
                steve.rotation.y -= (event.movementX * 10) / angularSensibility;
            } else {
                steve.rotation.y += (event.movementX * 10) / angularSensibility;
            }
            camera.cameraRotation.x += event.movementY / angularSensibility;

            const ray = camera.getForwardRay(5, undefined, camera.globalPosition);
            const hit = scene.pickWithRay(ray);
            if (hit && hit.pickedMesh) {
                if (steve.aimedBlock) {
                    steve.aimedBlock.mesh.disableEdgesRendering();
                }
                steve.aimedBlock = (hit.pickedMesh as any)._block;
                steve.aimedBlock!.mesh.enableEdgesRendering();
                steve.aimedBlock!.mesh.edgesColor = Color4.FromColor3(Color3.White());
            } else if (steve.aimedBlock) {
                steve.aimedBlock.mesh.disableEdgesRendering();
                steve.aimedBlock = undefined;
            }

            if (!this.noPreventDefault) {
                event.preventDefault();
            }
        }
    };

    checkInputs = () => {
        const engine = this.camera.getEngine();
        if (!engine.isPointerLock) return;

        const { steve, inputMap } = this;
        if (!steve.isJumping) {
            const speed = 0.1;
            let amountRight = 0,
                amountForward = 0;

            if (inputMap.has('KeyW')) {
                amountForward = -speed;
            } else if (inputMap.has('KeyS')) {
                // backward
                amountForward = speed;
            }

            if (inputMap.has('KeyA')) {
                // left
                amountRight = speed;
            } else if (inputMap.has('KeyD')) {
                // right
                amountRight = -speed;
            }

            const displacement = steve.calcMovePOV(amountRight, 0, amountForward);
            if (inputMap.has('Space')) {
                steve.velocity.addInPlaceFromFloats(displacement.x, 0.2, displacement.z);
                steve.isJumping = true;
            }

            if (amountRight !== 0 || amountForward !== 0) {
                steve.moveWithCollisions(displacement);
                steve.checkSound();
            }

            if (inputMap.has('Mouse') && steve.aimedBlock) {
                if (steve.aimedBlock.destroy()) {
                    steve.highlight.removeMesh(steve.aimedBlock.mesh);
                    steve.aimedBlock = undefined;
                }
            }
        }
    };

    attachControl(noPreventDefault: boolean) {
        this.noPreventDefault = noPreventDefault;
        const scene = this.camera.getScene();
        this.keyboardInfo = scene.onKeyboardObservable.add(
            this.onKeyboardInput,
            KeyboardEventTypes.KEYDOWN | KeyboardEventTypes.KEYUP
        );

        this.pointerInfo = scene.onPointerObservable.add(
            this.onPointerInput,
            PointerEventTypes.POINTERDOWN |
                PointerEventTypes.POINTERUP |
                PointerEventTypes.POINTERTAP |
                PointerEventTypes.POINTERMOVE
        );
    }

    detachControl() {
        const scene = this.camera.getScene();
        if (this.keyboardInfo) {
            scene.onKeyboardObservable.remove(this.keyboardInfo);
        }
        if (this.pointerInfo) {
            scene.onPointerObservable.remove(this.pointerInfo);
        }
    }
}

class Steve extends Mesh {
    static GRAVITY = 9.81;
    static GOD_MODE = false;

    world: World;
    highlight: HighlightLayer;
    eyes: FreeCamera;
    head: Mesh;

    isJumping = false;
    velocity: Vector3;

    aimedBlock?: Block;

    constructor(world: World) {
        super('steve', world.scene);

        this.world = world;

        const scene = world.scene;
        this.highlight = new HighlightLayer('picked', scene);

        this.position = new Vector3(0, 5, 0);
        // this.isVisible = true;
        this.checkCollisions = true;
        this.ellipsoid = new Vector3(0.2, 2, 0.2);
        this.ellipsoidOffset = new Vector3(0, 1.8, 0);
        this.velocity = Vector3.Zero();

        // const camera = new ArcRotateCamera('camera', -Math.PI / 2, Math.PI / 2.5, 5, new Vector3(0, 0, 0), scene);
        // camera.attachControl(engine.getRenderingCanvas(), true);
        const engine = scene.getEngine();

        const head = MeshBuilder.CreateBox('steve.head', {}, scene);
        head.parent = this;
        head.isVisible = false;
        head.position = new Vector3(0, 1.8, 0);

        const eyes = new UniversalCamera('steve.eyes', new Vector3(0, 0, 0), scene);
        eyes.parent = head;
        eyes.attachControl(engine.getRenderingCanvas(), true);
        // eyes.applyGravity = true;
        // eyes.speed = 0.1;
        // eyes.lockedTarget = this;
        eyes.minZ = 0;

        eyes.inputs.removeByType('FreeCameraKeyboardMoveInput');
        eyes.inputs.removeByType('FreeCameraMouseInput');

        eyes.inputs.add(new SteveInput(this));

        eyes.fov = 1;

        this.eyes = eyes;
        this.head = head;

        scene.activeCameras!.push(eyes);

        const gravitySpeed = Steve.GRAVITY / 480;
        scene.registerBeforeRender(() => {
            // 1/2 g a = gravity * elapsedTime
            const origin = this.position.clone();
            if (origin.y > -1) {
                this.velocity.addInPlaceFromFloats(0, -gravitySpeed, 0);
            } else if (this.velocity.y < 0) {
                this.velocity = Vector3.Zero();
            }
            this.moveWithCollisions(this.velocity);
            if (Math.abs(this.position.y - origin.y) < 0.0001) {
                this.velocity = Vector3.Zero();
                this.isJumping = false;
            }

            const lengthSquared = this.position.subtract(origin).lengthSquared();
            if (lengthSquared > 0) {
                this.checkSound();
            }
        });
    }

    checkSound() {
        const [x, y, z] = this.position.asArray().map((it) => Math.round(it));
        const block = this.world.getBlock(x, z, y - 1);
        if (block && block.sounds.length > 0 && !block.sounds.find((it) => it.isReady() && it.isPlaying)) {
            const sound = block.sounds[Math.floor(Math.random() * block.sounds.length)];
            if (sound.isReady() && !sound.isPlaying) {
                sound.play();
            }
        }
    }
}

export { Steve, SteveInput };
