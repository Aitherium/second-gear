import { defineConfig } from "vite";
// relative base: the build runs from an itch.io HTML5 zip or GitHub Pages subpath unchanged
export default defineConfig({ base: "./", build: { target: "es2022", chunkSizeWarningLimit: 4000 } });
