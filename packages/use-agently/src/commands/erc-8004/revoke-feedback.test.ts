import { describe, expect, test } from "bun:test";
import { revokeFeedback } from "./revoke-feedback";

describe("revoke-feedback command validation", () => {
  test("rejects unknown chain ID without --rpc-url", () => {
    expect(() => revokeFeedback({ agentId: "1", feedbackIndex: "1", chainId: 999999 })).toThrow(
      "Unknown chain ID 999999. Provide --rpc-url to use a custom chain.",
    );
  });

  test("rejects invalid registry address", () => {
    expect(() =>
      revokeFeedback({
        agentId: "1",
        feedbackIndex: "1",
        chainId: 31337,
        registry: "not-an-address",
      }),
    ).toThrow("Invalid registry address: not-an-address");
  });

  test("dry-run completes without wallet interaction when --broadcast is not set", () => {
    expect(() => revokeFeedback({ agentId: "1", feedbackIndex: "1", chainId: 11155111 })).not.toThrow();
  });

  test("rejects invalid agent ID", () => {
    expect(() => revokeFeedback({ agentId: "-1", feedbackIndex: "1", chainId: 11155111 })).toThrow("Invalid agent ID");
  });

  test("rejects invalid feedback index", () => {
    expect(() => revokeFeedback({ agentId: "1", feedbackIndex: "-1", chainId: 11155111 })).toThrow(
      "Invalid feedback index",
    );
  });

  test("rejects non-numeric feedback index", () => {
    expect(() => revokeFeedback({ agentId: "1", feedbackIndex: "abc", chainId: 11155111 })).toThrow(
      "Invalid feedback index",
    );
  });
});
