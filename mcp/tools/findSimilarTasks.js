// MCP-server: Tool stub for findSimilarTasks
import { execCommand } from '../utils/exec.js';

export async function findSimilarTasks(issueId) {
  await execCommand(`gh-task-similar ${issueId}`);
  return {
    content: [
      {
        type: "text",
        text: `Similar tasks found for issue #${issueId}`,
      },
    ],
  };
}
