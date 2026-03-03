import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { captureOutput } from "../testing";

const mockLoadState = mock(async () => ({}));
const mockSaveState = mock(async (_state: unknown) => {});

mock.module("../state", () => ({
  loadState: mockLoadState,
  saveState: mockSaveState,
}));

mock.module("node:child_process", () => ({
  execSync: mock(() => {}),
}));

const { cli } = await import("../cli");
const { isNewerVersion, CURRENT_VERSION, checkAutoUpdate } = await import("./update");

describe("isNewerVersion", () => {
  test("returns true when latest is ahead", () => {
    expect(isNewerVersion("1.0.0", "2.0.0")).toBe(true);
    expect(isNewerVersion("1.0.0", "1.1.0")).toBe(true);
    expect(isNewerVersion("1.0.0", "1.0.1")).toBe(true);
  });

  test("returns false when same version", () => {
    expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
  });

  test("returns false when latest is behind", () => {
    expect(isNewerVersion("2.0.0", "1.0.0")).toBe(false);
    expect(isNewerVersion("1.1.0", "1.0.9")).toBe(false);
  });

  test("handles v-prefix", () => {
    expect(isNewerVersion("1.0.0", "v2.0.0")).toBe(true);
  });
});

describe("update command", () => {
  const out = captureOutput();
  let fetchSpy: ReturnType<typeof spyOn>;
  let exitSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    mockLoadState.mockClear();
    mockSaveState.mockClear();
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ version: "9.9.9" }),
    } as Response);
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
    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ version: CURRENT_VERSION }),
    } as Response);

    await cli.parseAsync(["test", "use-agently", "-o", "json", "update"]);

    expect(out.json).toEqual({
      current: CURRENT_VERSION,
      latest: CURRENT_VERSION,
      updated: false,
    });
  });

  test("saves lastUpdateCheck after update", async () => {
    await cli.parseAsync(["test", "use-agently", "update"]);

    expect(mockSaveState).toHaveBeenCalledTimes(1);
    const [saved] = mockSaveState.mock.calls[0] as [{ lastUpdateCheck?: string }];
    expect(typeof saved.lastUpdateCheck).toBe("string");
  });

  test("exits with 1 on registry error", async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 503 } as Response);

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

  beforeEach(() => {
    mockLoadState.mockClear();
    mockSaveState.mockClear();
    fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ version: "9.9.9" }),
    } as Response);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  test("skips update check when checked within 24h", async () => {
    mockLoadState.mockImplementation(async () => ({
      lastUpdateCheck: new Date().toISOString(),
    }));

    await checkAutoUpdate();

    expect(mockSaveState).not.toHaveBeenCalled();
  });

  test("runs update check when last check was >24h ago", async () => {
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    mockLoadState.mockImplementation(async () => ({ lastUpdateCheck: yesterday }));

    await checkAutoUpdate();

    expect(mockSaveState).toHaveBeenCalledTimes(1);
  });

  test("runs update check when no prior check recorded", async () => {
    mockLoadState.mockImplementation(async () => ({}));

    await checkAutoUpdate();

    expect(mockSaveState).toHaveBeenCalledTimes(1);
  });

  test("silently swallows errors", async () => {
    fetchSpy.mockResolvedValue({ ok: false, status: 500 } as Response);
    mockLoadState.mockImplementation(async () => ({}));

    await expect(checkAutoUpdate()).resolves.toBeUndefined();
  });
});
