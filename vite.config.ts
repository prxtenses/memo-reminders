import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Configuração recomendada pelo Tauri: porta fixa e sem limpar a tela do terminal.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  clearScreen: false,
  server: { port: 1420, strictPort: true, watch: { ignored: ["**/src-tauri/**"] } },
  // App local: o tamanho do bundle não afeta o carregamento como num site.
  build: { target: "chrome110", chunkSizeWarningLimit: 2000 },
});
