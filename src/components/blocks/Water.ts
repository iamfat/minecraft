import { Color3, DynamicTexture, Mesh, MeshBuilder, Scene, Texture, Vector3 } from '@babylonjs/core';
import Engine from '../../Engine';

export default function (engine: Engine, blockIds: { [id: string]: number }) {
    const { registry, rendering } = engine;

    const scene: Scene = rendering.getScene();

    function makeWaterTexture() {
        const texture = new DynamicTexture('waterTexture', 16, scene, false, Texture.NEAREST_SAMPLINGMODE);
        texture.hasAlpha = true;
        texture.anisotropicFilteringLevel = 1;
        texture.wrapU = 1;
        texture.wrapV = 1;

        const ctx = texture.getContext();

        const imageDataBuf = new Uint8ClampedArray(1024);
        const imageData = new ImageData(imageDataBuf, 16, 16);

        let t = new Float32Array(256),
            i = new Float32Array(256),
            n = new Float32Array(256),
            r = new Float32Array(256);
        function update() {
            for (var e = 0; e < 16; e++)
                for (var a = 0; a < 16; a++) {
                    for (var s = 0, c = e - 1; c <= e + 1; c++) {
                        var u = 15 & c,
                            l = 15 & a;
                        s += t[u + 16 * l];
                    }
                    i[e + 16 * a] = s / 3.3 + 0.8 * n[e + 16 * a];
                }
            for (var e = 0; e < 16; e++)
                for (var a = 0; a < 16; a++)
                    (n[e + 16 * a] += 0.05 * r[e + 16 * a]),
                        n[e + 16 * a] < 0 && (n[e + 16 * a] = 0),
                        (r[e + 16 * a] -= 0.1),
                        Math.random() < 0.05 && (r[e + 16 * a] = 0.5);
            let h: Float32Array;
            h = i;
            i = t;
            t = h;
            for (var f = 0; f < 256; f++) {
                var s = t[f];
                s > 1 && (s = 1), s < 0 && (s = 0);
                var d = s * s,
                    p = 32 + 32 * d,
                    m = 50 + 64 * d,
                    g = 196 + 50 * d;
                (imageDataBuf[4 * f + 0] = p),
                    (imageDataBuf[4 * f + 1] = m),
                    (imageDataBuf[4 * f + 2] = 255),
                    (imageDataBuf[4 * f + 3] = g);
            }
        }

        function redraw() {
            update();
            ctx.clearRect(0, 0, 16, 16);
            ctx.putImageData(imageData, 0, 0);
            texture.update();
        }

        let odd = 0;
        engine.on('tick', () => {
            if (++odd % 2 != 0) {
                redraw();
            }
        });

        return texture;
    }

    function makeWaterMaterial() {
        const mat = rendering.makeStandardMaterial('waterMat');
        mat.diffuseTexture = makeWaterTexture();
        mat.alpha = 0.85;
        mat.useAlphaFromDiffuseTexture = true;
        mat.backFaceCulling = false;
        mat.disableLighting = true;
        mat.emissiveColor = new Color3(0.6, 0.6, 0.6);
        return mat;
    }

    function makeWaterMesh() {
        const plane = MeshBuilder.CreatePlane('plane1', { size: 1 }, scene);
        plane.rotation.x = 0.5 * -Math.PI;
        plane.position = new Vector3(0, 1 - 0.07, 0);
        const mesh = Mesh.MergeMeshes([plane])!;
        mesh.material = makeWaterMaterial();
        return mesh;
    }

    const waterMesh = makeWaterMesh();
    blockIds['water'] = registry.registerBlock(7, {
        material: 'water',
        opaque: false,
        solid: false,
        fluid: true,
        fluidDensity: 1,
        viscosity: 0.5
    });

    blockIds['water-hack'] = registry.registerBlock(41, {
        material: [null, null, null, null, null, null],
        opaque: false,
        solid: false,
        fluid: true,
        fluidDensity: 1,
        viscosity: 0.5,
        blockMesh: waterMesh
    });
}
