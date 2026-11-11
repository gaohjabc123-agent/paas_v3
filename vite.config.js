import { defineConfig } from 'vite';
const API = 'http://127.0.0.1:8787';
export default defineConfig({
  server: { port: 5173, strictPort: false, host: '127.0.0.1', proxy: { '/api': API, '/files': API } },
  build: { outDir: 'dist' },
});
