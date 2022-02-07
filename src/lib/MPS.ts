import {
    Vector3,
    Color3,
    Scene,
    Color4,
    Mesh,
    Material,
    Texture,
    VertexData,
    StandardMaterial,
    BoundingInfo,
    Matrix,
    VertexBuffer
} from '@babylonjs/core';

/*
 *    particle data structure
 */

class ParticleData {
    position = Vector3.Zero();
    velocity = Vector3.Zero();
    size = 1.0;
    age = 0.0;
    lifetime = 1.0; // seconds
}

/*
 *    Over-writeable user functions
 */

function initParticle(pdata: ParticleData) {
    pdata.position.copyFromFloats(0, 0, 0);
    pdata.velocity.x = 5 * (Math.random() - 0.5);
    pdata.velocity.y = 5 * (Math.random() * 0.5) + 2;
    pdata.velocity.z = 5 * (Math.random() - 0.5);
    pdata.size = 1 * Math.random();
    pdata.age = 0;
    pdata.lifetime = 2;
}

class MPS {
    capacity: number;
    rate: number;
    mesh: Mesh | null;
    material: StandardMaterial | null;
    texture: Texture | null;
    gravity: number;
    friction: number;
    fps: number;
    disposeOnEmpty: boolean;
    stopOnEmpty: boolean;

    onDispose?: () => void;
    onParticleUpdate?: (data: Float32Array, ix: number) => void;
    curriedAnimate?: () => void;
    initParticle?: (p: ParticleData) => void;

    private _scene?: Scene;
    private _alive: number;
    private _data?: Float32Array;
    private _dummyParticle?: ParticleData;
    private _color0?: Color4;
    private _color1?: Color4;
    private _updateColors: boolean;
    private _size0: number;
    private _size1: number;
    private _positions: number[];
    private _colors: number[];
    private _playing: boolean;
    private _disposed: boolean;
    private _lastPos: Vector3;
    private _startingThisFrame = false;
    private _toEmit = 0;
    private _createdOwnMaterial = false;
    private _needsColorUpdate = true;

    constructor(capacity: number, rate: number, scene: Scene, startColor: Color4, uRange: number[], vRange: number[]) {
        // defaults
        if (!capacity) capacity = 100;
        if (isNaN(rate)) rate = 0;
        if (!scene) throw 'Invalid scene passed to mesh-particle-system';
        startColor = startColor || new Color4(1, 1, 1, 1);
        uRange = uRange || [+0, +1];
        vRange = vRange || [+0, +1];

        // public
        this.capacity = capacity;
        this.rate = rate;
        this.mesh = new Mesh('MPS-mesh', scene);
        this.material = null;
        this.texture = null;
        this.gravity = -1;
        this.friction = 1;
        this.fps = 60;
        this.disposeOnEmpty = false;
        this.stopOnEmpty = false;
        // this.onDispose = null;
        this.onParticleUpdate = () => {};

        // internal
        this._scene = scene;
        this._alive = 0;
        this._data = new Float32Array(capacity * NUM_PARAMS); // pos*3, vel*3, size, age, lifetime
        this._dummyParticle = new ParticleData();
        this._color0 = startColor.clone();
        this._color1 = startColor.clone();
        this._updateColors = false;
        this._size0 = 1.0;
        this._size1 = 1.0;
        this._positions = [];
        this._colors = [];
        this._playing = false;
        this._disposed = false;
        this._lastPos = Vector3.Zero();
        this._startingThisFrame = false;
        this._toEmit = 0;
        this._createdOwnMaterial = false;
        this._needsColorUpdate = true;

        // init mesh and vertex data
        var positions = this._positions;
        var colors = this._colors;
        var indices = [];
        var uvs = [];
        var baseUVs = [uRange[0], vRange[1], uRange[1], vRange[1], uRange[1], vRange[0], uRange[0], vRange[0]];
        // quads : 2 triangles per particle
        for (let p = 0; p < capacity; p++) {
            positions.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
            indices.push(p * 4, p * 4 + 1, p * 4 + 2);
            indices.push(p * 4, p * 4 + 2, p * 4 + 3);
            // uvs.push(0, 1, 1, 1, 1, 0, 0, 0)
            for (let j = 0; j < 8; j++) uvs.push(baseUVs[j]);
            for (let k = 0; k < 4; k++) {
                colors.push(startColor.r, startColor.g, startColor.b, startColor.a);
            }
        }
        var vertexData = new VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.uvs = uvs;
        vertexData.colors = colors;

        vertexData.applyToMesh(this.mesh, true);

        // configurable functions
        this.initParticle = initParticle;

        // curried animate function
        this.curriedAnimate = () => {
            this.animate(1 / this.fps);
        };

        // debugging..
        // this.mesh.showBoundingBox = true
    }

