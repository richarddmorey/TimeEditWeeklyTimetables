import { defineConfig } from 'vite';

// Relative base ("./") means the built assets are referenced with relative
// paths, so the same dist/ output works whether it's served from the domain
// root or from a GitHub Pages project subpath (https://user.github.io/repo/)
// without needing to hardcode the repo name here.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
});
