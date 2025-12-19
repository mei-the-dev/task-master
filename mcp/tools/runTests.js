// MCP-server: Tool stub for runTests
import { execCommand } from '../utils/exec.js';

export async function runTests(issueId) {
  await execCommand(`gh-task-test ${issueId}`);
  return {
    content: [
      {
        type: "text",
        text: `Tests run for issue #${issueId}`,
      },
    ],
  };
}
