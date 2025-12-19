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
        name: "create_task",
        arguments: {
          title,
          due_date,
          priority,
          tags,
          notes,
          recurrence,
          reminders
        },
      });
      const newTask = JSON.parse(result.content[0].text);
      await client.close();
      return res.status(201).json({ task: newTask });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (err) {
    console.error("MCP API error:", err);
    res.status(500).json({ error: String(err) });
  }
}
