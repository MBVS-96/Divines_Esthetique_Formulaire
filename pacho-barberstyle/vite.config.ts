import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  define: {
    // Stamped into the demo banner so it is obvious, at a glance, whether the
    // page in front of you is the current build or a cached one.
    __BUILD_STAMP__: JSON.stringify(
      new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC",
    ),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
