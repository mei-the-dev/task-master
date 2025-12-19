#!/usr/bin/env node

/**
 * Task-Master MCP Server
 * 
 * Provides Model Context Protocol interface to the GitHub-Native Agentic Framework.
 * Allows AI agents to interact with GitHub issues, project boards, and task contexts
 * through a standardized protocol.
 * 
 * @version 2.0.0
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  InitializeRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { execCommand } from "./mcp/utils/exec.js";
import { ghCommand } from "./mcp/utils/ghCommand.js";
import { readContext, writeContext } from "./mcp/context.js";
import { listContexts } from "./mcp/utils/listContexts.js";
import { readDoc } from "./mcp/utils/readDoc.js";

import { analyzeIssue } from "./mcp/tools/analyzeIssue.js";
import { startTask } from "./mcp/tools/startTask.js";
import { getContext } from "./mcp/tools/getContext.js";
import { updateContext } from "./mcp/tools/updateContext.js";
import { runTests } from "./mcp/tools/runTests.js";
import { createCheckpoint } from "./mcp/tools/createCheckpoint.js";
import { requestPartialReview } from "./mcp/tools/requestPartialReview.js";
import { submitForReview } from "./mcp/tools/submitForReview.js";
import { blockTask } from "./mcp/tools/blockTask.js";
import { findSimilarTasks } from "./mcp/tools/findSimilarTasks.js";
import { fetchDocumentation } from "./mcp/tools/fetchDocumentation.js";
import { getIssueDetails } from "./mcp/tools/getIssueDetails.js";
import { listActiveTasks } from "./mcp/tools/listActiveTasks.js";
import { getPerformanceStats } from "./mcp/tools/getPerformanceStats.js";

/**
 * Main MCP Server
 */
