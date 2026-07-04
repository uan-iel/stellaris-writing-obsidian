import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 0,
    minify: 'esbuild',
    lib: {
      entry: resolve(__dirname, 'src/obsidian-main.tsx'),
      formats: ['cjs'],
      fileName: () => 'main.js',
      cssFileName: 'styles',
    },
    rollupOptions: {
      external: ['obsidian'],
      output: {
        inlineDynamicImports: true,
        assetFileNames: (assetInfo) =>
          assetInfo.name === 'style.css' ? 'styles.css' : 'assets/[name][extname]',
        exports: 'default',
      },
    },
  },
})
