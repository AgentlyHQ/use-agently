import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { captureOutput } from "../testing";

const mockReadFile = mock(async (_path: string, _encoding: unknown) => JSON.stringify({}));
const mockWriteFile = mock(async (_path: string, _data: string, _encoding?: unknown) => {});
const mockMkdir = mock(async () => {});
const mockLoadConfig = mock(async () => undefined as unknown);

mock.module("node:fs/promises", () => ({
  readFile: mockReadFile,
  writeFile: mockWriteFile,
  mkdir: mockMkdir,
  rename: mock(async () => {}),
}));

mock.module("../config", () => ({
  loadConfig: mockLoadConfig,
  saveConfig: async () => {},
  backupConfig: async () => "",
  getConfigOrThrow: async () => {
    throw new Error("No wallet configured.");
  },
}));

mock.module("node:child_process", () => ({
  execSync: mock(() => {}),
}));

const { cli } = await import("../cli");

const { CURRENT_VERSION, checkAutoUpdate } = await import("./update");
const updateModule = await import("./update");

const NPM_REGISTRY_URL = "https://registry.npmjs.org/use-agently/latest";

describe("update command", () => {
  const out = captureOutput();
  let fetchSpy: ReturnType<typeof spyOn>;
  let exitSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mockReadFile.mockClear();
    mockWriteFile.mockClear();
    mockMkdir.mockClear();
    mockReadFile.mockImplementation(async () => JSON.stringify({}));
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url === NPM_REGISTRY_URL) {
        return Promise.resolve(new Response(JSON.stringify({ version: "9.9.9" })));
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    exitSpy = spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    exitSpy.mockRestore();
  });

  test("text output - update available", async () => {
    await cli.parseAsync(["test", "use-agently", "update"]);

    expect(out.yaml).toEqual({
      current: CURRENT_VERSION,
      latest: "9.9.9",
      updated: true,
    });
  });

  test("json output - update available", async () => {
    await cli.parseAsync(["test", "use-agently", "-o", "json", "update"]);

    expect(out.json).toEqual({
      current: CURRENT_VERSION,
      latest: "9.9.9",
      updated: true,
    });
  });

  test("no update when already on latest", async () => {
    fetchSpy.mockImplementation((input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url === NPM_REGISTRY_URL) {
        return Promise.resolve(new Response(JSON.stringify({ version: CURRENT_VERSION })));
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });

    await cli.parseAsync(["test", "use-agently", "-o", "json", "update"]);

    expect(out.json).toEqual({
      current: CURRENT_VERSION,
      latest: CURRENT_VERSION,
      updated: false,
    });
  });

  test("saves lastUpdateCheck after update", async () => {
    await cli.parseAsync(["test", "use-agently", "update"]);

    expect(mockWriteFile).toHaveBeenCalledTimes(1);
    const written = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
    expect(typeof written.lastUpdateCheck).toStrictEqual("string");
  });

  test("exits with 1 on registry error", async () => {
    fetchSpy.mockImplementation((input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url === NPM_REGISTRY_URL) return Promise.resolve(new Response(null, { status: 503 }));
      throw new Error(`Unexpected fetch call: ${url}`);
    });

    try {
      await cli.parseAsync(["test", "use-agently", "update"]);
    } catch {
      // expected: process.exit throws
    }

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe("checkAutoUpdate", () => {
  let fetchSpy: ReturnType<typeof spyOn>;
  let devVersionSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mockReadFile.mockClear();
    mockWriteFile.mockClear();
    mockMkdir.mockClear();
    mockLoadConfig.mockImplementation(async () => undefined);
    mockReadFile.mockImplementation(async () => {
      throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    });
    fetchSpy = spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url === NPM_REGISTRY_URL) {
        return Promise.resolve(new Response(JSON.stringify({ version: "9.9.9" })));
      }
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    devVersionSpy = spyOn(updateModule, "isDevVersion").mockReturnValue(false);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    devVersionSpy.mockRestore();
  });

  test("skips update check when checked within 24h", async () => {
    mockReadFile.mockResolvedValue(JSON.stringify({ lastUpdateCheck: new Date().toISOString() }));

    await checkAutoUpdate();

    expect(mockWriteFile).not.toHaveBeenCalled();
  });

  test("runs update check when last check was >24h ago", async () => {
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    mockReadFile.mockResolvedValue(JSON.stringify({ lastUpdateCheck: yesterday }));

    await checkAutoUpdate();

    expect(mockWriteFile).toHaveBeenCalledTimes(1);
  });

  test("runs update check when no prior check recorded", async () => {
    await checkAutoUpdate();

    expect(mockWriteFile).toHaveBeenCalledTimes(1);
  });

  test("skips when USE_AGENTLY_AUTO_UPDATE is 0 in config", async () => {
    mockLoadConfig.mockImplementation(async () => ({ env: { USE_AGENTLY_AUTO_UPDATE: 0 } }));

    await checkAutoUpdate();

    expect(mockWriteFile).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("runs when USE_AGENTLY_AUTO_UPDATE is 1 in config", async () => {
    mockLoadConfig.mockImplementation(async () => ({ env: { USE_AGENTLY_AUTO_UPDATE: 1 } }));

    await checkAutoUpdate();

    expect(mockWriteFile).toHaveBeenCalledTimes(1);
  });

  test("logs warning but does not throw on errors", async () => {
    fetchSpy.mockImplementation((input) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url === NPM_REGISTRY_URL) return Promise.resolve(new Response(null, { status: 500 }));
      throw new Error(`Unexpected fetch call: ${url}`);
    });
    const warnSpy = spyOn(console, "warn").mockImplementation(() => {});

    await expect(checkAutoUpdate()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith("Auto-update failed:", expect.any(String));
    warnSpy.mockRestore();
  });
});
