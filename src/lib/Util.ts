import {
    Scene,
    Texture,
    DynamicTexture,
    StandardMaterial,
    Color3,
    Material,
    Vector4,
    MeshBuilder,
    Vector3
} from '@babylonjs/core';

const images: { [name: string]: HTMLImageElement | true } = {};
export function loadImage(name: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        if (images[name] === true) {
            reject(name);
        } else if (images[name]) {
            resolve(images[name] as HTMLImageElement);
        }
        const img = new Image();
        img.src = `/assets/textures/${name}.png`;
        img.onload = () => {
            images[name] = img;
            resolve(img);
        };
        img.onerror = () => {
            images[name] = true;
            reject(name);
        };
    });
}

export function loadImages(...names: string[]): Promise<HTMLImageElement[]> {
    return Promise.all(names.map((it) => loadImage(it)));
}

export function clipImageTexture(
    img: HTMLImageElement,
    name: string,
    position: number[],
    size: number[],
    scene: Scene
) {
    const tex = new DynamicTexture(
        name,
        { width: size[0], height: size[1] },
        scene,
        false,
        Texture.NEAREST_SAMPLINGMODE
    );
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.drawImage(img, position[0], position[1], size[0], size[1], 0, 0, ctx.canvas.width, ctx.canvas.height);
    tex.update();
    return tex;
}

export function makeImageMaterial(
    name: string,
    img: HTMLImageElement,
    { position = [0, 0], size = [16, 16], alpha }: { position?: number[]; size?: number[]; alpha?: number },
    scene: Scene
) {
    const texture = clipImageTexture(img, name, position, size, scene);
    const mat = new StandardMaterial(name, scene);
    mat.diffuseTexture = texture;
    mat.specularColor = Color3.Black();
    if (alpha !== undefined) {
        mat.alpha = alpha;
    }
    return mat;
}

export function makeBox(
    name: string,
    mat: Material,
    options: {
        position?: number[];
        size?: number;
        width?: number;
        height?: number;
        depth?: number;
        pivot?: number[];
        rotation?: number[];
    },
    scene: Scene
) {
    let faceUV;

    const { position, size, width, height, depth, pivot, rotation } = options;
    if (width) {
        faceUV = [
            new Vector4(0 / 4, 0 / 3, 1 / 4, 1 / 2),
            new Vector4(1 / 4, 0 / 3, 2 / 4, 1 / 2),
            new Vector4(2 / 4, 0 / 3, 3 / 4, 1 / 2),
            new Vector4(3 / 4, 0 / 3, 4 / 4, 1 / 2),
            new Vector4(1 / 4, 1 / 2, 2 / 4, 2 / 2),
            new Vector4(2 / 4, 1 / 2, 3 / 4, 2 / 2)
        ];
    } else {
        faceUV = [
            new Vector4(0 / 4, 0 / 3, 1 / 4, 1 / 2),
            new Vector4(1 / 4, 0 / 3, 2 / 4, 1 / 2),
            new Vector4(2 / 4, 0 / 3, 3 / 4, 1 / 2),
            new Vector4(3 / 4, 0 / 3, 4 / 4, 1 / 2),
            new Vector4(1 / 4, 1 / 2, 2 / 4, 2 / 2),
            new Vector4(2 / 4, 1 / 2, 3 / 4, 2 / 2)
        ];
    }

    const box = MeshBuilder.CreateBox(
        name,
        {
            size,
            width,
            height,
            depth,
            faceUV,
            wrap: true
        },
        scene
    );
    box.material = mat;
    if (position) {
        box.position = Vector3.FromArray(position);
    }
    if (rotation) {
        box.rotation = Vector3.FromArray(rotation);
    }
    if (pivot) {
        box.setPivotPoint(Vector3.FromArray(pivot));
    }
    return box;
}
