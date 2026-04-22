import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    chunkSizeWarningLimit: 2400
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  server: {
    host: "0.0.0.0",
    port: 4173
  }
});
