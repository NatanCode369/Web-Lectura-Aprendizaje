import { defineConfig } from "vite";
import { globSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const htmlEntries = Object.fromEntries(
  globSync(["index.html", "src/**/*.html"], {
    cwd: projectRoot,
    absolute: true,
  }).map((file) => {
    const relativePath = relative(projectRoot, file).split(sep).join("/");
    const entryName = relativePath.replace(/\.html$/, "");
    return [entryName, file];
  }),
);

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(projectRoot, "index.html"),
        ...htmlEntries,
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});