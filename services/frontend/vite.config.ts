import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    proxy: {
      "/api/auth": {
        target: "http://localhost:4001",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://localhost:4001",
        changeOrigin: true,
      },
      "/api/workspace": {
        target: "http://localhost:4002",
        changeOrigin: true,
      },
      "/api/project": {
        target: "http://localhost:4003",
        changeOrigin: true,
      },
      "/api/task": {
        target: "http://localhost:4004",
        changeOrigin: true,
      },
      "/api/notification": {
        target: "http://localhost:4005",
        changeOrigin: true,
      },
      "/api/workflow": {
        target: "http://localhost:4006",
        changeOrigin: true,
      },
      "/api/comms": {
        target: "http://localhost:4007",
        changeOrigin: true,
        ws: true,
      },
      "/socket.io": {
        target: "ws://localhost:4007",
        changeOrigin: true,
        ws: true,
      },
      "/api/files": {
        target: "http://localhost:4008",
        changeOrigin: true,
      },
      "/api/meeting": {
        target: "http://localhost:4009",
        changeOrigin: true,
      },
    },
  },
});
