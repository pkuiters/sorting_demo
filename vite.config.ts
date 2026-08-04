import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
});
