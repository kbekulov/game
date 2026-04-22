import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    chunkSizeWarningLimit: 2400,
    emptyOutDir: true,
    outDir: "site",
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL("./app.html", import.meta.url))
      }
    }
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
