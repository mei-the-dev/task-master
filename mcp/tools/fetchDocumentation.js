// MCP-server: Tool stub for fetchDocumentation
import { execCommand } from '../utils/exec.js';

export async function fetchDocumentation(issueId) {
  await execCommand(`gh-task-docs ${issueId}`);
  return {
    content: [
      {
        type: "text",
        text: `Documentation fetched for issue #${issueId}`,
      },
    ],
  };
}
