import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          mui: ["@mui/material", "@mui/icons-material"],
          emotion: ["@emotion/react", "@emotion/styled"],
        },
      },
    },
  },
  // Pages Functions run at /file/* only in the Cloudflare runtime; `vite dev`
  // alone 404s on those paths. Use `npx wrangler pages dev dist` for full local
  // parity. Uncomment to proxy /file to a locally-run functions server if needed.
  // server: {
  //   proxy: {
  //     "/file": "http://localhost:8788",
  //   },
  // },
});
