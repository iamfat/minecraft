import Engine from '../Engine';
import setupGrass from './naturals/Grass';
import setupSand from './naturals/Sand';
import setupWater from './naturals/Water';

export default function (engine: Engine) {
    setupGrass(engine);
    setupSand(engine);
    setupWater(engine);
}
