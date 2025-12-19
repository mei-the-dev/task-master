// MCP-server: ghCommand utility
import { execCommand } from './exec.js';

export async function ghCommand(args) {
  const output = await execCommand(`gh ${args}`);
  try {
    return JSON.parse(output);
  } catch {
    return output;
  }
}
