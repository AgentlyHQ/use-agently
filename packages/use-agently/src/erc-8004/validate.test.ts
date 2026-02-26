import { describe, expect, test } from "bun:test";
import { CHAIN_ID, getReputationRegistryAddress } from "@aixyz/erc-8004";
import {
  validateFeedbackValue,
  validateValueDecimals,
  validateBytes32Hash,
  validateFeedbackIndex,
  validateAddress,
  validateAgentId,
} from "./validate";

describe("validateAgentId", () => {
  test("accepts 0", () => {
    expect(() => validateAgentId("0")).not.toThrow();
  });

  test("accepts positive integer", () => {
    expect(() => validateAgentId("42")).not.toThrow();
  });

  test("rejects negative", () => {
    expect(() => validateAgentId("-1")).toThrow("Invalid agent ID");
  });

  test("rejects empty string", () => {
    expect(() => validateAgentId("")).toThrow("Invalid agent ID");
  });

  test("rejects non-numeric string", () => {
    expect(() => validateAgentId("abc")).toThrow("Invalid agent ID");
  });
});

describe("validateFeedbackValue", () => {
  test("accepts 0", () => {
    expect(() => validateFeedbackValue("0")).not.toThrow();
  });

  test("accepts positive integer", () => {
    expect(() => validateFeedbackValue("100")).not.toThrow();
  });

  test("accepts negative integer", () => {
    expect(() => validateFeedbackValue("-50")).not.toThrow();
  });

  test("accepts large integer", () => {
    expect(() => validateFeedbackValue("999999999")).not.toThrow();
  });

  test("rejects empty string", () => {
    expect(() => validateFeedbackValue("")).toThrow("Invalid feedback value");
  });

  test("rejects whitespace-only string", () => {
    expect(() => validateFeedbackValue("  ")).toThrow("Invalid feedback value");
  });

  test("rejects float", () => {
    expect(() => validateFeedbackValue("1.5")).toThrow("Invalid feedback value");
  });

  test("rejects non-numeric string", () => {
    expect(() => validateFeedbackValue("abc")).toThrow("Invalid feedback value");
  });

  test("rejects Infinity", () => {
    expect(() => validateFeedbackValue("Infinity")).toThrow("Invalid feedback value");
  });

  test("rejects NaN", () => {
    expect(() => validateFeedbackValue("NaN")).toThrow("Invalid feedback value");
  });

  test("accepts 1e38", () => {
    expect(() => validateFeedbackValue("100000000000000000000000000000000000000")).not.toThrow();
  });

  test("accepts -1e38", () => {
    expect(() => validateFeedbackValue("-100000000000000000000000000000000000000")).not.toThrow();
  });

  test("rejects value exceeding 1e38", () => {
    expect(() => validateFeedbackValue("100000000000000000000000000000000000001")).toThrow(
      "Must be between -1e38 and 1e38",
    );
  });

  test("rejects value below -1e38", () => {
    expect(() => validateFeedbackValue("-100000000000000000000000000000000000001")).toThrow(
      "Must be between -1e38 and 1e38",
    );
  });
});

describe("validateValueDecimals", () => {
  test("accepts 0", () => {
    expect(() => validateValueDecimals("0")).not.toThrow();
  });

  test("accepts 18", () => {
    expect(() => validateValueDecimals("18")).not.toThrow();
  });

  test("rejects 19", () => {
    expect(() => validateValueDecimals("19")).toThrow("Invalid value decimals");
  });

  test("rejects negative", () => {
    expect(() => validateValueDecimals("-1")).toThrow("Invalid value decimals");
  });

  test("rejects float", () => {
    expect(() => validateValueDecimals("1.5")).toThrow("Invalid value decimals");
  });

  test("rejects empty string", () => {
    expect(() => validateValueDecimals("")).toThrow("Invalid value decimals");
  });
});

describe("validateFeedbackIndex", () => {
  test("rejects 0", () => {
    expect(() => validateFeedbackIndex("0")).toThrow("Invalid feedback index");
  });

  test("accepts 1", () => {
    expect(() => validateFeedbackIndex("1")).not.toThrow();
  });

  test("accepts positive integer", () => {
    expect(() => validateFeedbackIndex("42")).not.toThrow();
  });

  test("accepts large integer", () => {
    expect(() => validateFeedbackIndex("999999999")).not.toThrow();
  });

  test("rejects empty string", () => {
    expect(() => validateFeedbackIndex("")).toThrow("Invalid feedback index");
  });

  test("rejects whitespace-only string", () => {
    expect(() => validateFeedbackIndex("  ")).toThrow("Invalid feedback index");
  });

  test("rejects negative number", () => {
    expect(() => validateFeedbackIndex("-1")).toThrow("Invalid feedback index");
  });

  test("rejects float", () => {
    expect(() => validateFeedbackIndex("1.5")).toThrow("Invalid feedback index");
  });

  test("rejects non-numeric string", () => {
    expect(() => validateFeedbackIndex("abc")).toThrow("Invalid feedback index");
  });

  test("rejects Infinity", () => {
    expect(() => validateFeedbackIndex("Infinity")).toThrow("Invalid feedback index");
  });

  test("rejects NaN", () => {
    expect(() => validateFeedbackIndex("NaN")).toThrow("Invalid feedback index");
  });
});

describe("validateAddress", () => {
  test("accepts valid address", () => {
    expect(() => validateAddress("0x0000000000000000000000000000000000000001")).not.toThrow();
  });

  test("accepts checksummed address", () => {
    expect(() => validateAddress("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")).not.toThrow();
  });

  test("rejects invalid address", () => {
    expect(() => validateAddress("not-an-address")).toThrow("Invalid address");
  });

  test("rejects empty string", () => {
    expect(() => validateAddress("")).toThrow("Invalid address");
  });

  test("rejects short hex", () => {
    expect(() => validateAddress("0x1234")).toThrow("Invalid address");
  });

  test("uses custom field name in error message", () => {
    expect(() => validateAddress("bad", "registry address")).toThrow("Invalid registry address");
  });
});

describe("validateBytes32Hash", () => {
  test("accepts valid bytes32 hash", () => {
    expect(() =>
      validateBytes32Hash("0x0000000000000000000000000000000000000000000000000000000000000001", "feedback hash"),
    ).not.toThrow();
  });

  test("accepts all zeros", () => {
    expect(() =>
      validateBytes32Hash("0x0000000000000000000000000000000000000000000000000000000000000000", "feedback hash"),
    ).not.toThrow();
  });

  test("rejects too short", () => {
    expect(() => validateBytes32Hash("0x00", "feedback hash")).toThrow("Invalid feedback hash");
  });

  test("rejects missing 0x prefix", () => {
    expect(() =>
      validateBytes32Hash("0000000000000000000000000000000000000000000000000000000000000001", "feedback hash"),
    ).toThrow("Invalid feedback hash");
  });

  test("rejects non-hex characters", () => {
    expect(() =>
      validateBytes32Hash("0xGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG", "feedback hash"),
    ).toThrow("Invalid feedback hash");
  });
});

describe("reputation registry address", () => {
  test("reputation registry address is returned for sepolia", () => {
    const address = getReputationRegistryAddress(CHAIN_ID.SEPOLIA);
    expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  test("reputation registry address is returned for base-sepolia", () => {
    const address = getReputationRegistryAddress(CHAIN_ID.BASE_SEPOLIA);
    expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });
});
