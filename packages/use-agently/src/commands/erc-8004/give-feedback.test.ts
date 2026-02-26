import { describe, expect, test } from "bun:test";
import { giveFeedback } from "./give-feedback";

describe("give-feedback command validation", () => {
  test("rejects unknown chain ID without --rpc-url", () => {
    expect(() => giveFeedback({ agentId: "1", value: "100", valueDecimals: "0", chainId: 999999 })).toThrow(
      "Unknown chain ID 999999. Provide --rpc-url to use a custom chain.",
    );
  });

  test("rejects invalid registry address", () => {
    expect(() =>
      giveFeedback({
        agentId: "1",
        value: "100",
        valueDecimals: "0",
        chainId: 31337,
        registry: "not-an-address",
      }),
    ).toThrow("Invalid registry address: not-an-address");
  });

  test("dry-run completes without wallet interaction when --broadcast is not set", () => {
    expect(() => giveFeedback({ agentId: "1", value: "100", valueDecimals: "0", chainId: 11155111 })).not.toThrow();
  });

  test("rejects invalid agent ID", () => {
    expect(() => giveFeedback({ agentId: "-1", value: "100", chainId: 11155111 })).toThrow("Invalid agent ID");
  });

  test("rejects invalid feedback value", () => {
    expect(() => giveFeedback({ agentId: "1", value: "abc", chainId: 11155111 })).toThrow("Invalid feedback value");
  });

  test("rejects invalid value decimals", () => {
    expect(() => giveFeedback({ agentId: "1", value: "100", valueDecimals: "256", chainId: 11155111 })).toThrow(
      "Invalid value decimals",
    );
  });

  test("dry-run with all optional fields", () => {
    expect(() =>
      giveFeedback({
        agentId: "1",
        value: "-50",
        valueDecimals: "18",
        tag1: "quality",
        tag2: "speed",
        endpoint: "/api/chat",
        feedbackUri: "https://example.com/feedback.json",
        feedbackHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
        chainId: 11155111,
      }),
    ).not.toThrow();
  });
});
