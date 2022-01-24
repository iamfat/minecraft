import {
    Engine,
    Scene,
    Mesh,
    MeshBuilder,
    Material,
    StandardMaterial,
    MultiMaterial,
    DynamicTexture,
    SubMesh,
    Sound
} from '@babylonjs/core';
import { nanoid } from 'nanoid/non-secure';
import { World } from '.';

export type BlockRenderContext = {
    textures: DynamicTexture[];
    [name: string]: any;
};

export type RegisterBlockOptions = {
    scene: Scene;
    materials: string[];
    dynamicTextures?: (textures: DynamicTexture[]) => void;
    render?: (block: Block) => void;
    sounds?: string[];
};

export type BlockConstructorOptions = {
    world: World;
    position?: [number, number, number];
};

const allBlocks: {
    [name: string]: {
        material: Material;
        sides: number;
        render?: (block: Block) => void;
        sounds: Sound[];
    };
} = {};

class Block {
    name: string;
    mesh: Mesh;
    world: World;
    sounds: Sound[];
    position: number[];

    constructor(name: string, options: BlockConstructorOptions) {
        const { material, sides, render, sounds } = allBlocks[name];
        const mesh = MeshBuilder.CreateBox(`${name}.${nanoid(8)}`, { wrap: true });

        this.name = name;
        this.sounds = sounds;

        if (sides > 1) {
            const verticesCount = mesh.getTotalVertices();
            mesh.subMeshes = [];
            if (sides === 3) {
                // top, bottom, wrap
                new SubMesh(2, 0, verticesCount, 0, 6, mesh); // back
                new SubMesh(2, 0, verticesCount, 6, 6, mesh); // front
                new SubMesh(2, 0, verticesCount, 12, 6, mesh); // right
                new SubMesh(2, 0, verticesCount, 18, 6, mesh); // left
                new SubMesh(0, 0, verticesCount, 24, 6, mesh); // top
                new SubMesh(1, 0, verticesCount, 30, 6, mesh); // bottom
            } else if (sides === 6) {
                new SubMesh(2, 0, verticesCount, 0, 6, mesh); // back
                new SubMesh(3, 0, verticesCount, 6, 6, mesh); // front
                new SubMesh(4, 0, verticesCount, 12, 6, mesh); // right
                new SubMesh(5, 0, verticesCount, 18, 6, mesh); // left
                new SubMesh(0, 0, verticesCount, 24, 6, mesh); // top
                new SubMesh(1, 0, verticesCount, 30, 6, mesh); // bottom
            }
        }

        material.backFaceCulling = false;

        mesh.material = material;
        mesh.checkCollisions = true;
        mesh.receiveShadows = true;

        const { position, world } = options;
        if (position) {
            mesh.position.set(position[0], position[2], position[1]);
        }

        this.position = position || [0, 0, 0];
        this.world = world;
        this.mesh = mesh;
        (mesh as any)._block = this;

        render && render(this);
    }

    hasBlockOnTop() {
        const { x, y, z } = this.mesh.position;
        return this.world.hasBlock(x, z, y + 1);
    }

    destroying?: {
        mesh: Mesh;
        stage: number;
    };
    destroy(delta = 1) {
        if (!this.destroying) {
            const id = `${this.mesh.id}.destroying`;
            const scene = this.mesh.getScene();
            const mesh = MeshBuilder.CreateBox(id, { size: 1.01 }, scene);
            const material = new StandardMaterial(id, scene);
            const texture = new DynamicTexture(id, 16, scene, false, Engine.TEXTURE_NEAREST_SAMPLINGMODE);
            texture.hasAlpha = true;
            material.diffuseTexture = texture;
            material.useAlphaFromDiffuseTexture = true;
            mesh.material = material;
            mesh.position.copyFrom(this.mesh.position);
            (mesh as any)._block = this;
            this.destroying = {
                mesh,
                stage: 0
            };
        }

        this.destroying.stage += delta;
        if (this.destroying.stage >= 10) {
            this.world.removeBlock(this);
            this.mesh.dispose();
            this.destroying.mesh.dispose();
            return true;
        }

        DESTROYING_IMAGES.then((images) => {
            const { mesh, stage } = this.destroying!;
            const material = mesh.material as StandardMaterial;
            const texture = material.diffuseTexture as DynamicTexture;
            const ctx = texture.getContext();
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
            ctx.drawImage(images[stage], 0, 0);
            // const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
            // imageData.data.forEach((_, index) => {
            //     if (index % 4 === 3) {
            //         imageData.data[index] = 128;
            //     } else {
            //         imageData.data[index] = 128;
            //     }
            // });
            // ctx.putImageData(imageData, 0, 0);
            texture.update();
        });

        return false;
    }

    static register(
        name: string,
        { scene, materials: matNames, dynamicTextures, render, sounds: soundNames }: RegisterBlockOptions
    ) {
        if (allBlocks[name]) return;

        const materials = matNames.map((_, index) => {
            const matId = `${name}:${index}`;
            const mat = new StandardMaterial(matId, scene);
            const texture = new DynamicTexture(matId, 16, scene, false, Engine.TEXTURE_NEAREST_SAMPLINGMODE);
            mat.diffuseTexture = texture;
            return mat;
        });

        const textures = materials.map((it) => it.diffuseTexture as DynamicTexture);
        if (dynamicTextures) {
            dynamicTextures(textures);
        } else {
            Promise.all(matNames.map((it) => Block.loadImage(it))).then((images) => {
                images.forEach((image, index) => {
                    const texture = textures[index];
                    const ctx = texture.getContext();
                    ctx.drawImage(image, 0, 0);
                    texture.update();
                });
            });
        }

        const sounds = (soundNames || []).map(
            (it, index) => new Sound(`${name}:${index}`, `/assets/sounds/${it}.mp3`, scene)
        );

        if (materials.length === 1) {
            allBlocks[name] = {
                material: materials[0],
                sides: materials.length,
                render,
                sounds
            };
            return;
        }

        const blockMat = new MultiMaterial(name, scene);
        blockMat.subMaterials.push(...materials);
        allBlocks[name] = {
            material: blockMat,
            sides: materials.length,
            render,
            sounds
        };
    }

    static getDefinition(name: string) {
        return allBlocks[name];
    }

    static loadImage(name: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = `/assets/textures/block/${name}.png`;
            img.onload = () => resolve(img);
            img.onerror = () => reject(name);
        });
    }
}

const DESTROYING_IMAGES = Promise.all(
    Array.from({ length: 10 }, (_, index) => Block.loadImage(`destroy_stage_${index}`))
);

export { Block };
