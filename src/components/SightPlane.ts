import { Engine } from 'noa-engine';
import { Texture, MeshBuilder, Constants, Vector3, Color3, Scene } from '@babylonjs/core';

export default function (engine: Engine) {
    const { rendering, camera } = engine;
    const scene: Scene = rendering.getScene();

    scene.activeCamera!.fov = (80 * Math.PI) / 180;

    const crossHair = MeshBuilder.CreatePlane(
        'crosshair',
        {
            height: 0.035,
            width: 0.035
        },
        scene
    );

    const crossHairMat = rendering.makeStandardMaterial('crosshairMat');
    crossHairMat.diffuseTexture = new Texture('assets/textures2/block/crosshair.png', scene);
    crossHairMat.diffuseTexture.wrapU = Constants.TEXTURE_CLAMP_ADDRESSMODE;
    crossHairMat.diffuseTexture.wrapV = Constants.TEXTURE_CLAMP_ADDRESSMODE;
    crossHairMat.emissiveColor = new Color3(1, 1, 1);
    crossHairMat.diffuseTexture.hasAlpha = true;
    crossHairMat.freeze();
    crossHair.position = new Vector3(0, 0, 0.8);
    crossHair.renderingGroupId = 2;
    crossHair.parent = scene.activeCamera;
    crossHair.alwaysSelectAsActiveMesh = true;
    crossHair.material = crossHairMat;
    rendering.addMeshToScene(crossHair);

    engine.on('tick', () => {
        if (camera.zoomDistance === 0) {
            crossHair.isVisible = true;
        } else {
            crossHair.isVisible = false;
        }
    });

    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogEnabled = true;
    scene.fogDensity = 0.01;
    scene.fogColor = new Color3(0.9, 0.95, 1);
}