class TaskMasterServer {
  constructor() {
    this.server = new Server(
      {
        name: "task-master",
        version: "2.0.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error("[MCP Error]", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupHandlers() {
    // Handle initialize
    this.server.setRequestHandler(InitializeRequestSchema, async (request) => {
      return {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {
            listChanged: true,
          },
          resources: {},
        },
        serverInfo: {
          name: "task-master",
          version: "2.0.0",
        },
      };
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const contexts = await listContexts();
      
      const resources = [];

      // Add active task contexts
      for (const issueId of contexts) {
        resources.push({
          uri: `task://context/${issueId}`,
          mimeType: "application/json",
          name: `Task Context #${issueId}`,
          description: `Complete context for issue #${issueId}`,
        });

        // Add docs for this task
        const docsDir = path.join(CONTEXT_DIR, String(issueId), "docs");
        try {
          const docs = await fs.readdir(docsDir);
          for (const doc of docs) {
            resources.push({
              uri: `task://docs/${issueId}/${doc}`,
              mimeType: "text/markdown",
              name: `Documentation: ${doc}`,
              description: `Cached documentation for issue #${issueId}`,
            });
          }
        } catch {
          // No docs directory yet
        }
      }

      // Add completed tasks
      try {
        const completedDir = path.join(CONTEXT_DIR, "completed");
        const completed = await fs.readdir(completedDir);
        for (const file of completed.filter((f) => f.endsWith(".json"))) {
          const issueId = file.replace(".json", "");
          resources.push({
            uri: `task://completed/${issueId}`,
            mimeType: "application/json",
            name: `Completed Task #${issueId}`,
            description: `Historical context and learnings from #${issueId}`,
          });
        }
      } catch {
        // No completed directory yet
      }

      return { resources };
    });

    // Read resource content
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;

      if (uri.startsWith("task://context/")) {
        const issueId = uri.replace("task://context/", "");
        const context = await readContext(issueId);
        if (!context) {
          throw new Error(`Context not found for issue #${issueId}`);
        }
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(context, null, 2),
            },
          ],
        };
      }

      if (uri.startsWith("task://docs/")) {
        const parts = uri.replace("task://docs/", "").split("/");
        const issueId = parts[0];
        const docPath = parts.slice(1).join("/");
        const content = await readDoc(issueId, docPath);
        return {
          contents: [
            {
              uri,
              mimeType: "text/markdown",
              text: content,
            },
          ],
        };
      }

      if (uri.startsWith("task://completed/")) {
        const issueId = uri.replace("task://completed/", "");
        const completedPath = path.join(CONTEXT_DIR, "completed", `${issueId}.json`);
        const content = await fs.readFile(completedPath, "utf-8");
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: content,
            },
          ],
        };
      }

      throw new Error(`Unknown resource URI: ${uri}`);
    });

    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "analyze_issue",
            description: "Perform pre-flight analysis on an issue before starting work",
            inputSchema: {
              type: "object",
              properties: {
                issue_id: {
                  type: "number",
                  description: "GitHub issue number",
                },
              },
              required: ["issue_id"],
            },
          },
          {
            name: "start_task",
            description: "Start working on an issue (creates branch, context, updates board)",
            inputSchema: {
              type: "object",
              properties: {
                issue_id: {
                  type: "number",
                  description: "GitHub issue number",
                },
              },
              required: ["issue_id"],
            },
          },
          {
            name: "get_context",
            description: "Retrieve full context for a task including confidence scores and progress",
            inputSchema: {
              type: "object",
              properties: {
                issue_id: {
                  type: "number",
                  description: "GitHub issue number",
                },
              },
              required: ["issue_id"],
            },
          },
          {
            name: "update_context",
            description: "Update task context with new information (progress, confidence, decisions)",
            inputSchema: {
              type: "object",
              properties: {
                issue_id: {
                  type: "number",
                  description: "GitHub issue number",
                },
                updates: {
                  type: "object",
                  description: "Context fields to update",
                },
              },
              required: ["issue_id", "updates"],
            },
          },
          {
            name: "run_tests",
            description: "Run test suite with iteration tracking and pattern detection",
            inputSchema: {
              type: "object",
              properties: {
                issue_id: {
                  type: "number",
                  description: "GitHub issue number",
                },
              },
              required: ["issue_id"],
            },
          },
          {
            name: "create_checkpoint",
            description: "Save progress without creating a PR",
            inputSchema: {
              type: "object",
              properties: {
                issue_id: {
                  type: "number",
                  description: "GitHub issue number",
                },
                message: {
                  type: "string",
                  description: "Progress description",
                },
              },
              required: ["issue_id", "message"],
            },
          },
          {
            name: "request_partial_review",
            description: "Request human feedback on specific aspect before completing",
            inputSchema: {
              type: "object",
              properties: {
                issue_id: {
                  type: "number",
                  description: "GitHub issue number",
                },
                aspect: {
                  type: "string",
                  enum: ["architecture", "implementation", "tests", "performance", "security"],
                  description: "Aspect to review",
                },
              },
              required: ["issue_id", "aspect"],
            },
          },
          {
            name: "submit_for_review",
            description: "Create PR and mark task ready for full review",
            inputSchema: {
              type: "object",
              properties: {
                issue_id: {
                  type: "number",
                  description: "GitHub issue number",
                },
              },
              required: ["issue_id"],
            },
          },
          {
            name: "block_task",
            description: "Mark task as blocked with diagnostic information",
            inputSchema: {
              type: "object",
              properties: {
                issue_id: {
                  type: "number",
                  description: "GitHub issue number",
                },
                blocker: {
                  type: "string",
                  description: "Description of what's blocking progress",
                },
                context: {
                  type: "object",
                  description: "Additional diagnostic context",
                },
              },
              required: ["issue_id", "blocker"],
            },
          },
          {
            name: "find_similar_tasks",
            description: "Find completed tasks similar to current issue for pattern reuse",
            inputSchema: {
              type: "object",
              properties: {
                issue_id: {
                  type: "number",
                  description: "GitHub issue number",
                },
              },
              required: ["issue_id"],
            },
          },
          {
            name: "fetch_documentation",
            description: "Fetch and cache relevant documentation for an issue",
            inputSchema: {
              type: "object",
              properties: {
                issue_id: {
                  type: "number",
                  description: "GitHub issue number",
                },
              },
              required: ["issue_id"],
            },
          },
          {
            name: "get_issue_details",
            description: "Get full details of a GitHub issue",
            inputSchema: {
              type: "object",
              properties: {
                issue_id: {
                  type: "number",
                  description: "GitHub issue number",
                },
              },
              required: ["issue_id"],
            },
          },
          {
            name: "list_active_tasks",
            description: "List all tasks currently being worked on",
            inputSchema: {
              type: "object",
              properties: {
                status: {
                  type: "string",
                  enum: ["all", "in_progress", "review", "blocked"],
                  description: "Filter by status",
                },
              },
            },
          },
          {
            name: "get_performance_stats",
            description: "Get agent performance statistics and learning data",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "analyze_issue":
            return await this.analyzeIssue(args.issue_id);

          case "start_task":
            return await this.startTask(args.issue_id);

          case "get_context":
            return await this.getContext(args.issue_id);

          case "update_context":
            return await this.updateContext(args.issue_id, args.updates);

          case "run_tests":
            return await this.runTests(args.issue_id);

          case "create_checkpoint":
            return await this.createCheckpoint(args.issue_id, args.message);

          case "request_partial_review":
            return await this.requestPartialReview(args.issue_id, args.aspect);

          case "submit_for_review":
            return await this.submitForReview(args.issue_id);

          case "block_task":
            return await this.blockTask(args.issue_id, args.blocker, args.context);

          case "find_similar_tasks":
            return await this.findSimilarTasks(args.issue_id);

          case "fetch_documentation":
            return await this.fetchDocumentation(args.issue_id);

          case "get_issue_details":
            return await this.getIssueDetails(args.issue_id);

          case "list_active_tasks":
            return await this.listActiveTasks(args.status || "all");

          case "get_performance_stats":
            return await this.getPerformanceStats();

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  // Tool implementations

  async analyzeIssue(issueId) {
    return await analyzeIssue(issueId);
  }

  async startTask(issueId) {
    return await startTask(issueId);
  }

  async getContext(issueId) {
    return await getContext(issueId);
  }

  async updateContext(issueId, updates) {
    return await updateContext(issueId, updates);
  }

  async runTests(issueId) {
    return await runTests(issueId);
  }

  async createCheckpoint(issueId, message) {
    return await createCheckpoint(issueId, message);
  }

  async requestPartialReview(issueId, aspect) {
    return await requestPartialReview(issueId, aspect);
  }

  async submitForReview(issueId) {
    return await submitForReview(issueId);
  }

  async blockTask(issueId, blocker, context) {
    return await blockTask(issueId, blocker, context);
  }

  async findSimilarTasks(issueId) {
    return await findSimilarTasks(issueId);
  }

  async fetchDocumentation(issueId) {
    return await fetchDocumentation(issueId);
  }

  async getIssueDetails(issueId) {
    return await getIssueDetails(issueId);
  }

  async listActiveTasks(status) {
    return await listActiveTasks(status);
  }

  async getPerformanceStats() {
    return await getPerformanceStats();
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Task-Master MCP Server running on stdio");
  }
}

// Start server
const server = new TaskMasterServer();
server.run().catch(console.error);