import { Engine, Scene, HemisphericLight, Vector3, Color3 } from '@babylonjs/core';
import { Block, RegisterBlockOptions } from './Block';
import { Steve } from './Steve';
import { SightPlane } from './SightPlane';

class World {
    engine: Engine;
    scene: Scene;
    private blocks: Map<string, Block> = new Map();

    constructor(engine: Engine) {
        this.engine = engine;

        const scene = new Scene(engine);
        // scene.enablePhysics(new Vector3(0, -0.09, 0));
        scene.gravity = new Vector3(0, -0.09, 0);
        scene.collisionsEnabled = true;
        this.scene = scene;

        new Steve(this);
        new SightPlane(this);

        const light = new HemisphericLight('light', new Vector3(0.1, 1, 0.3), scene);

        light.diffuse = new Color3(1, 1, 1);
        light.specular = new Color3(0, 0, 0);
        light.groundColor = new Color3(0.5, 0.5, 0.5);
    }

    start() {
        this.engine.runRenderLoop(() => {
            this.scene.render();
        });
    }

    registerBlock(name: string, options: Omit<RegisterBlockOptions, 'scene'>) {
        Block.register(name, {
            scene: this.scene,
            ...options
        });
    }

    registerBlocks(blockOptions: { [name: string]: Omit<RegisterBlockOptions, 'scene'> }) {
        Object.keys(blockOptions).forEach((name) => {
            Block.register(name, {
                scene: this.scene,
                ...blockOptions[name]
            });
        });
    }

    putBlock(name: string, [x, y, z = 0]: [number, number, number]) {
        const block = new Block(name, { world: this, position: [x, y, z] });
        this.blocks.set(`${x}.${y}.${z}`, block);
    }

    hasBlock(x: number, y: number, z: number) {
        return this.blocks.has(`${x}.${y}.${z}`);
    }

    getBlock(x: number, y: number, z: number) {
        return this.blocks.get(`${x}.${y}.${z}`);
    }

    removeBlock(block: Block) {
        const [x, y, z] = block.position;
        this.blocks.delete(`${x}.${y}.${z}`);
    }
}

export { World };
