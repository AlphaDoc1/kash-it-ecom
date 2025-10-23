import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(), 
    // Only use lovable-tagger in development mode and ensure it doesn't affect favicon
    mode === "development" && componentTagger({
      // Disable any favicon interference
      exclude: ['favicon.ico', 'favicon.svg']
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Ensure favicon is properly handled
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  },
  // Ensure static assets are properly served
  publicDir: 'public'
}));
