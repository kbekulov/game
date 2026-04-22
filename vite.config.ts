import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "es2020",
    sourcemap: true,
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        play: path.resolve(__dirname, "play.html")
      }
    }
  }
});
