import { Command } from "commander";
import { output } from "../output.js";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "HEAD" | "PATCH";

function resolveUriOption(options: { uri?: string; url?: string }, commandName: string): string {
  const value = options.uri || options.url;
  if (!value) {
    throw new Error(
      `Missing required option --uri for '${commandName}'.\nExpected a URL, e.g. --uri https://example.com/api`,
    );
  }
  return value;
}

async function httpRequest(
  method: HttpMethod,
  options: { uri?: string; url?: string; data?: string; header?: string[] },
  command: Command,
): Promise<void> {
  const url = resolveUriOption(options, `web ${method.toLowerCase()}`);

  const headers: Record<string, string> = {};
  if (options.data !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  for (const h of options.header ?? []) {
    const idx = h.indexOf(":");
    if (idx === -1)
      throw new Error(`Invalid header format: '${h}'\nExpected 'Name: Value', e.g. 'Authorization: Bearer token'`);
    headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
  }

  const init: RequestInit = { method, headers };
  if (options.data !== undefined) {
    init.body = options.data;
  }

  const response = await fetch(url, init);
  const contentType = response.headers.get("content-type") ?? "";
  let body: unknown;
  if (contentType.includes("application/json")) {
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
  } else {
    body = await response.text();
  }

  output(command, {
    status: response.status,
    statusText: response.statusText,
    body,
  });
}

function addCommonOptions(cmd: Command): Command {
  return cmd
    .option("--uri <value>", "Request URL")
    .option("--url <value>", "Request URL (alias for --uri)")
    .option(
      "-H, --header <value>",
      "HTTP header (can be used multiple times)",
      (v, prev: string[]) => [...prev, v],
      [] as string[],
    );
}

export const webCommand = new Command("web").description("Make HTTP requests").action(function () {
  (this as Command).outputHelp();
});

webCommand.addCommand(
  addCommonOptions(new Command("get").description("HTTP GET request"))
    .addHelpText("after", "\nExamples:\n  use-agently web get --uri https://example.com/api")
    .action(async (options, command) => httpRequest("GET", options, command)),
);

webCommand.addCommand(
  addCommonOptions(
    new Command("post").description("HTTP POST request").option("-d, --data <json>", "Request body (JSON string)"),
  )
    .addHelpText("after", '\nExamples:\n  use-agently web post --uri https://example.com/api -d \'{"key":"value"}\'')
    .action(async (options, command) => httpRequest("POST", options, command)),
);

webCommand.addCommand(
  addCommonOptions(
    new Command("put").description("HTTP PUT request").option("-d, --data <json>", "Request body (JSON string)"),
  )
    .addHelpText("after", '\nExamples:\n  use-agently web put --uri https://example.com/api -d \'{"key":"value"}\'')
    .action(async (options, command) => httpRequest("PUT", options, command)),
);

webCommand.addCommand(
  addCommonOptions(new Command("delete").description("HTTP DELETE request"))
    .addHelpText("after", "\nExamples:\n  use-agently web delete --uri https://example.com/api")
    .action(async (options, command) => httpRequest("DELETE", options, command)),
);

webCommand.addCommand(
  addCommonOptions(new Command("head").description("HTTP HEAD request"))
    .addHelpText("after", "\nExamples:\n  use-agently web head --uri https://example.com/api")
    .action(async (options, command) => httpRequest("HEAD", options, command)),
);

webCommand.addCommand(
  addCommonOptions(
    new Command("patch").description("HTTP PATCH request").option("-d, --data <json>", "Request body (JSON string)"),
  )
    .addHelpText("after", '\nExamples:\n  use-agently web patch --uri https://example.com/api -d \'{"key":"value"}\'')
    .action(async (options, command) => httpRequest("PATCH", options, command)),
);
