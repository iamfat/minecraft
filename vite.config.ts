import { defineConfig } from 'vite';
import esbuildRequirePlugin from './plugins/esbuild-require';

export default defineConfig({
    base: process.env.NODE_ENV === 'production' ? './' : '',
    define: {
        global: 'window' // @jpweeks/typedarray-pool need this
    },
    optimizeDeps: {
        esbuildOptions: {
            plugins: [esbuildRequirePlugin()]   // noa used webpack require.context
        }
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
