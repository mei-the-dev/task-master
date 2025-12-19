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
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

// Configuration
const CONTEXT_DIR = process.env.GH_TASK_CONTEXT_DIR || ".task-context";
const PROJECT_NUMBER = process.env.GH_PROJECT_NUMBER || "1";

/**
 * Execute a shell command and return parsed output
 */
async function execCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(command);
    // Don't throw on stderr if it contains informational messages
    if (stderr && !stdout && !stderr.includes("Switched to") && !stderr.includes("Created branch")) {
      throw new Error(stderr);
    }
    return stdout.trim();
  } catch (error) {
    throw new Error(`Command failed: ${error.message}`);
  }
}

/**
 * Execute gh CLI command and parse JSON output
 */
async function ghCommand(args) {
  const output = await execCommand(`gh ${args}`);
  try {
    return JSON.parse(output);
  } catch {
    return output;
  }
}

/**
 * Read task context from JSON file
 */
async function readContext(issueId) {
  const contextPath = path.join(CONTEXT_DIR, `${issueId}.json`);
  try {
    const content = await fs.readFile(contextPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

/**
 * Write task context to JSON file
 */
async function writeContext(issueId, context) {
  await fs.mkdir(CONTEXT_DIR, { recursive: true });
  const contextPath = path.join(CONTEXT_DIR, `${issueId}.json`);
  await fs.writeFile(contextPath, JSON.stringify(context, null, 2));
}

/**
 * List all context files
 */
async function listContexts() {
  try {
    await fs.mkdir(CONTEXT_DIR, { recursive: true });
    const files = await fs.readdir(CONTEXT_DIR);
    return files
      .filter((f) => f.endsWith(".json") && !f.includes("completed"))
      .map((f) => parseInt(f.replace(".json", "")))
      .filter((n) => !isNaN(n));
  } catch {
    return [];
  }
}

/**
 * Read documentation file
 */
async function readDoc(issueId, docPath) {
  const fullPath = path.join(CONTEXT_DIR, issueId, "docs", docPath);
  try {
    return await fs.readFile(fullPath, "utf-8");
  } catch (error) {
    throw new Error(`Documentation not found: ${docPath}`);
  }
}

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
    // Get issue details
    const issue = await ghCommand(`issue view ${issueId} --json title,body,labels`);
    
    // Analyze completeness
    const title = issue.title || "";
    const body = issue.body || "";
    const labels = issue.labels || [];
    
    const analysis = {
      issue_id: issueId,
      completeness: {
        title_descriptive: title.length > 10 && title.includes(" "),
        has_description: body.length > 50,
        has_acceptance_criteria: body.toLowerCase().includes("acceptance criteria") || body.includes("AC:") || body.includes("✅"),
        has_labels: labels.length > 0,
        has_assignee: issue.assignees && issue.assignees.length > 0,
      },
      similar_tasks: [],
      documentation_found: [],
      confidence: "HIGH",
      recommendations: [],
    };
    
    // Determine confidence based on completeness
    const completeCount = Object.values(analysis.completeness).filter(Boolean).length;
    if (completeCount < 3) {
      analysis.confidence = "LOW";
    } else if (completeCount < 5) {
      analysis.confidence = "MEDIUM";
    }
    
    // Add recommendations
    if (!analysis.completeness.title_descriptive) {
      analysis.recommendations.push("Make title more descriptive (aim for 10+ words)");
    }
    if (!analysis.completeness.has_description) {
      analysis.recommendations.push("Add detailed description explaining the requirements");
    }
    if (!analysis.completeness.has_acceptance_criteria) {
      analysis.recommendations.push("Include acceptance criteria or success metrics");
    }
    if (!analysis.completeness.has_labels) {
      analysis.recommendations.push("Apply relevant labels (enhancement, bug, documentation, etc.)");
    }
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  }

  async startTask(issueId) {
    // Get issue details
    const issue = await ghCommand(`issue view ${issueId} --json title,number`);
    
    // Create branch name
    const branchName = `task-${issueId}-${issue.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50)}`;
    
    // Check if branch exists
    let branchExists = false;
    try {
      await execCommand(`git show-ref --verify --quiet refs/heads/${branchName}`);
      branchExists = true;
    } catch {
      // Branch doesn't exist
    }
    
    // Create or switch to branch
    if (branchExists) {
      await execCommand(`git checkout ${branchName}`);
    } else {
      await execCommand(`git checkout -b ${branchName}`);
    }
    
    // Initialize context
    const context = {
      issue_id: issueId,
      started_at: new Date().toISOString(),
      last_updated: new Date().toISOString(),
      status: "in_progress",
      branch: branchName,
      requirements: {
        primary: issue.title,
        acceptance_criteria: []
      },
      technical_context: {
        root_cause: "",
        affected_files: [],
        dependencies: []
      },
      progress: {
        completed_steps: [],
        current_step: "Analysis",
        blockers: [],
        confidence: 0.8
      },
      testing: {
        test_cases: [],
        coverage_target: 0.8,
        performance_requirements: []
      },
      documentation: {
        api_docs: [],
        user_docs: [],
        architecture_decisions: []
      }
    };
    
    await writeContext(issueId, context);
    
    return {
      content: [
        {
          type: "text",
          text: `Task started successfully!\n\nBranch: ${branchName}\nStatus: in_progress\nContext: .task-context/${issueId}.json`,
        },
      ],
    };
  }

  async getContext(issueId) {
    const context = await readContext(issueId);
    if (!context) {
      throw new Error(`No context found for issue #${issueId}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(context, null, 2),
        },
      ],
    };
  }

  async updateContext(issueId, updates) {
    let context = await readContext(issueId);
    if (!context) {
      throw new Error(`No context found for issue #${issueId}`);
    }

    // Deep merge updates
    context = { ...context, ...updates };
    context.last_updated = new Date().toISOString();

    await writeContext(issueId, context);

    return {
      content: [
        {
          type: "text",
          text: `Context updated for issue #${issueId}`,
        },
      ],
    };
  }

  async runTests(issueId) {
    const output = await execCommand(`gh-task-test ${issueId} 2>&1 || true`);
    
    const passed = output.includes("✅ All tests passing");
    const iteration = output.match(/Test Iteration #(\d+)/)?.[1] || "1";
    
    let pattern = "unknown";
    if (output.includes("Race condition")) pattern = "race_condition";
    if (output.includes("timing issue")) pattern = "timing_issue";
    if (output.includes("Cannot find module")) pattern = "missing_import";

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            passed,
            iteration: parseInt(iteration),
            pattern_detected: pattern,
            output: output.substring(0, 1000), // Limit output size
          }, null, 2),
        },
      ],
    };
  }

  async createCheckpoint(issueId, message) {
    await execCommand(`gh-task-checkpoint ${issueId} "${message}"`);

    return {
      content: [
        {
          type: "text",
          text: `Checkpoint created for issue #${issueId}: ${message}`,
        },
      ],
    };
  }

  async requestPartialReview(issueId, aspect) {
    await execCommand(`gh-task-review-partial ${issueId} ${aspect}`);

    return {
      content: [
        {
          type: "text",
          text: `Partial review requested for ${aspect} on issue #${issueId}`,
        },
      ],
    };
  }

  async submitForReview(issueId) {
    await execCommand(`gh-task-review ${issueId}`);
    const context = await readContext(issueId);

    return {
      content: [
        {
          type: "text",
          text: `PR created for issue #${issueId}\nConfidence scores:\n${JSON.stringify(context.confidence_scores, null, 2)}`,
        },
      ],
    };
  }

  async blockTask(issueId, blocker, context) {
    const contextStr = context ? JSON.stringify(context) : "";
    await execCommand(`gh-task-block ${issueId} "${blocker}" --context`);

    return {
      content: [
        {
          type: "text",
          text: `Task #${issueId} marked as blocked: ${blocker}`,
        },
      ],
    };
  }

  async findSimilarTasks(issueId) {
    const output = await execCommand(`gh-task-similar ${issueId}`);
    
    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  }

  async fetchDocumentation(issueId) {
    const output = await execCommand(`gh-task-docs ${issueId}`);
    
    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
  }

  async getIssueDetails(issueId) {
    const issue = await ghCommand(`issue view ${issueId} --json title,body,labels,state,assignees,milestone`);
    
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(issue, null, 2),
        },
      ],
    };
  }

  async listActiveTasks(status) {
    const contexts = await listContexts();
    const tasks = [];

    for (const issueId of contexts) {
      const context = await readContext(issueId);
      if (status === "all" || context.status === status) {
        tasks.push({
          issue_id: issueId,
          status: context.status,
          branch: context.branch,
          confidence: context.confidence_scores,
          started: context.started_at,
        });
      }
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(tasks, null, 2),
        },
      ],
    };
  }

  async getPerformanceStats() {
    const output = await execCommand(`gh-task-stats`);
    
    return {
      content: [
        {
          type: "text",
          text: output,
        },
      ],
    };
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