import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Single-file build: JS, CSS, fonts and question data are inlined into dist/index.html,
// so the site works when opened directly from disk (file://). Videos stay as files in dist/videos.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: {
    assetsInlineLimit: 100_000_000,
  },
});
