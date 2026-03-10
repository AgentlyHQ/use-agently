import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/testing.ts"],
  format: "esm",
  dts: { eager: true },
  clean: true,
  outDir: "build",
  fixedExtension: false,
  deps: {
    neverBundle: ["localhost-aixyz", "testcontainers", /^x402-fl/],
  },
});
