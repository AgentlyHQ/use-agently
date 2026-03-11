import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  dts: { eager: true },
  clean: true,
  outDir: "build",
  fixedExtension: false,
});
