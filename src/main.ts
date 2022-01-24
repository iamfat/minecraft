import { DynamicTexture, Engine, MultiMaterial, StandardMaterial } from '@babylonjs/core';
import { World, Block, ColorMap, BlockRenderContext } from './models';

import './style.css';

const options = {
    showFPS: false,
    antiAlias: true,
    clearColor: [0.588, 0.835, 1],
    ambientColor: [1, 1, 1],
    lightDiffuse: [1, 1, 1],
    lightSpecular: [1, 1, 1],
    groundLightColor: [0.5, 0.5, 0.5],
    initialCameraZoom: 0,
    cameraZoomSpeed: 0.2,
    cameraMaxAngle: Math.PI / 2 - 0.01,
    useAO: true,
    AOmultipliers: [0.93, 0.8, 0.5],
    reverseAOmultiplier: 1
};

function main(canvas: HTMLCanvasElement) {
    const engine = new Engine(canvas, options.antiAlias, { stencil: true }, true);
    const world = new World(engine);

    world.registerBlocks({
        dirt: {
            materials: ['dirt', 'dirt', 'dirt'],
            render: (block: Block) => {
                const material = block.mesh.material! as MultiMaterial;
                const growGrass = () => {
                    if (block.hasBlockOnTop()) {
                        block.mesh.material = material;
                    } else {
                        block.mesh.material = Block.getDefinition('grass').material;
                    }
                    setTimeout(() => growGrass(), 1000);
                };
                growGrass();
            },
            sounds: ['grass1', 'grass2', 'grass3', 'grass4']
        },
        grass: {
            materials: ['dirt', 'dirt', 'dirt'],
            dynamicTextures: async (textures: DynamicTexture[]) => {
                const [dirt, grassTop, grassSide, colorPick]: [
                    HTMLImageElement,
                    HTMLImageElement,
                    HTMLImageElement,
                    Function
                ] = await Promise.all([
                    Block.loadImage('dirt'),
                    Block.loadImage('grass_block_top'),
                    Block.loadImage('grass_block_side_overlay'),
                    ColorMap.load('grass')
                ]);

                const [grassTopTexture, _, grassSideTexture] = textures;

                let x = 0,
                    y = 0;
                const drawGrass = () => {
                    const grassColor = colorPick(x, y);
                    {
                        const ctx = grassTopTexture.getContext();
                        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                        ctx.drawImage(grassTop, 0, 0);
                        ctx.globalCompositeOperation = 'multiply';
                        ctx.fillStyle = grassColor;
                        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                        grassTopTexture.update();
                    }
                    {
                        const ctx = grassSideTexture.getContext();
                        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                        ctx.drawImage(grassSide, 0, 0);
                        ctx.globalCompositeOperation = 'multiply';
                        ctx.fillStyle = grassColor;
                        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                        ctx.globalCompositeOperation = 'destination-atop';
                        ctx.drawImage(grassSide, 0, 0);
                        ctx.globalCompositeOperation = 'destination-over';
                        ctx.drawImage(dirt, 0, 0);
                        grassSideTexture.update();
                    }

                    setTimeout(() => {
                        x += Math.floor(Math.random() * 2);
                        y += Math.floor(Math.random() * 2);
                        if (x < 0) x = 0;
                        if (y < 0) y = 0;
                        if (x > 255) x = 255;
                        if (y > 255) y = 255;
                        drawGrass();
                    }, 1000);
                };

                drawGrass();
            }
        },
        stone: {
            materials: ['stone']
        },
        obsidian: {
            materials: ['obsidian']
        },
        tnt: {
            materials: ['tnt_top', 'tnt_bottom', 'tnt_side']
        },
        oak: {
            materials: ['oak_log_top', 'oak_log_top', 'oak_log']
        }
    });

    for (let y = -10; y < 10; y++) {
        for (let x = -10; x < 10; x++) {
            world.putBlock('dirt', [x, y, 0]);
        }
    }

    for (let y = -10; y < 10; y++) {
        for (let x = -10; x < 10; x++) {
            if (Math.floor(Math.random() * 3) == 1) {
                world.putBlock('dirt', [x, y, 1]);
            }
        }
    }

    for (let y = -10; y < 10; y++) {
        for (let x = -10; x < 10; x++) {
            if (world.hasBlock(x, y, 1)) {
                if (Math.floor(Math.random() * 6) == 1) {
                    world.putBlock('oak', [x, y, 2]);
                    world.putBlock('oak', [x, y, 3]);
                    world.putBlock('oak', [x, y, 4]);
                }
            }
        }
    }

    world.start();
}

main(<HTMLCanvasElement>document.getElementById('world'));
