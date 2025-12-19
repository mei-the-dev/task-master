// MCP-server: Tool stub for listActiveTasks
import { execCommand } from '../utils/exec.js';

export async function listActiveTasks(status = "all") {
  await execCommand(`gh-task-checkpoint --list --status ${status}`); // Placeholder, replace with correct CLI if needed
  return {
    content: [
      {
        type: "text",
        text: `Active tasks listed (status: ${status})`,
      },
    ],
  };
}