    /*
     *
     *    API
     *
     */

    start() {
        if (this._playing) return;
        if (this._disposed) throw new Error('Already disposed');
        this._scene!.registerBeforeRender(this.curriedAnimate!);
        this.recalculateBounds();
        this._playing = true;
        this._startingThisFrame = true;
    }

    stop() {
        if (!this._playing) return;
        this._scene!.unregisterBeforeRender(this.curriedAnimate!);
        this._playing = false;
    }

    setTexture(texture: Texture, material?: StandardMaterial) {
        if (material) {
            // material is optional - if handed in, store and use
            if (this.material && this._createdOwnMaterial) {
                this.material.dispose(false, false);
            }
            this.material = material;
            this._createdOwnMaterial = false;
        } else if (!this.material) {
            // no material handed in - create if needed
            const mat = new StandardMaterial('MPS-mat', this._scene!);
            mat.specularColor = Color3.Black();
            mat.checkReadyOnlyOnce = true;
            this.material = mat;
            this._createdOwnMaterial = true;
        }
        // apply texture to material
        this.mesh!.material = this.material;
        this.texture = texture;
        this._needsColorUpdate = true;
    }

    setAlphaRange(from: number, to: number) {
        this._color0!.a = from;
        this._color1!.a = to;
        this._needsColorUpdate = true;
    }

    setColorRange(from: Color4, to: Color4) {
        this._color0!.r = from.r;
        this._color0!.g = from.g;
        this._color0!.b = from.b;
        this._color1!.r = to.r;
        this._color1!.g = to.g;
        this._color1!.b = to.b;
        this._needsColorUpdate = true;
    }

    setSizeRange(from: number, to: number) {
        this._size0 = from;
        this._size1 = to;
    }

    setMeshPosition(x: number, y: number, z: number) {
        var dx = x - this.mesh!.position.x;
        var dy = y - this.mesh!.position.y;
        var dz = z - this.mesh!.position.z;
        this.rebaseParticlePositions(dx, dy, dz);
        this.mesh!.position.copyFromFloats(x, y, z);
    }

    emit(count: number) {
        this.start();
        this._toEmit += count;
    }

    dispose() {
        if (this.onDispose) this.onDispose();
        this.disposeMPS();
    }

    /*
     *    animate all the particles!
     */

    animate(dt: number) {
        profile_hook('start');

        if (dt > 0.1) dt = 0.1;
        if (this._needsColorUpdate) this.updateColorSettings();
        profile_hook('init');

        // add/update/remove particles
        this.spawnParticles(this.rate * dt);
        this.updateAndRecycle(dt);
        profile_hook('update');

        // write new position/color data
        this.updatePositionsData();
        profile_hook('positions');

        if (this._updateColors) this.updateColorsArray();
        // var t = 12 + performance.now()
        // while(performance.now()<t) {}
        profile_hook('colors');

        // only draw active mesh positions
        this.mesh!.subMeshes[0].indexCount = this._alive * 6;

        // possibly stop/dispose if no rate and no living particles
        if (this._alive === 0 && this.rate === 0) {
            if (this.disposeOnEmpty) this.dispose();
            else if (this.stopOnEmpty) this.stop();
        }
        profile_hook('end');
    }

    private recalculateBounds() {
        const system = this;
        // toooootal hack.
        var reps = 30;
        var p = system._dummyParticle!;
        var s = 0,
            min = new Vector3(Infinity, Infinity, Infinity),
            max = new Vector3(-Infinity, -Infinity, -Infinity);
        var halfg = system.gravity / 2;
        for (var i = 0; i < reps; ++i) {
            system.initParticle!(p);
            updateMinMax(min, max, p.position.x, p.position.y, p.position.z);
            // x1 = x0 + v*t + 1/2*a*t^2
            var t = p.lifetime;
            var x = p.position.x + t * p.velocity.x;
            var y = p.position.y + t * p.velocity.y + t * t * halfg;
            var z = p.position.z + t * p.velocity.z;
            updateMinMax(min, max, x, y, z);
            s = Math.max(s, p.size);
        }
        min.subtractFromFloatsToRef(s, s, s, min);
        max.subtractFromFloatsToRef(-s, -s, -s, max); // no addFromFloats, for some reason
        system.mesh!.setBoundingInfo(new BoundingInfo(min, max));
    }

    /*
     *
     *    Internals
     *
     */

