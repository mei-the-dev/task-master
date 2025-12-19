// MCP-server: listContexts utility
import fs from "fs/promises";
import path from "path";

const CONTEXT_DIR = process.env.GH_TASK_CONTEXT_DIR || ".task-context";

export async function listContexts() {
  try {
    await fs.mkdir(CONTEXT_DIR, { recursive: true });
    const files = await fs.readdir(CONTEXT_DIR);
    return files
      .filter((f) => f.endsWith(".json") && !f.includes("completed"))
      .map((f) => parseInt(f.replace(".json", "")))
      .filter((n) => !isNaN(n));
  } catch {
    return [];
  }
}
