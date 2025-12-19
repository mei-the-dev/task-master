// MCP-server: Tool stub for getPerformanceStats
import { execCommand } from '../utils/exec.js';

export async function getPerformanceStats() {
  await execCommand(`gh-task-stats`);
  return {
    content: [
      {
        type: "text",
        text: `Performance stats retrieved.`,
      },
    ],
  };
}
