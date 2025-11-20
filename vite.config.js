import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

const repoBase = "/recon-editor/";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === "build" ? repoBase : "/",
  plugins: [react(), tailwindcss()],
}));
