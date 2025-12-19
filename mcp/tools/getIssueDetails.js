// MCP-server: Tool stub for getIssueDetails
import { execCommand } from '../utils/exec.js';

export async function getIssueDetails(issueId) {
  await execCommand(`gh-task-analyze ${issueId}`);
  return {
    content: [
      {
        type: "text",
        text: `Issue details retrieved for #${issueId}`,
      },
    ],
  };
}
