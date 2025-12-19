// Context read/write utilities for MCP-server
import fs from "fs/promises";
import path from "path";

const CONTEXT_DIR = process.env.GH_TASK_CONTEXT_DIR || ".task-context";

export async function readContext(issueId) {
  const contextPath = path.join(CONTEXT_DIR, `${issueId}.json`);
  try {
    const content = await fs.readFile(contextPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

export async function writeContext(issueId, context) {
  await fs.mkdir(CONTEXT_DIR, { recursive: true });
  const contextPath = path.join(CONTEXT_DIR, `${issueId}.json`);
  await fs.writeFile(contextPath, JSON.stringify(context, null, 2));
}
