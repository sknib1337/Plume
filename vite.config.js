import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev, the React app runs on Vite (5173) and the API proxy runs on Express
// (3001). Anything hitting /api is forwarded to Express so the browser never
// talks to Anthropic directly and never sees the API key.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
