import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'

// Dev (`vite`) serves the demo playground at index.html → demo/main.ts.
// Build (`vite build`) produces the library (ES + CJS) with bundled .d.ts.
export default defineConfig({
  plugins: [
    vue(),
    dts({
      include: ['src'],
      exclude: ['src/**/__tests__/**'],
      rollupTypes: true,
      // Type-only entry so the bundled declaration lands at dist/index.d.ts
      tsconfigPath: './tsconfig.json',
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'LivelineVue',
      formats: ['es', 'cjs'],
      fileName: format => (format === 'es' ? 'liveline-vue.js' : 'liveline-vue.cjs'),
    },
    rollupOptions: {
      // Vue is a peer dependency — never bundle it into the lib.
      external: ['vue'],
      output: {
        globals: { vue: 'Vue' },
      },
    },
  },
})
