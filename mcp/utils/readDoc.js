// MCP-server: readDoc utility
import fs from "fs/promises";
import path from "path";

const CONTEXT_DIR = process.env.GH_TASK_CONTEXT_DIR || ".task-context";

export async function readDoc(issueId, docPath) {
  const fullPath = path.join(CONTEXT_DIR, issueId, "docs", docPath);
  try {
    return await fs.readFile(fullPath, "utf-8");
  } catch (error) {
    throw new Error(`Documentation not found: ${docPath}`);
  }
}
