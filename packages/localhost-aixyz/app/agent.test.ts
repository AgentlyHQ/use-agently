import { describe, expect, test } from "bun:test";
import agent, { echoModel } from "./agent";

describe("echoModel", () => {
  test("doGenerate echoes the last user message", async () => {
    const result = await echoModel.doGenerate({
      prompt: [{ role: "user", content: [{ type: "text", text: "hello" }] }],
    } as Parameters<typeof echoModel.doGenerate>[0]);

    expect(result.content).toEqual([{ type: "text", text: "hello" }]);
    expect(result.finishReason).toBe("stop");
  });

  test("doGenerate ignores system messages and returns empty string when no user message", async () => {
    const result = await echoModel.doGenerate({
      prompt: [{ role: "system", content: [{ type: "text", text: "system prompt" }] }],
    } as Parameters<typeof echoModel.doGenerate>[0]);

    expect(result.content).toEqual([{ type: "text", text: "" }]);
  });

  test("doGenerate echoes only the last user message when multiple exist", async () => {
    const result = await echoModel.doGenerate({
      prompt: [
        { role: "user", content: [{ type: "text", text: "first" }] },
        { role: "assistant", content: [{ type: "text", text: "first" }] },
        { role: "user", content: [{ type: "text", text: "last" }] },
      ],
    } as Parameters<typeof echoModel.doGenerate>[0]);

    expect(result.content).toEqual([{ type: "text", text: "last" }]);
  });
});

describe("agent", () => {
  test("generate echoes the prompt", async () => {
    const result = await agent.generate({ prompt: "hello world" });
    expect(result.text).toBe("hello world");
  });
});