    // set mesh/mat properties based on color/alpha parameters
    private updateColorSettings() {
        const sys = this;
        sys._needsColorUpdate = false;
        var c0 = sys._color0!;
        var c1 = sys._color1!;
        var doAlpha = !(equal(c0.a, 1) && equal(c0.a, c1.a));
        var doColor = !(equal(c0.r, c1.r) && equal(c0.g, c1.g) && equal(c0.b, c1.b));

        sys._updateColors = doAlpha || doColor;
        sys.mesh!.hasVertexAlpha = doAlpha;

        if (!sys.material) return;

        if (doColor || doAlpha) {
            sys.material.diffuseTexture = null;
            sys.material.ambientTexture = sys.texture;
            sys.material.opacityTexture = sys.texture;
            sys.material.diffuseColor = Color3.White();
            sys.material.useAlphaFromDiffuseTexture = true;
            if (sys.texture) sys.texture.hasAlpha = false;
        } else {
            sys.material.diffuseTexture = sys.texture;
            sys.material.ambientTexture = null;
            sys.material.opacityTexture = null;
            sys.material.diffuseColor = new Color3(c0.r, c0.g, c0.b);
            sys.material.useAlphaFromDiffuseTexture = false;
            if (sys.texture) sys.texture.hasAlpha = true;
        }
    }

    private addNewParticle() {
        const sys = this;
        // pass dummy data structure to user-definable init fcn
        var part = sys._dummyParticle!;
        sys.initParticle!(part);
        // copy particle data into internal Float32Array
        var data = sys._data!;
        var ix = sys._alive * NUM_PARAMS;
        data[ix] = part.position.x;
        data[ix + 1] = part.position.y;
        data[ix + 2] = part.position.z;
        data[ix + 3] = part.velocity.x;
        data[ix + 4] = part.velocity.y;
        data[ix + 5] = part.velocity.z;
        data[ix + 6] = part.size;
        data[ix + 7] = part.age;
        data[ix + 8] = part.lifetime;
        sys._alive += 1;
    }

    private removeParticle(n: number) {
        const sys = this;
        // copy particle data from last live location to removed location
        var data = sys._data!;
        var from = (sys._alive - 1) * NUM_PARAMS;
        var to = n * NUM_PARAMS;
        for (var i = 0; i < NUM_PARAMS; ++i) {
            data[to + i] = data[from + i];
        }
        sys._alive -= 1;
    }

    private spawnParticles(count: number) {
        const system = this;
        system._toEmit += count;
        var toAdd = Math.floor(system._toEmit);
        system._toEmit -= toAdd;
        var ct = system._alive + toAdd;
        if (ct > system.capacity) ct = system.capacity;
        while (system._alive < ct) {
            system.addNewParticle();
        }
    }

    private updateAndRecycle(_dt: number) {
        const system = this;
        // update particles and remove any that pass recycle check
        var dt = +_dt;
        var grav = +system.gravity * dt;
        var fric = +system.friction;
        var data = system._data!;
        var updateFn = system.onParticleUpdate;
        var max = system._alive * NUM_PARAMS;
        for (var ix = 0; ix < max; ix += NUM_PARAMS) {
            data[ix + 4] += grav; // vel.y += g * dt
            data[ix + 3] *= fric; // vel *= friction*dt
            data[ix + 4] *= fric;
            data[ix + 5] *= fric;
            data[ix] += data[ix + 3] * dt; // pos += vel * dt
            data[ix + 1] += data[ix + 4] * dt;
            data[ix + 2] += data[ix + 5] * dt;
            data[ix + 7] += dt; // age += dt
            updateFn!(data, ix); // client-specified update function
            if (data[ix + 7] > data[ix + 8]) {
                // if (age > lifetime)..
                system.removeParticle((ix / NUM_PARAMS) | 0);
                ix -= NUM_PARAMS;
                max = system._alive * NUM_PARAMS;
            }
        }
    }

    // if mesh system has moved since last frame, adjust particles to compensate

    private rebaseParticlePositions(dx: number, dy: number, dz: number) {
        const system = this;
        system._lastPos.copyFrom(system.mesh!.position);
        if (Math.abs(dx) + Math.abs(dy) + Math.abs(dz) < 0.001) return;

        var data = system._data!;
        var max = system._alive * NUM_PARAMS;
        for (var di = 0; di < max; di += NUM_PARAMS) {
            data[di] -= dx;
            data[di + 1] -= dy;
            data[di + 2] -= dz;
        }
    }

