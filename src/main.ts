import { Engine } from 'noa-engine';
import loadBlocks from './components/Blocks';
import loadWorld from './components/World';
import loadSound from './components/Sound';
import loadSteve from './components/Steve';
import loadSightPlane from './components/SightPlane';
import loadAnimals from './components/Animals';

import './style.css';

function main() {
    const size = 32;
    const center = size * 0.5;

    const worldSize = 256;
    const worldHeight = 64;

    const engine = new Engine({
        chunkSize: 32,
        chunkAddDistance: 7,
        chunkRemoveDistance: 8,
        blockTestDistance: 6,
        playerStart: [center + 0.5, 48, center + 0.5],
        playerHeight: 1.8,
        texturePath: 'assets/textures2/',
        stickyPointerLock: true,
        renderOnResize: true,
        gravity: [0, -9.8 * 1.8, 0]
        // lightDiffuse: [1, 1, 1],
        // lightSpecular: [1, 1, 1],
        // groundLightColor: [0.5, 0.5, 0.5],
        // initialZoom: 10
    });

    engine.setPaused(true);
    const blocks = loadBlocks(engine);

    loadWorld(engine, {
        size: worldSize,
        height: worldHeight,
        seed: 80556954620176,
        blockIds: {
            bedrock: blocks.id('bedrock'),
            water: blocks.id('water')
        }
    });
    const sound = loadSound(engine);

    loadSightPlane(engine);
    loadSteve(engine);
    loadAnimals(engine);

    const { inputs } = engine;
    // clear targeted block on on left click
    inputs.down.on('fire', () => {
        if (engine.targetedBlock) {
            const { position: pos, blockID } = engine.targetedBlock;
            engine.setBlock(0, pos[0], pos[1], pos[2]);
            sound.blockPlay(blockID);
        }
    });

    inputs.down.on('alt-fire', () => {
        if (engine.targetedBlock) {
            const { adjacent: pos } = engine.targetedBlock;
            engine.setBlock(blocks.id('grass'), pos[0], pos[1], pos[2]);
        }
    });

    // each tick, consume any scroll events and use them to zoom camera
    engine.on('tick', () => {
        const { camera } = engine;
        const scroll = inputs.state.scrolly;
        if (scroll !== 0) {
            camera.zoomDistance += scroll > 0 ? 1 : -1;
            if (camera.zoomDistance < 0) camera.zoomDistance = 0;
            if (camera.zoomDistance > 10) camera.zoomDistance = 10;
        }
    });
}

// main(<HTMLCanvasElement>document.getElementById('world'));
main();
