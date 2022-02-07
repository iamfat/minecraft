import Engine from './Engine';
import setupWorld from './components/World';

import './style.css';
import { Texture } from '@babylonjs/core';

function main(domElement: HTMLDivElement) {
    const worldSize = 256;
    const worldHeight = 64;
    const center = worldSize * 0.5;

    const engine = new Engine({
        domElement,
        chunkSize: 32,
        chunkAddDistance: 7,
        chunkRemoveDistance: 8,
        blockTestDistance: 6,
        playerStart: [center + 0.5, 48, center + 0.5],
        playerHeight: 1.8,
        texturePath: 'assets/textures/',
        stickyPointerLock: true,
        renderOnResize: true,
        gravity: [0, -9.8 * 1.8, 0]
        // lightDiffuse: [1, 1, 1],
        // lightSpecular: [1, 1, 1],
        // groundLightColor: [0.5, 0.5, 0.5],
        // initialZoom: 10
    });

    engine.setPaused(true);

    setupWorld(engine, {
        size: worldSize,
        height: worldHeight,
        seed: 80556954620176
        // seed: 74428196679196,
    });

    const { inputs } = engine;

    // const hotbar = document.getElementById('hotbar') as HTMLDivElement;
    // function resizeHotBar() {
    //     hotbar.style.transform = `translateX(-50%) scale(${domElement.clientWidth / 480})`;
    //     hotbar.style.bottom = `${domElement.clientHeight / 10}px`;
    // }
    // window.addEventListener('resize', resizeHotBar);
    // resizeHotBar();
    // hotbar.style.display = 'block';

    // inputs.bind('hotbar', '1', '2', '3', '4', '5', '6', '7', '8', '9');
    // inputs.down.on('hotbar', ({ keyCode }) => {
    //     const code = keyCode - 49;
    //     const selection = hotbar.querySelector('.selection') as HTMLImageElement;
    //     selection.style.left = `${code * 20}px`;
    //     console.log(selection.style.left);
    // });

    // clear targeted block on on left click
    inputs.down.on('fire', () => {
        if (engine.targetedBlock) {
            const { position, blockID: blockId } = engine.targetedBlock;
            engine.setBlock(0, position[0], position[1], position[2]);
            engine.sounds.blockPlay(blockId);

            const { rendering } = engine;
            const matId = engine.registry.getBlockFaceMaterial(blockId, 3); // get material from bottom
            const textureUrl = engine.registry.getMaterialTexture(matId);
            if (textureUrl) {
                const texture = new Texture(textureUrl, rendering.getScene(), true, false);
                engine.particles.addParticles('debris', texture, 1, [
                    position[0] + 0.5,
                    position[1] + 0.5,
                    position[2] + 0.5
                ]);
            }

            engine.emit('remove-block', {
                blockId,
                position
            });
        }
    });

    inputs.down.on('alt-fire', () => {
        if (engine.targetedBlock) {
            const { blocks, steve } = engine;
            const { adjacent } = engine.targetedBlock;
            const blockInHand = steve.blockInHand || blocks.id('water-hack');
            engine.setBlock(blockInHand, adjacent[0], adjacent[1], adjacent[2]);
            engine.emit('add-block', {
                blockId: blockInHand,
                position: adjacent
            });
        }
    });

    // each tick, consume any scroll events and use them to zoom camera
    engine.on('tick', () => {
        const { inputs, camera } = engine;
        const scroll = inputs.state.scrolly;
        if (scroll !== 0) {
            camera.zoomDistance += scroll > 0 ? 1 : -1;
            if (camera.zoomDistance < 0) camera.zoomDistance = 0;
            if (camera.zoomDistance > 10) camera.zoomDistance = 10;
        }
    });
}

main(<HTMLDivElement>document.getElementById('world'));
