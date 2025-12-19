import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from 'path';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const client = new Client(
        { name: "task-master-ui-client", version: "0.1.0" },
        { capabilities: {} }
      );
      const transport = new StdioClientTransport({
        command: "node",
        args: [path.resolve(process.cwd(), "../../index.js")],
        env: { ...process.env, PATH: `${path.resolve(process.cwd(), "../../bin")}:${process.env.PATH}` },
      });
      await client.connect(transport);
      await client.initialize();
      const result = await client.callTool({
        name: "list_active_tasks",
        arguments: {},
      });
      const tasksData = JSON.parse(result.content[0].text);
      await client.close();
      return res.status(200).json({ tasks: tasksData.tasks || [] });
    } else if (req.method === 'POST') {
      const { title, due_date, priority, tags, notes, recurrence, reminders } = req.body;
      if (!title) {
        return res.status(400).json({ error: 'Title is required' });
      }
      // Step 1: Create GitHub issue
      const { execSync } = await import('child_process');
      let issueUrl = '';
      try {
        const details = [notes || '', due_date ? `Due: ${due_date}` : '', priority ? `Priority: ${priority}` : '', tags && tags.length ? `Tags: ${tags.join(", ")}` : '', recurrence ? `Recurrence: ${recurrence}` : '', reminders && reminders.length ? `Reminders: ${reminders.join(", ")}` : ''].filter(Boolean).join('\n');
        const cmd = `gh issue create --title "${title.replace(/"/g, '\\"')}" --body "${details.replace(/"/g, '\\"')}"`;
        issueUrl = execSync(cmd, { encoding: 'utf-8' }).trim();
      } catch (err) {
        return res.status(500).json({ error: 'Failed to create GitHub issue: ' + err });
      }
      const match = issueUrl.match(/\/issues\/(\d+)/);
      if (!match) {
        return res.status(500).json({ error: 'Could not extract issue number from: ' + issueUrl });
      }
      const issue_id = parseInt(match[1], 10);
      // Step 2: Call start_task on MCP
      const client = new Client(
        { name: "task-master-ui-client", version: "0.1.0" },
        { capabilities: {} }
      );
      const transport = new StdioClientTransport({
        command: "node",
        args: [path.resolve(process.cwd(), "../../index.js")],
        env: { ...process.env, PATH: `${path.resolve(process.cwd(), "../../bin")}:${process.env.PATH}` },
      });
      await client.connect(transport);
      await client.initialize();
      await client.callTool({
        name: "start_task",
        arguments: { issue_id },
      });
      // Step 3: Get context for new task
      const contextResult = await client.callTool({
        name: "get_context",
        arguments: { issue_id },
      });
      const context = JSON.parse(contextResult.content[0].text);
      await client.close();
      return res.status(201).json({ task: context });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (err) {
    console.error("MCP API error:", err);
    res.status(500).json({ error: String(err) });
  }
}
