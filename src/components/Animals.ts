import { Engine } from 'noa-engine';
import { StandardMaterial, Scene, Texture, MeshBuilder, Color3, Vector4, Vector3, Mesh, Axis } from '@babylonjs/core';

const animalIds: { [id: string]: number } = {};

export default function (engine: Engine) {
    const { entities, rendering } = engine;

    const scene: Scene = rendering.getScene();

    const slimeTexture = new Texture(
        '/assets/textures2/entity/slime/slime.png',
        scene,
        true,
        false,
        Texture.NEAREST_SAMPLINGMODE
    );

    const faceUV = [
        new Vector4(0 / 8, 1 / 4, 1 / 8, 2 / 4),
        new Vector4(1 / 8, 1 / 4, 2 / 8, 2 / 4),
        new Vector4(2 / 8, 1 / 4, 3 / 8, 2 / 4),
        new Vector4(3 / 8, 1 / 4, 4 / 8, 2 / 4),
        new Vector4(1 / 8, 0 / 4, 2 / 8, 1 / 4),
        new Vector4(2 / 8, 0 / 4, 3 / 8, 1 / 4)
    ];

    const slimeMat = new StandardMaterial('slime', scene);
    slimeMat.diffuseTexture = slimeTexture;
    slimeMat.specularColor = Color3.Black();
    slimeMat.alpha = 0.8;

    const { position } = entities.getPositionData(engine.playerEntity)!;

    const slimeIds = new Array(1000).fill(0).map(() => {
        const slime = MeshBuilder.CreateBox(
            'slime',
            {
                width: 0.6,
                height: 0.6,
                depth: 0.6,
                faceUV,
                wrap: true
            },
            scene
        );

        slime.material = slimeMat;

        const slimeId = entities.add(
            [position![0] + Math.random() * 10, position![1], position![2] + Math.random() * 10],
            0.6,
            0.6,
            slime,
            [0, 0.3, 0],
            true,
            false
        );

        const heading = Math.PI * Math.random();
        slime.rotation.y = heading;
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

    return {
        id(name: string) {
            return animalIds[name];
        }
    };
}
