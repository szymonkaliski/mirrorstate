import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mirrorstate from "vite-plugin-mirrorstate";

export default defineConfig({
  plugins: [react(), mirrorstate()],
  optimizeDeps: {
    exclude: ["react-mirrorstate"],
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
  },
  preview: {
    port: Number(process.env.PORT) || 4173,
    strictPort: false,
  },
});
