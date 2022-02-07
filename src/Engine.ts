import { Engine as NoaEngine } from 'noa-engine';
import setupBlocks, { Blocks } from './components/Blocks';
import setupSounds, { Sounds } from './components/Sounds';
import setupParticles, { Particles } from './components/Particles';
import setupSteve, { Steve } from './components/Steve';
import setupSightPlane from './components/SightPlane';
import setupAnimals from './components/Animals';
import setupNature from './components/Nature';

class Engine extends NoaEngine {
    blocks: Blocks;
    sounds: Sounds;
    particles: Particles;
    steve: { blockInHand: number };

    constructor(options?: any) {
        super(options);

        this.blocks = setupBlocks(this);
        this.sounds = setupSounds(this, { musicOn: false });
        this.particles = setupParticles(this);
        setupSightPlane(this);
        this.steve = setupSteve(this);
        setupAnimals(this);
        setupNature(this);
    }

    private nextTickCallbacks: { func: Function; args: any[] }[] = [];
    nextTick(func: Function, args: any[] = []) {
        if (this.nextTickCallbacks.length === 0) {
            this.once('tick', () => {
                this.nextTickCallbacks.forEach(({ func, args }) => func(...args));
                this.nextTickCallbacks = [];
            });
        }
        this.nextTickCallbacks.push({ func, args });
    }
}

export default Engine;
