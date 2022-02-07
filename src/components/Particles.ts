import { Scene, Texture, Color3, Color4 } from '@babylonjs/core';
import Engine from '../Engine';
import MPS, { ParticleData } from '../lib/MPS';

export type Particles = {
    addParticles(type: 'debris', texture: Texture, startColor: number, position: number[]): void;
};

export default function (engine: Engine) {
    const scene: Scene = engine.rendering.getScene();

    // const debrisTexture = new Texture(
    //     'assets/textures/block/grass_dirt.png',
    //     scene,
    //     true,
    //     false,
    //     Constants.TEXTURE_NEAREST_NEAREST_MIPNEAREST
    // );

    const effects = {
        debris: {
            cap: 64,
            g: -10,
            emit: 32,
            rate: 0,
            alphas: [1, 1],
            colors: [Color3.White(), Color3.White()],
            sizes: [0.8, 0.8],
            init: (particle: ParticleData) => {
                particle.position.x = 0.8 * Math.random() - 0.4;
                particle.position.y = 0.8 * Math.random() - 0.4;
                particle.position.z = 0.8 * Math.random() - 0.4;
                particle.velocity.x = 4 * Math.random() - 2;
                particle.velocity.y = 4 * Math.random();
                particle.velocity.z = 4 * Math.random() - 2;
                particle.size = 0.05 + 0.15 * Math.random();
                particle.age = 1.5 * Math.random();
                particle.lifetime = 2;
            }
        }
    };

    // const t2 = new Texture('assets/textures/block/grass.png', scene, true, false);
    function addParticles(type: 'debris', texture: Texture, startColor: number, position: number[]) {
        const effect = effects[type];
        if (!effect) return;

        const mps = new MPS(
            effect.cap,
            effect.rate,
            scene,
            new Color4(startColor, startColor, startColor, 1),
            [0, 1],
            [0, 1]
        );
        mps.gravity = effect.g;
        mps.setAlphaRange(effect.alphas[0], effect.alphas[1]);
        mps.setSizeRange(effect.sizes[0], effect.sizes[1]);
        mps.initParticle = effect.init;
        mps.stopOnEmpty = true;
        mps.setTexture(texture);
        if (effect.emit) {
            mps.emit(effect.emit);
        }
        mps.disposeOnEmpty = true;
        mps.mesh.position.copyFromFloats(position[0], position[1], position[2]);
        engine.rendering.addMeshToScene(mps.mesh);
    }

    return { addParticles };
}
