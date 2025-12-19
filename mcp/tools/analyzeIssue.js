// MCP-server: Tool stub for analyzeIssue
import { execCommand } from '../utils/exec.js';

export async function analyzeIssue(issueId) {
  await execCommand(`gh-task-analyze ${issueId}`);
  return {
    content: [
      {
        type: "text",
        text: `Issue #${issueId} analyzed.`,
      },
    ],
  };
}
