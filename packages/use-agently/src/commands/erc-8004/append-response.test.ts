import { describe, expect, test } from "bun:test";
import { appendResponse } from "./append-response";

describe("append-response command validation", () => {
  test("rejects unknown chain ID without --rpc-url", () => {
    expect(() =>
      appendResponse({
        agentId: "1",
        clientAddress: "0x0000000000000000000000000000000000000001",
        feedbackIndex: "1",
        responseUri: "https://example.com/response.json",
        chainId: 999999,
      }),
    ).toThrow("Unknown chain ID 999999. Provide --rpc-url to use a custom chain.");
  });

  test("rejects invalid registry address", () => {
    expect(() =>
      appendResponse({
        agentId: "1",
        clientAddress: "0x0000000000000000000000000000000000000001",
        feedbackIndex: "1",
        responseUri: "https://example.com/response.json",
        chainId: 31337,
        registry: "not-an-address",
      }),
    ).toThrow("Invalid registry address: not-an-address");
  });

  test("dry-run completes without wallet interaction when --broadcast is not set", () => {
    expect(() =>
      appendResponse({
        agentId: "1",
        clientAddress: "0x0000000000000000000000000000000000000001",
        feedbackIndex: "1",
        responseUri: "https://example.com/response.json",
        chainId: 11155111,
      }),
    ).not.toThrow();
  });

  test("rejects invalid agent ID", () => {
    expect(() =>
      appendResponse({
        agentId: "-1",
        clientAddress: "0x0000000000000000000000000000000000000001",
        feedbackIndex: "1",
        chainId: 11155111,
      }),
    ).toThrow("Invalid agent ID");
  });

  test("rejects invalid client address", () => {
    expect(() =>
      appendResponse({
        agentId: "1",
        clientAddress: "not-an-address",
        feedbackIndex: "1",
        chainId: 11155111,
      }),
    ).toThrow("Invalid client address");
  });

  test("rejects invalid feedback index", () => {
    expect(() =>
      appendResponse({
        agentId: "1",
        clientAddress: "0x0000000000000000000000000000000000000001",
        feedbackIndex: "-1",
        chainId: 11155111,
      }),
    ).toThrow("Invalid feedback index");
  });

  test("dry-run with response URI and hash", () => {
    expect(() =>
      appendResponse({
        agentId: "1",
        clientAddress: "0x0000000000000000000000000000000000000001",
        feedbackIndex: "1",
        responseUri: "https://example.com/response.json",
        responseHash: "0x0000000000000000000000000000000000000000000000000000000000000001",
        chainId: 11155111,
      }),
    ).not.toThrow();
  });
});
