import Engine from '../Engine';

export default function (engine: Engine, options?: { seed?: number; size?: number; height?: number }) {
    const { size, height, seed } = { size: 128, height: 64, ...options };
    const world = {
        tiles: [] as number[],
        getBlockId(x: number, y: number, z: number) {
            return this.tiles[(y * size + z) * size + x];
        }
    };

    const worker = new Worker('/RandomLevelWorker.js');
    worker.postMessage({
        worldSize: size,
        worldHeight: height,
        seed
    });
    worker.addEventListener('message', (ev) => {
        const { tiles } = ev.data;
        if (tiles) {
            world.tiles = tiles;
            engine.setPaused(false);
        }
    });

    const blocks = engine.blocks;
    const bedrockId = blocks.id('bedrock')!;
    const waterId = blocks.id('water')!;

    const bedRockHeight = 30;
    function getBlockId(x: number, y: number, z: number) {
        let id = world.getBlockId(x, y, z);
        if (id !== undefined) {
            if (y == 0) {
                id = bedrockId;
            }
        }

        if (x < 0 || z < 0 || x >= size || z >= size) {
            id = 0;
            if (y <= bedRockHeight - 2) {
                id = bedrockId;
            } else if (y <= bedRockHeight) {
                id = waterId;
            }
        }

        return id;
    }

    const onWorldData = (id: string, data: any, x: number, y: number, z: number) => {
        for (var i = 0; i < data.shape[0]; i++) {
            for (var j = 0; j < data.shape[1]; j++) {
                for (var k = 0; k < data.shape[2]; k++) {
                    const blockId = getBlockId(x + i, y + j, z + k);
                    data.set(i, j, k, blockId);
                }
            }
        }
        engine.world.setChunkData(id, data, {});
    };

    engine.world.on('worldDataNeeded', onWorldData);
}
