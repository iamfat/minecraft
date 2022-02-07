import Engine from '../../Engine';

const FOILAGE_BLOCKS = ['red-flower', 'yellow-flower', 'bush', 'red-mushroom', 'brown-mushroom'];

const GRASS_GROWTH_SPEED_MIN = 8000;
const GRASS_GROWTH_SPEED_MAX = 24000;
const GRASS_REMOVE_SPEED_MIN = 8000;
const GRASS_REMOVE_SPEED_MAX = 24000;

// type PositionFloats = [number, number, number];

export default function (engine: Engine) {
    const { blocks } = engine;
    const dirtId = blocks.id('dirt');
    const grassId = blocks.id('grass');
    const canGrowGrassBlocks = [...FOILAGE_BLOCKS, 'leaf', 'glass'].map((it) => blocks.id(it));

    // function getNearestBlockAbove(x: number, y: number, z: number, match: (id: number) => boolean) {
    //     let blockId = 0;
    //     while (blockId === 0 || !match(blockId)) {
    //         y++;
    //         if (y == 64) {
    //             blockId = 0;
    //             break;
    //         }
    //         blockId = engine.getBlock(x, y, z);
    //     }
    //     return [blockId, y];
    // }

    function flagToGrowGrass(x: number, y: number, z: number) {
        setTimeout(() => {
            if (engine.getBlock(x, y, z) === dirtId) {
                const blockIdAbove = engine.getBlock(x, y + 1, z);
                if (blockIdAbove === 0 || canGrowGrassBlocks.includes(blockIdAbove)) {
                    engine.setBlock(grassId, x, y, z);
                }
            }
        }, GRASS_GROWTH_SPEED_MIN + Math.random() * (GRASS_GROWTH_SPEED_MAX - GRASS_GROWTH_SPEED_MIN));
    }

    function flagToRemoveGrass(x: number, y: number, z: number) {
        setTimeout(() => {
            if (engine.getBlock(x, y, z) === grassId) {
                const blockIdAbove = engine.getBlock(x, y + 1, z);
                if (blockIdAbove !== 0 && !canGrowGrassBlocks.includes(blockIdAbove)) {
                    engine.setBlock(blocks.id('dirt'), x, y, z);
                }
            }
        }, GRASS_REMOVE_SPEED_MIN + Math.random() * (GRASS_REMOVE_SPEED_MAX - GRASS_REMOVE_SPEED_MIN));
    }

    function checkDownForDirt(x: number, y: number, z: number) {
        let blockId = 0;
        do {
            y--;
            blockId = engine.getBlock(x, y, z);
        } while (blockId === 0 || canGrowGrassBlocks.includes(blockId));
        if (blockId == blocks.id('dirt')) flagToGrowGrass(x, y, z);
    }

    function checkDownForGrass(x: number, y: number, z: number) {
        let blockId = 0;
        do {
            y--;
            blockId = engine.getBlock(x, y, z);
        } while (blockId === 0 || canGrowGrassBlocks.includes(blockId));
        if (blockId == blocks.id('grass')) flagToRemoveGrass(x, y, z);
    }

    engine.on('remove-block', (target) => {
        const {
            position: [x, y, z]
        } = target;
        checkDownForDirt(x, y, z);
    });

    engine.on('add-block', (target) => {
        const { position, blockId } = target;
        const [x, y, z] = position;

        if (blockId === dirtId) {
            flagToGrowGrass(x, y, z);
        }

        checkDownForGrass(x, y, z);
    });
}
