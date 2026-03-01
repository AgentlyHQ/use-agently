export type OutputFormat = "json" | "text";

type PendingResult = {
  data: unknown;
  print: () => void;
  configOutput: string | undefined;
  exitCode: number;
};

let pending: PendingResult | null = null;

export function resolveOutputFormat(cliFlag: string | undefined, configValue: string | undefined): OutputFormat {
  const value = cliFlag ?? configValue;
  if (value === "json" || value === "text") return value;
  return "text";
}

export function emit<T>(data: T, textPrint: (data: T) => void, configOutput?: string, exitCode = 0): void {
  if (pending !== null) {
    throw new Error("emit() called twice before flush()");
  }
  pending = { data, print: () => textPrint(data), configOutput, exitCode };
}

export function flush(cliFlag: string | undefined): void {
  if (!pending) return;
  const format = resolveOutputFormat(cliFlag, pending.configOutput);
  if (format === "json") {
    console.log(JSON.stringify(pending.data, null, 2));
  } else {
    pending.print();
  }
  const code = pending.exitCode;
  pending = null;
  if (code !== 0) process.exit(code);
}
