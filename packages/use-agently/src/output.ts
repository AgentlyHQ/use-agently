export type OutputFormat = "json" | "text";

export function resolveOutputFormat(optionValue: string | undefined, configValue: string | undefined): OutputFormat {
  const value = optionValue ?? configValue;
  if (value === "json" || value === "text") return value;
  return "text";
}

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}
