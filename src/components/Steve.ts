import { Texture, MeshBuilder, Vector3, Color3, StandardMaterial, Vector4, Axis, Space, Scene } from '@babylonjs/core';
import { Engine } from 'noa-engine';

export default function (engine: Engine) {
    const { playerEntity, entities, rendering, camera } = engine;

    const scene: Scene = rendering.getScene();

    const { height } = entities.getPositionData(playerEntity)!;

    // add a mesh to represent the player, and scale it, etc.
    const faceUV = new Array(6).fill(0).map((_, i) => {
        return new Vector4(i / 8, 0, (i + 1) / 8, 1);
    });

    const torsoMat = new StandardMaterial('steve.torso', scene);
    const torsoTexture = new Texture(
        '/assets/textures2/block/stevetorso.png',
        scene,
        true,
        false,
        Texture.NEAREST_SAMPLINGMODE
    );
    torsoMat.diffuseTexture = torsoTexture;
    torsoMat.specularColor = Color3.Black();
    const torso = MeshBuilder.CreateBox(
        'steve.torso',
        {
            width: 0.45,
            height: 0.675,
            depth: 0.225,
            faceUV
        },
        scene
    );
    torso.material = torsoMat;

    const headMat = new StandardMaterial('steve.head', scene);
    const headTexture = new Texture(
        '/assets/textures2/block/stevehead.png',
        scene,
        true,
        false,
        Texture.NEAREST_SAMPLINGMODE
    );
    headMat.diffuseTexture = headTexture;
    headMat.specularColor = Color3.Black();

    const head = MeshBuilder.CreateBox(
        'steve.head',
        {
            width: 0.45,
            height: 0.45,
            depth: 0.45,
            faceUV
        },
        scene
    );

    head.material = headMat;
    head.rotation.y = Math.PI;
    // if (scene.activeCamera) {
    //     scene.activeCamera.parent = head;
    // }
    // head.rotation.y = Math.PI
    // head.rotate(Axis.Y, Math.PI, Space.WORLD);

    const armMat = new StandardMaterial('steve.arm', scene);
    const armTexture = new Texture(
        '/assets/textures2/block/stevearm.png',
        scene,
        true,
        false,
        Texture.NEAREST_SAMPLINGMODE
    );
    armMat.diffuseTexture = armTexture;
    armMat.specularColor = Color3.Black();

    const leftArm = MeshBuilder.CreateBox(
        'steve.leftArm',
        {
            width: 0.225,
            height: 0.675,
            depth: 0.225,
            faceUV
        },
        scene
    );

    const rightArm = MeshBuilder.CreateBox(
        'steve.rightArm',
        {
            width: 0.225,
            height: 0.675,
            depth: 0.225,
            faceUV
        },
        scene
    );

    leftArm.material = armMat;
    rightArm.material = armMat;

    const legMat = new StandardMaterial('steve.leg', scene);
    const legTexture = new Texture(
        '/assets/textures2/block/steveleg.png',
        scene,
        true,
        false,
        Texture.NEAREST_SAMPLINGMODE
    );
    legMat.diffuseTexture = legTexture;
    legMat.specularColor = Color3.Black();
    const leftLeg = MeshBuilder.CreateBox(
        'steve.leftLeg',
        {
            width: 0.225,
            height: 0.675,
            depth: 0.225,
            faceUV
        },
        scene
    );

    const rightLeg = MeshBuilder.CreateBox(
        'steve.rightLeg',
        {
            width: 0.225,
            height: 0.675,
            depth: 0.225,
            faceUV
        },
        scene
    );

    leftLeg.material = legMat;
    rightLeg.material = legMat;

    torso.addChild(head).addChild(leftArm).addChild(rightArm).addChild(leftLeg).addChild(rightLeg);

    head.position = new Vector3(0, 0.5625, 0);
    leftArm.position = new Vector3(0.3375, 0, 0);
    rightArm.position = new Vector3(-0.3375, 0, 0);
    leftLeg.position = new Vector3(0.125, -0.5625, 0);
    rightLeg.position = new Vector3(-0.125, -0.5625, 0);

    // head.setPivotPoint(new Vector3(0, -0.3, 0));
    leftArm.setPivotPoint(new Vector3(0, 0.225, 0));
    rightArm.setPivotPoint(new Vector3(0, 0.225, 0));
    leftLeg.setPivotPoint(new Vector3(0, 0.3375, 0));
    rightLeg.setPivotPoint(new Vector3(0, 0.3375, 0));

    [head, leftArm, rightArm, leftLeg, rightLeg].map((it) => rendering.addMeshToScene(it));

    entities.addComponentAgain(playerEntity, entities.names.mesh, {
        mesh: torso,
        offset: [0, height / 2, 0],
        parts: {
            head,
            leftArm,
            rightArm,
            leftLeg,
            rightLeg
        }
    });

    const shadow = (entities as any).getState(playerEntity, entities.names.shadow)._mesh;

    let runningTick = 0;
    engine.on('tick', () => {
        torso.rotation.y = camera.heading;
        head.rotation.x = -camera.pitch;

        const movement = entities.getMovement(playerEntity);
        if (movement.running || movement.jumping) {
            runningTick += 0.3;

            const angle = runningTick % 360;
            const amplitude = 1.2;

            leftArm.rotation.x = Math.sin(angle) * amplitude * 1.2;
            rightArm.rotation.x = -Math.sin(angle) * amplitude * 1.2;
            leftLeg.rotation.x = -Math.sin(angle) * amplitude;
            rightLeg.rotation.x = Math.sin(angle) * amplitude;
        } else if (runningTick > 0) {
            runningTick = 0;
            leftArm.rotation.x = 0;
            rightArm.rotation.x = 0;
            leftLeg.rotation.x = 0;
            rightLeg.rotation.x = 0;
        }

        if (camera.zoomDistance === 0) {
            const steveVisible = camera.pitch < 0.58;
            [torso, leftArm, rightArm, leftLeg, rightLeg, shadow].map((it) => (it.isVisible = steveVisible));
        } else {
            [torso, leftArm, rightArm, leftLeg, rightLeg, shadow].map((it) => (it.isVisible = true));
        }
    });
}
