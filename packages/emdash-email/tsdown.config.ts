import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    descriptor: "src/descriptor.ts",
    index: "src/index.ts",
    admin: "src/admin.tsx",
  },
  format: "esm",
  dts: true,
  external: ["react", "react-dom", "emdash", "@emdash-cms/admin"],
  outDir: "dist",
});
