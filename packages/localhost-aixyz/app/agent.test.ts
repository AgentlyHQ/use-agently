import { describe, expect, test } from "bun:test";
import agent from "./agent";

describe("agent", () => {
  test("generate returns static text", async () => {
    const result = await agent.generate({ prompt: "hello world" });
    expect(result.text).toBe("Hello from localhost-aixyz!");
  });
});
