// MCP-server: Tool stub for requestPartialReview
import { execCommand } from '../utils/exec.js';

export async function requestPartialReview(issueId, aspect) {
  await execCommand(`gh-task-review-partial ${issueId} ${aspect}`);
  return {
    content: [
      {
        type: "text",
        text: `Partial review requested for issue #${issueId} (aspect: ${aspect})`,
      },
    ],
  };
}
