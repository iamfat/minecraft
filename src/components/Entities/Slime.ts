import { Engine } from 'noa-engine';
import { Scene } from '@babylonjs/core';
import { loadImage, makeImageMaterial, makeBox } from '../../lib/Util';

export default async function (engine: Engine) {
    const { entities, rendering } = engine;

    const scene: Scene = rendering.getScene();

    const { position } = entities.getPositionData(engine.playerEntity)!;

    const img = await loadImage('entity/slime/slime');

    const coreMat = makeImageMaterial('slime.core', img, { position: [0, 16], size: [24, 12] }, scene);
    const leftEyeMat = makeImageMaterial('slime.leftEye', img, { position: [32, 0], size: [8, 4] }, scene);
    const rightEyeMat = makeImageMaterial('slime.rightEye', img, { position: [32, 2], size: [8, 4] }, scene);
    const mouthMat = makeImageMaterial('slime.mouth', img, { position: [32, 8], size: [4, 2] }, scene);
    const bodyMat = makeImageMaterial('slime.body', img, { position: [0, 0], size: [32, 16], alpha: 0.7 }, scene);

    const slimeIds = new Array(10).fill(0).map(() => {
        const body = makeBox('slime.body', bodyMat, { size: 0.8 }, scene);
        const core = makeBox('slime.core', coreMat, { size: 0.6 }, scene);
        const leftEye = makeBox('slime.leftEye', leftEyeMat, { size: 0.18, position: [0.2, 0.15, 0.25] }, scene);
        const rightEye = makeBox('slime.rightEye', rightEyeMat, { size: 0.18, position: [-0.2, 0.15, 0.25] }, scene);
        const mouth = makeBox('slime.mouth', mouthMat, { size: 0.1, position: [0, -0.18, 0.295] }, scene);
        [core, mouth, leftEye, rightEye].map((it) => {
            it.parent = body;
            engine.rendering.addMeshToScene(it);
        });

        const slimeId = entities.add(
            [position![0] + Math.random() * 10, position![1], position![2] + Math.random() * 10],
            0.8,
            0.8,
            body,
            [0, 0.4, 0],
            true,
            false
        );

        const heading = Math.PI * Math.random();
        body.rotation.y = heading;
        entities.addComponentAgain(slimeId, entities.names.movement, {
            jumping: false,
            running: false,
            jumpImpulse: 8,
            moveForce: 0.6,
            heading
        });

        const movement = entities.getMovement(slimeId);

        entities.addComponentAgain(slimeId, entities.names.collideTerrain, {
            callback: (impulse: number[]) => {
                if (impulse[0] || impulse[2]) {
                    movement.jumping = true;
                    engine.once('tick', () => (movement.jumping = false));
                }
            }
        });

        return slimeId;
    });

    setTimeout(() => {
        slimeIds.forEach((slimeId) => {
            const movement = entities.getMovement(slimeId);
            movement.running = true;
        });
        // setInterval(() => {
        //     slimeIds.forEach((slimeId) => {
        //         const movement = entities.getMovement(slimeId);
        //         movement.jumping = true;
        //     });
        //     engine.once('tick', () => {
        //         slimeIds.forEach((slimeId) => {
        //             const movement = entities.getMovement(slimeId);
        //             movement.jumping = false;
        //         });
        //     });
        // }, 2000);
        const { mesh: steve } = entities.getMeshData(engine.playerEntity);
        setInterval(() => {
            slimeIds.forEach((slimeId) => {
                const { mesh: slime } = entities.getMeshData(slimeId);
                const rotation = slime.rotation.clone();
                slime.lookAt(steve.position, 0.2 * Math.random());
                slime.rotation.x = rotation.x;
                slime.rotation.z = rotation.z;
                const movement = entities.getMovement(slimeId);
                movement.heading = slime.rotation.y;
            });
        }, 500);
    }, 2000);
}
