import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mirrorstate from "vite-plugin-mirrorstate";

export default defineConfig({
  plugins: [react(), mirrorstate()],
  optimizeDeps: {
    exclude: ["react-mirrorstate"],
  },
});
