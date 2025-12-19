// MCP-server: Tool stub for blockTask
import { execCommand } from '../utils/exec.js';

export async function blockTask(issueId, blocker) {
  await execCommand(`gh-task-block ${issueId} "${blocker}"`);
  return {
    content: [
      {
        type: "text",
        text: `Task #${issueId} marked as blocked: ${blocker}`,
      },
    ],
  };
}
