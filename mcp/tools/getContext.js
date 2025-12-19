// MCP-server: Tool stub for getContext
import { execCommand } from '../utils/exec.js';

export async function getContext(issueId) {
  await execCommand(`gh-task-checkpoint ${issueId}`); // Placeholder, replace with correct CLI if needed
  return {
    content: [
      {
        type: "text",
        text: `Context retrieved for issue #${issueId}`,
      },
    ],
  };
}
