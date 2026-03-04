import { afterEach, beforeEach, mock, spyOn } from "bun:test";
import { parse } from "yaml";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import {
  X402FacilitatorLocalContainer,
  type StartedX402FacilitatorLocalContainer,
  accounts,
} from "x402-fl/testcontainers";
import { AixyzTesting } from "localhost-aixyz/test";

export const TEST_PRIVATE_KEY = generatePrivateKey();
export const TEST_ADDRESS = privateKeyToAccount(TEST_PRIVATE_KEY).address;

export interface X402FacilitatorLocal {
  container: StartedX402FacilitatorLocalContainer;
  agent: AixyzTesting;
}

export interface X402FacilitatorLocalOptions {
  fundAmount?: string;
  fundAddress?: `0x${string}`;
  network?: string;
  payTo?: string;
}

export async function startX402FacilitatorLocal(options?: X402FacilitatorLocalOptions): Promise<X402FacilitatorLocal> {
  const container = await new X402FacilitatorLocalContainer().start();
  await container.fund((options?.fundAddress ?? TEST_ADDRESS) as `0x${string}`, options?.fundAmount ?? "100");
  const agent = new AixyzTesting();
  await agent.start({
    env: {
      X402_FACILITATOR_URL: container.getFacilitatorUrl(),
      X402_PAY_TO: options?.payTo ?? accounts.facilitator.address,
      X402_NETWORK: options?.network ?? "eip155:8453",
    },
  });
  return { container, agent };
}

export async function stopX402FacilitatorLocal(fixture: X402FacilitatorLocal): Promise<void> {
  await fixture.agent.stop();
  await fixture.container.stop();
}

export function testWalletConfig(rpcUrl?: string) {
  return {
    type: "evm-private-key" as const,
    privateKey: TEST_PRIVATE_KEY,
    address: TEST_ADDRESS,
    ...(rpcUrl ? { rpcUrl } : {}),
  };
}

export function testConfig() {
  return { wallet: testWalletConfig() };
}

/**
 * Capture console.log and console.error output during tests.
 * Call inside a `describe` block. Spies are set up in beforeEach and restored in afterEach.
 */
export function captureOutput() {
  let logSpy: ReturnType<typeof spyOn>;
  let errorSpy: ReturnType<typeof spyOn>;
  let writeSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    logSpy = spyOn(console, "log").mockImplementation(() => {});
    errorSpy = spyOn(console, "error").mockImplementation(() => {});
    writeSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    writeSpy.mockRestore();
  });

  return {
    /**
     * All text written to process.stdout.write (streamed output), concatenated.
     * Falls back to the first console.log call for non-streaming output.
     */
    get stdout(): string {
      const written = (writeSpy.mock.calls as [string | Uint8Array][])
        .map(([chunk]) => (typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk)))
        .join("");
      if (written) return written.replace(/\n+$/, "");
      return logSpy.mock.calls[0]?.[0] as string;
    },
    /** Raw stderr string from the first console.error call */
    get stderr(): string {
      return errorSpy.mock.calls[0]?.[0] as string;
    },
    /** Parse stdout as JSON */
    get json(): unknown {
      return JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    },
    /** Parse stdout as YAML */
    get yaml(): unknown {
      return parse(this.stdout);
    },
    get logSpy() {
      return logSpy;
    },
    get errorSpy() {
      return errorSpy;
    },
  };
}

/**
 * Mock `config.ts` with a static wallet config.
 * Accepts an optional getter so tests can swap the config dynamically.
 */
export function mockConfigModule(getConfig?: () => unknown) {
  const resolve = getConfig ?? (() => testConfig());
  mock.module("./config", () => ({
    getConfigOrThrow: async () => {
      const cfg = resolve();
      if (!cfg || !(cfg as any).wallet) throw new Error("No wallet configured. Run `use-agently init` first.");
      return cfg;
    },
    loadConfig: async () => resolve(),
    saveConfig: async () => {},
    backupConfig: async () => "",
  }));
}
