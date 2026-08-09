import { defineConfig } from 'vite';

export default defineConfig({
  // Use a relative base path so that Moodle's dynamic pluginfile URLs don't break asset loading
  base: '',
  build: {
    outDir: 'dist',
    assetsInlineLimit: 100000000, // Inline almost all assets
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Force a single JS and CSS file
        manualChunks: undefined,
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
      }
    }
  }
});
