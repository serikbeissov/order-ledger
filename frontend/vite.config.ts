import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Vite + React. В dev запросы к /api проксируются на Django (CLAUDE.md §6).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
      "/admin": { target: "http://localhost:8000", changeOrigin: true },
      "/static": { target: "http://localhost:8000", changeOrigin: true },
    },
  },
});
