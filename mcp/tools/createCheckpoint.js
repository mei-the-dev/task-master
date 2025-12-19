// MCP-server: Tool stub for createCheckpoint
import { execCommand } from '../utils/exec.js';

export async function createCheckpoint(issueId, message) {
  await execCommand(`gh-task-checkpoint ${issueId} "${message}"`);
  return {
    content: [
      {
        type: "text",
        text: `Checkpoint created for issue #${issueId}: ${message}`,
      },
    ],
  };
}
