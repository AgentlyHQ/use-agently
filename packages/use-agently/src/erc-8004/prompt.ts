import { input } from "@inquirer/prompts";
import {
  validateAgentId,
  validateFeedbackValue,
  validateValueDecimals,
  validateFeedbackIndex,
  validateAddress,
} from "./validate.js";

/** Wraps a throwing validate function into inquirer's `true | string` format. */
function inquirerValidate(fn: (v: string) => void): (value: string) => true | string {
  return (value) => {
    try {
      fn(value);
      return true;
    } catch (e) {
      return (e as Error).message;
    }
  };
}

export async function promptAgentId(): Promise<string> {
  return input({
    message: "Agent ID (token ID):",
    validate: inquirerValidate(validateAgentId),
  });
}

export async function promptFeedbackValue(): Promise<string> {
  return input({
    message: "Feedback value (signed integer):",
    validate: inquirerValidate(validateFeedbackValue),
  });
}

export async function promptValueDecimals(): Promise<string> {
  return input({
    message: "Value decimals (0-18):",
    default: "0",
    validate: inquirerValidate(validateValueDecimals),
  });
}

export async function promptFeedbackIndex(): Promise<string> {
  return input({
    message: "Feedback index (1-indexed):",
    validate: inquirerValidate(validateFeedbackIndex),
  });
}

export async function promptClientAddress(): Promise<string> {
  return input({
    message: "Client address (Ethereum address):",
    validate: inquirerValidate((v) => validateAddress(v, "client address")),
  });
}

export async function promptResponseUri(): Promise<string> {
  return input({
    message: "Response URI:",
    validate: (value) => {
      if (value.trim() === "") return "Response URI must not be empty";
      return true;
    },
  });
}

export async function promptRegistryAddress(): Promise<`0x${string}`> {
  const address = await input({
    message: "Registry contract address:",
    validate: inquirerValidate((v) => validateAddress(v, "registry address")),
  });
  return address as `0x${string}`;
}
