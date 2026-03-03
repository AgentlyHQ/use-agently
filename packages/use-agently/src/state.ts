import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

export interface State {
  lastUpdateCheck?: string;
}

function getStateDir(): string {
  return join(homedir(), ".use-agently");
}

function getStatePath(): string {
  return join(getStateDir(), "state.json");
}

export async function loadState(): Promise<State> {
  try {
    const contents = await readFile(getStatePath(), "utf8");
    return JSON.parse(contents) as State;
  } catch {
    return {};
  }
}

export async function saveState(state: State): Promise<void> {
  const stateDir = getStateDir();
  await mkdir(stateDir, { recursive: true });
  await writeFile(getStatePath(), JSON.stringify(state, null, 2) + "\n", "utf8");
}
