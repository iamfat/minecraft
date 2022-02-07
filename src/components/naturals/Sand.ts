import Engine from '../../Engine';

const FLUID_BLOCKS = ['water', 'water-hack', 'lava'];
const SAND_OR_GRAVEL_BLOCKS = ['sand', 'gravel'];

// type PositionFloats = [number, number, number];

export default function (engine: Engine) {
    const { blocks } = engine;

    function getNearestBlockBelow(x: number, y: number, z: number, match: (id: number) => boolean) {
        let blockId = 0;
        while (blockId === 0 || !match(blockId)) {
            y--;
            if (y < 0) {
                blockId = 0;
                break;
            }
            blockId = engine.getBlock(x, y, z);
        }
        return [blockId, y];
    }

    const fluidBlockIds = FLUID_BLOCKS.map((it) => blocks.id(it));
    const sandOrGravelBlockIds = SAND_OR_GRAVEL_BLOCKS.map((it) => blocks.id(it));

    function checkDownSandGravel(x: number, y: number, z: number, blockId: number) {
        const [blockIdBelow, yBelow] = getNearestBlockBelow(x, y, z, (id) => !fluidBlockIds.includes(id));
        if (blockIdBelow) {
            engine.setBlock(0, x, y, z);
            engine.setBlock(blockId, x, yBelow + 1, z);
            const blockIdAbove = engine.getBlock(x, y + 1, z);
            if (blockIdAbove == blocks.id('sand') || blockIdAbove == blocks.id('gravel')) {
                checkDownSandGravel(x, y + 1, z, blockIdAbove);
            }

            if (engine.getBlock(x, y, z) === 0) {
                engine.nextTick(() => engine.emit('remove-block', { blockId, position: [x, y, z] }));
            }
        }
    }

    engine.on('remove-block', (target) => {
        const { position } = target;
        const [x, y, z] = position;

        const blockIdAbove = engine.getBlock(x, y + 1, z);
        if (blockIdAbove && sandOrGravelBlockIds.includes(blockIdAbove)) {
            checkDownSandGravel(x, y + 1, z, blockIdAbove);
        }
    });

    engine.on('add-block', (target) => {
        const { position, blockId } = target;
        const [x, y, z] = position;

        if (sandOrGravelBlockIds.includes(blockId)) {
            checkDownSandGravel(x, y, z, blockId);
        }
    });
}
