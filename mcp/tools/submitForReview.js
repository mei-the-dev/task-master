// MCP-server: Tool stub for submitForReview
import { execCommand } from '../utils/exec.js';

export async function submitForReview(issueId) {
  await execCommand(`gh-task-pr ${issueId}`);
  return {
    content: [
      {
        type: "text",
        text: `PR submitted for issue #${issueId}`,
      },
    ],
  };
}
