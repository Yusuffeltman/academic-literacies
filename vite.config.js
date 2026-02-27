import { defineConfig } from 'vite';

export default defineConfig({
  // Use a relative base path so that Moodle's dynamic pluginfile URLs don't break asset loading
  base: '',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/database'],
        }
      }
    }
  }
});
