import { defineConfig } from 'vite';
// import requireContext from './plugins/require-context';
// import requireTransform from './plugins/require';
import esbuildRequirePlugin from './plugins/esbuild-require';

export default defineConfig({
    base: process.env.NODE_ENV === 'production' ? './' : '',
    // plugins: [requireContext()],
    optimizeDeps: {
        esbuildOptions: {
            plugins: [esbuildRequirePlugin()]
        }
        // exclude: ['noa-engine'],
        // include: [
        //     'aabb-3d',
        //     'box-intersect',
        //     'ent-comp',
        //     'events',
        //     'fast-voxel-raycast',
        //     'game-inputs',
        //     'gl-vec3',
        //     'micro-game-shell',
        //     'ndarray',
        //     'voxel-aabb-sweep',
        //     'voxel-physics-engine',
        //     '@babylonjs/core'
        // ]
    },
    build: {
        outDir: './dist',
        emptyOutDir: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    engine: ['noa', '@babylonjs']
                }
            }
        }
    }
});
