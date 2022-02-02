import { Engine } from 'noa-engine';

const blockIds: { [id: string]: number } = {};

export default function (engine: Engine) {
    const { registry } = engine;

    // prettier-ignore
    const block_textures = [
            "grass", "dirt", "grass_dirt", "stone", "wood", "rock", "bedrock", "sand", "gravel", "tree_top", "tree_side", "lava", "rock_gold", "rock_bronze", "rock_coal", "gold", "sponge", "color0", "color1", "color2", "color3", "color4", "color5", "color6", "color7", "color8", "color9", "color10", "color11", "color12", "color13", "color14", "color15"
        ];

    block_textures.forEach((it) => {
        registry.registerMaterial(it, it === 'lava' ? [0.4, 0, 0, 0.95] : undefined, `block/${it}.png`);
    });

    // prettier-ignore
    const item_textures = [
            "leaves_opaque", "glass", "water", "bush", "red_flower", "yellow_flower", "red_mushroom", "brown_mushroom"
        ];

    item_textures.forEach((it) => {
        registry.registerMaterial(it, it === 'water' ? [0, 0, 0.4, 0.85] : undefined, `block/${it}.png`, true);
    });

    registry.registerMaterial('empty_sponge', [0, 0, 0, 0], undefined, true);

    // const scene = rendering.getScene();
    // for (let i = 3; i < 8; i++) {
    //     const name = item_textures[i];
    //     const mat = rendering.makeStandardMaterial(`${name}Mat`);
    //     mat.diffuseTexture = new Texture(`assets/textures/${name}.png`, scene, true, true, 1);
    //     mat.diffuseTexture.hasAlpha = true;
    //     mat.diffuseTexture.getAlphaFromRGB = true;
    // }

    blockIds.grass = registry.registerBlock(1, {
        material: ['grass', 'dirt', 'grass_dirt']
    });

    registry.registerBlock(2, {
        material: 'stone'
    });

    registry.registerBlock(3, {
        material: 'dirt'
    });

    registry.registerBlock(4, {
        material: 'wood'
    });

    blockIds.water = registry.registerBlock(7, {
        material: 'water',
        opaque: false,
        solid: false,
        fluid: true,
        fluidDensity: 1,
        viscosity: 0.5
    });

    registry.registerBlock(9, {
        material: 'rock'
    });

    blockIds.bedrock = registry.registerBlock(10, {
        material: 'bedrock'
    });

    registry.registerBlock(11, {
        material: 'sand'
    });

    registry.registerBlock(12, {
        material: 'gravel'
    });

    registry.registerBlock(13, {
        material: ['tree_top', 'tree_top', 'tree_side']
    });

    registry.registerBlock(14, {
        material: 'leaves_opaque',
        opaque: false
    });

    registry.registerBlock(17, {
        material: 'lava',
        solid: false,
        fluid: true,
        fluidDensity: 1,
        viscosity: 0.5
    });

    registry.registerBlock(18, {
        material: 'rock_gold'
    });

    registry.registerBlock(19, {
        material: 'rock_bronze'
    });

    registry.registerBlock(20, {
        material: 'rock_coal'
    });

    registry.registerBlock(21, {
        material: 'gold'
    });

    registry.registerBlock(22, {
        material: 'sponge'
    });

    registry.registerBlock(23, {
        material: 'glass',
        opaque: false
    });

    registry.registerBlock(40, {
        material: 'empty_sponge',
        opaque: false,
        solid: false
    });

    return {
        id(name: string) {
            return blockIds[name];
        }
    };
}
