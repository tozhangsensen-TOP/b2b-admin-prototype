import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages 项目站点部署在子路径 /b2b-admin-prototype/ 下
  base: "/b2b-admin-prototype/",
  plugins: [react()],
  server: {
    fs: {
      allow: [fileURLToPath(new URL("../..", import.meta.url))],
    },
  },
});
