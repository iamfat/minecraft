import Engine from '../../Engine';

const WATER_BLOCKS = ['water', 'water-hack'];

export default function (engine: Engine) {
    const { blocks } = engine;
    const waterId = blocks.id('water');
    const waterHackId = blocks.id('water-hack');
    const waterBlocks = [waterId, waterHackId];

    function shouldWaterHaveSurface(x: number, y: number, z: number) {
        var n = engine.getBlock(x, y + 1, z),
            r = engine.getBlock(x - 1, y + 1, z),
            o = engine.getBlock(x + 1, y + 1, z),
            a = engine.getBlock(x, y + 1, z + 1),
            s = engine.getBlock(x, y + 1, z - 1);
        return (
            (0 == n || 0 == r || 0 == o || 0 == a || 0 == s) &&
            n != waterId &&
            r != waterId &&
            o != waterId &&
            a != waterId &&
            s != waterId &&
            n != waterHackId &&
            r != waterHackId &&
            o != waterHackId &&
            a != waterHackId &&
            s != waterHackId
        );
    }

    function checkWaterBelowAdd(x: number, y: number, z: number) {}

    function checkNeighbours(x: number, y: number, z: number, isFluid: boolean) {}

    engine.on('remove-block', (target) => {
        const { position } = target;
        const [x, y, z] = position;

        const blockIdBelow = engine.getBlock(x, y - 1, z);
        const isFluid = waterBlocks.includes(blockIdBelow);
        checkNeighbours(x, y, z, isFluid);
    });

    engine.on('add-block', (target) => {
        const { position } = target;
        const [x, y, z] = position;

        const blockIdBelow = engine.getBlock(x, y - 1, z);
        if (waterBlocks.includes(blockIdBelow)) {
            checkWaterBelowAdd(x, y - 1, z);
        }
    });
}