    private updatePositionsData() {
        const system = this;
        var positions = system._positions;
        var data = system._data!;
        var cam = system._scene!.activeCamera;

        // prepare transform
        var baseMatrix = cachedMatrix1;
        Matrix.IdentityToRef(baseMatrix);
        Matrix.LookAtLHToRef(
            cam!.globalPosition, // eye
            system.mesh!.position, // target
            Vector3.Up(),
            baseMatrix
        );
        baseMatrix.m[12] = baseMatrix.m[13] = baseMatrix.m[14] = 0;

        var mat = cachedMatrix2;
        baseMatrix.invertToRef(mat);

        var m = mat.m;

        var s0 = system._size0;
        var ds = system._size1 - s0;

        var idx = 0;
        var max = system._alive * NUM_PARAMS;
        for (var di = 0; di < max; di += NUM_PARAMS) {
            var size = (data[di + 6] * (s0 + (ds * data[di + 7]) / data[di + 8])) / 2;

            for (var pt = 0; pt < 4; pt++) {
                var vx = size * vxSign[pt];
                var vy = size * vySign[pt];

                // following is unrolled version of Vector3.TransformCoordinatesToRef
                // minus the bits zeroed out due to having no z coord

                var w = vx * m[3] + vy * m[7] + m[15];
                positions[idx] = data[di] + (vx * m[0] + vy * m[4]) / w;
                positions[idx + 1] = data[di + 1] + (vx * m[1] + vy * m[5]) / w;
                positions[idx + 2] = data[di + 2] + (vx * m[2] + vy * m[6]) / w;

                idx += 3;
            }
        }

        (system.mesh as Mesh).updateVerticesData(VertexBuffer.PositionKind, positions, false, false);
    }

    private updateColorsArray() {
        const system = this;
        var alive = system._alive;
        var data = system._data!;
        var colors = system._colors;
        const c0 = system._color0!;
        const c1 = system._color1!;
        var r0 = c0.r;
        var g0 = c0.g;
        var b0 = c0.b;
        var a0 = c0.a;
        var dr = c1.r - r0;
        var dg = c1.g - g0;
        var db = c1.b - b0;
        var da = c1.a - a0;

        var di = 0;
        var idx = 0;
        for (var i = 0; i < alive; i++) {
            // scale alpha from startAlpha to endAlpha by (age/lifespan)
            var scale = data[di + 7] / data[di + 8];

            var r = r0 + dr * scale;
            var g = g0 + dg * scale;
            var b = b0 + db * scale;
            var a = a0 + da * scale;

            for (var pt = 0; pt < 4; pt++) {
                colors[idx] = r;
                colors[idx + 1] = g;
                colors[idx + 2] = b;
                colors[idx + 3] = a;
                idx += 4;
            }

            di += NUM_PARAMS;
        }

        system.mesh!.updateVerticesData(VertexBuffer.ColorKind, colors, false, false);
    }

    // dispose function

    private disposeMPS() {
        const system = this;
        system.stop();
        if (system.material) {
            if (system._createdOwnMaterial) {
                system.material.ambientTexture = null;
                system.material.opacityTexture = null;
                system.material.diffuseTexture = null;
                system.material.dispose(false, false);
            }
            system.material = null;
        }

        if (system.mesh) {
            system.mesh.geometry?.dispose();
            system.mesh.dispose();
            system.mesh = null;
        }

        system.texture = null;
        // system.curriedAnimate = null;
        system.initParticle = undefined;
        system._scene = undefined;
        system._dummyParticle = undefined;
        system._color0 = undefined;
        system._color1 = undefined;
        system._data = undefined;
        system._positions.length = 0;
        system._colors.length = 0;
        system._positions = [];
        system._colors = [];
        system._disposed = true;
    }
}

const NUM_PARAMS = 9; // stored floats per particle

var cachedMatrix1 = Matrix.Identity();
var cachedMatrix2 = Matrix.Identity();
var vxSign = [-1, 1, 1, -1];
var vySign = [-1, -1, 1, 1];

function equal(a: number, b: number) {
    return Math.abs(a - b) < 1e-5;
}

function updateMinMax(min: Vector3, max: Vector3, x: number, y: number, z: number) {
    if (x < min.x) {
        min.x = x;
    } else if (x > max.x) {
        max.x = x;
    }
    if (y < min.y) {
        min.y = y;
    } else if (y > max.y) {
        max.y = y;
    }
    if (z < min.z) {
        min.z = z;
    } else if (z > max.z) {
        max.z = z;
    }
}

/*
 *  hook function that client can specify for profiling
 */

const profile_hook = (function () {
    if (window && window['MPS_profile_hook']) return window['MPS_profile_hook'];
    return function () {};
})();

export { MPS, ParticleData };
export default MPS;
