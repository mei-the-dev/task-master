// Shared exec utility for MCP-server
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function execCommand(command, options = {}) {
  try {
    const { stdout, stderr } = await execAsync(command, options);
    if (stderr && !stdout && !stderr.includes("Switched to") && !stderr.includes("Created branch")) {
      throw new Error(stderr);
    }
    return stdout.trim();
  } catch (error) {
    throw new Error(`Command failed: ${error.message}`);
  }
}
