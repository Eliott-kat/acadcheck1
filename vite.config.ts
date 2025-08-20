import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { viteStaticCopy } from "vite-plugin-static-copy";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 3000, // Changé de 8080 à 3000
  },
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
           src: "public/vendor/docx-preview.css",
          dest: "vendor"
        }
      ]
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));