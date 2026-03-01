export type OutputFormat = "json" | "text";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Printer = (data: any) => void;

type PendingResult = {
  data: unknown;
  configOutput: string | undefined;
  exitCode: number;
};

let pending: PendingResult | null = null;

export function resolveOutputFormat(cliFlag: string | undefined, configValue: string | undefined): OutputFormat {
  const value = cliFlag ?? configValue;
  if (value === "json" || value === "text") return value;
  return "text";
}

export function store<T>(data: T, configOutput?: string, exitCode = 0): T {
  if (pending !== null) {
    throw new Error("store() called twice before flush()");
  }
  pending = { data, configOutput, exitCode };
  return data;
}

export function flush(printer: Printer | undefined, cliFlag: string | undefined): void {
  if (!pending) return;
  const format = resolveOutputFormat(cliFlag, pending.configOutput);
  if (format === "json") {
    console.log(JSON.stringify(pending.data, null, 2));
  } else {
    printer?.(pending.data);
  }
  const code = pending.exitCode;
  pending = null;
  if (code !== 0) process.exit(code);
}
