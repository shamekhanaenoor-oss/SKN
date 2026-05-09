import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "node:path";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: {
        "react-router-dom": path.resolve(__dirname, "src/lib/router-shim.tsx"),
      },
    },
  },
});
