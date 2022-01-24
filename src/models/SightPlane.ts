import { Camera, FreeCamera, Vector3, Mesh, StandardMaterial, Color3 } from '@babylonjs/core';
import { World } from '.';

class SightPlane {
    constructor(world: World) {
        const scene = world.scene;

        const camera = new FreeCamera('sight-plane', new Vector3(0, 0, -50), scene);
        camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
        camera.layerMask = 0x20000000;
        scene.activeCameras!.push(camera);

        const meshes = [];

        const y = Mesh.CreateBox('y', 64, scene);
        y.scaling = new Vector3(0.1, 1, 1);
        y.position = new Vector3(0, 0, 0);
        meshes.push(y);

        const x = Mesh.CreateBox('x', 64, scene);
        x.scaling = new Vector3(1, 0.1, 1);
        x.position = new Vector3(0, 0, 0);
        meshes.push(x);

        const crossHair = Mesh.MergeMeshes(meshes);
        if (crossHair) {
            crossHair.name = 'cross-hair';
            crossHair.layerMask = 0x20000000;
            crossHair.freezeWorldMatrix();
            crossHair.isPickable = false;
            var mat = new StandardMaterial('cross-hair', scene);
            mat.checkReadyOnlyOnce = true;
            mat.emissiveColor = Color3.White();
            mat.alpha = 0.5;
            crossHair.material = mat;
        }
    }
}

export { SightPlane };
