import { defineConfig } from "tsdown";
import pkg from "./package.json";

export default defineConfig({
  entry: [
    "index.ts",
    "client.ts",
    "a2a.ts",
    "mcp.ts",
    "agently.ts",
    "balance.ts",
    "config.ts",
    "wallets/wallet.ts",
    "wallets/evm-private-key.ts",
    "utils/chain.ts",
    "utils/transaction.ts",
    "testing.ts",
  ],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  outDir: "dist",
  splitting: false,
  define: {
    __SDK_VERSION__: JSON.stringify(pkg.version),
  },
  external: [...Object.keys(pkg.dependencies), ...Object.keys(pkg.devDependencies)],
});
