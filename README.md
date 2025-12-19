# Task-Master Reference Workflow

## UI Component Development Example

### 1. Create a GitHub Issue
- Title: `UI: Implement TaskCard component`
- Description: Requirements, acceptance criteria, design notes.

### 2. Start Task via CLI
- Run: `bin/gh-task-start <issue_id>`
- This creates a branch and initializes context.

### 3. Develop Component
- Implement in `ui/components/TaskCard.js`.
- Use only operational MCP/CLI commands for context, status, and PR.

### 4. Track Progress
- Run: `bin/gh-task-checkpoint <issue_id> "Initial layout done"`
- Run: `bin/gh-task-block <issue_id> "Waiting for API"` if blocked.

### 5. Testing
- Write minimal, real tests in `ui/components/TaskCard.test.js`.
- Avoid excessive scaffolding; focus on actual logic.

### 6. Submit for Review
- Run: `bin/gh-task-pr <issue_id>`
- MCP server updates context and creates PR.

### 7. Merge and Document
- On PR merge, MCP server archives context and learnings.

---

## Enforcement Principles
- No stubs/mocks in CLI or MCP server. All commands must execute real logic.
- Modular boundaries: CLI logic in `bin/`, MCP server logic in `mcp/`, UI in `ui/`.
- No test-driven spirals: Write only essential tests, focus on real code and operational flows.
# Task-Master MCP Server

Model Context Protocol server for the GitHub-Native Agentic Framework. Provides AI agents with structured access to GitHub issues, project boards, task contexts, and learning data.

## Features

- **Context Persistence**: Access and modify task context across sessions
- **GitHub Integration**: Direct interaction with issues, PRs, and project boards
- **Learning System**: Query historical data from completed tasks
- **Documentation Access**: Retrieve cached docs for any active task
- **Resource Discovery**: List all available contexts and documentation
- **Tool Execution**: Execute framework commands through MCP

## Installation

```bash
npm install @taskmaster/mcp-server
```

Or install globally:

```bash
npm install -g @taskmaster/mcp-server
```

## Configuration

### For Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "task-master": {
      "command": "node",
      "args": ["/path/to/task-master/index.js"],
      "env": {
        "GH_TASK_CONTEXT_DIR": ".task-context",
        "GH_PROJECT_NUMBER": "1"
      }
    }
  }
}
```

### For Other MCP Clients

The server communicates over stdio. Configure your client to run:

```bash
task-master-mcp
```

### Environment Variables

- `GH_TASK_CONTEXT_DIR`: Directory for task contexts (default: `.task-context`)
- `GH_PROJECT_NUMBER`: GitHub Project board number (default: `1`)

## Resources

The MCP server exposes the following resources:

### Active Task Contexts

```
task://context/{issue_id}
```

Returns the complete context for an active task including:
- Requirements and acceptance criteria
- Technical context and decisions
- Progress tracking
- Confidence scores
- Test iteration history
- Similar task references

**Example:**
```json
{
  "issue_id": 42,
  "status": "in_progress",
  "branch": "fix/42-memory-leak",
  "requirements": {
    "primary": "Fix memory leak in cache",
    "acceptance_criteria": [...]
  },
  "confidence_scores": {
    "fix_correctness": 0.85,
    "test_coverage": 0.80,
    "performance_impact": 0.60
  },
  "test_iterations": [...],
  "similar_tasks": [...]
}
```

### Cached Documentation

```
task://docs/{issue_id}/{filename}
```

Returns documentation cached for a specific task. These are fetched during task initialization and include:
- Repository documentation matching keywords
- Architecture decision records
- Contributing guidelines
- Test patterns

**Example:**
```
task://docs/42/cache-design.md
task://docs/42/testing-guidelines.md
```

### Completed Tasks

```
task://completed/{issue_id}
```

Returns historical context and learning data from completed tasks:

**Example:**
```json
{
  "issue_id": 38,
  "outcome": "successful",
  "completed_at": "2024-12-15T16:30:00Z",
  "patterns_used": ["Redis Lua script", "Atomic operations"],
  "confidence_accuracy": {
    "predicted": {"fix_correctness": 0.85},
    "actual": {"fix_correctness": 0.95}
  },
  "lessons_learned": [
    "Lua script pattern works well for atomicity",
    "Performance overhead was acceptable"
  ]
}
```

## Tools

### Task Workflow

#### `analyze_issue`

Perform pre-flight analysis before starting work.

**Input:**
```json
{
  "issue_id": 42
}
```

**Returns:**
- Issue completeness assessment
- Similar tasks found
- Documentation availability
- Confidence level
- Recommendations

#### `start_task`

Initialize a new task with branch creation, context initialization, and board updates.

**Input:**
```json
{
  "issue_id": 42
}
```

**Returns:**
- Branch name
- Context location
- Status

#### `get_context`

Retrieve full context for an active task.

**Input:**
```json
{
  "issue_id": 42
}
```

**Returns:** Complete context JSON

#### `update_context`

Update task context with new information.

**Input:**
```json
{
  "issue_id": 42,
  "updates": {
    "confidence_scores": {
      "fix_correctness": 0.90
    },
    "progress": {
      "completed": ["root cause analysis", "fix implementation"]
    }
  }
}
```

**Returns:** Confirmation of update

### Testing & Development

#### `run_tests`

Execute test suite with iteration tracking.

**Input:**
```json
{
  "issue_id": 42
}
```

**Returns:**
```json
{
  "passed": true,
  "iteration": 2,
  "pattern_detected": "timing_issue",
  "output": "..."
}
```

#### `create_checkpoint`

Save progress without creating a PR.

**Input:**
```json
{
  "issue_id": 42,
  "message": "implemented core fix, starting tests"
}
```

### Review & Collaboration

#### `request_partial_review`

Request human feedback on a specific aspect.

**Input:**
```json
{
  "issue_id": 42,
  "aspect": "performance"
}
```

Valid aspects: `architecture`, `implementation`, `tests`, `performance`, `security`

#### `submit_for_review`

Create PR and mark ready for full review.

**Input:**
```json
{
  "issue_id": 42
}
```

#### `block_task`

Mark task as blocked with diagnostic information.

**Input:**
```json
{
  "issue_id": 42,
  "blocker": "Tests failing after 5 attempts",
  "context": {
    "error": "Expected 1 call but got 0",
    "attempts": 5,
    "patterns_tried": ["async/await", "done callback"]
  }
}
```

### Learning & Discovery

#### `find_similar_tasks`

Find completed tasks similar to current issue.

**Input:**
```json
{
  "issue_id": 42
}
```

**Returns:** List of similar tasks with:
- Issue ID and title
- Outcome (successful/failed)
- Patterns used
- Time taken
- Confidence scores

#### `fetch_documentation`

Fetch and cache relevant documentation.

**Input:**
```json
{
  "issue_id": 42
}
```

**Returns:** List of cached documents

#### `get_performance_stats`

Get agent performance statistics.

**Input:** None

**Returns:**
```json
{
  "tasks_completed": 12,
  "success_rate": 0.917,
  "avg_time": "2h 15m",
  "confidence_accuracy": {
    "high_predictions": 0.95,
    "medium_predictions": 0.80
  },
  "patterns_learned": [...]
}
```

### Utilities

#### `get_issue_details`

Get full GitHub issue details.

**Input:**
```json
{
  "issue_id": 42
}
```

**Returns:** GitHub issue JSON

#### `list_active_tasks`

List all active tasks.

**Input:**
```json
{
  "status": "in_progress"
}
```

Valid statuses: `all`, `in_progress`, `review`, `blocked`

## Usage Examples

### Example 1: Starting a New Task

```javascript
// As an AI agent using MCP

// 1. Analyze the issue first
const analysis = await mcp.callTool("analyze_issue", {
  issue_id: 87
});

// 2. If confidence is good, start the task
if (analysis.confidence === "HIGH") {
  await mcp.callTool("start_task", {
    issue_id: 87
  });
  
  // 3. Fetch documentation
  await mcp.callTool("fetch_documentation", {
    issue_id: 87
  });
  
  // 4. Read cached docs
  const docs = await mcp.readResource("task://docs/87/rate-limiting.md");
}
```

### Example 2: Iterative Development

```javascript
// Run tests
const testResult = await mcp.callTool("run_tests", {
  issue_id: 87
});

if (!testResult.passed) {
  // Update context with failure info
  await mcp.callTool("update_context", {
    issue_id: 87,
    updates: {
      test_iterations: [{
        attempt: 1,
        result: "failed",
        pattern: testResult.pattern_detected
      }]
    }
  });
  
  // If stuck after multiple attempts, block
  if (testResult.iteration >= 5) {
    await mcp.callTool("block_task", {
      issue_id: 87,
      blocker: "Tests failing after max attempts",
      context: testResult
    });
  }
}
```

### Example 3: Learning from History

```javascript
// Find similar past work
const similar = await mcp.callTool("find_similar_tasks", {
  issue_id: 94
});

// Read context from successful similar task
const historicalContext = await mcp.readResource("task://completed/87");

// Apply proven patterns
const patterns = JSON.parse(historicalContext).patterns_used;
console.log("Proven patterns:", patterns);
```

### Example 4: Requesting Feedback

```javascript
// After implementing, check confidence
const context = await mcp.readResource("task://context/87");
const confidence = JSON.parse(context).confidence_scores;

// If performance confidence is low, request partial review
if (confidence.performance_impact < 0.7) {
  await mcp.callTool("request_partial_review", {
    issue_id: 87,
    aspect: "performance"
  });
  
  // Wait for human feedback before continuing
}
```

## Integration with AI Agents

The MCP server is designed to be used by AI agents (like Claude) to autonomously manage software development tasks. The typical workflow:

1. **Discovery**: Agent lists resources to see active tasks
2. **Analysis**: Uses `analyze_issue` to understand requirements
3. **Context**: Reads `task://context/{id}` to get full state
4. **Learning**: Reads `task://completed/{id}` to learn from history
5. **Execution**: Uses tools to run tests, create checkpoints, etc.
6. **Collaboration**: Requests partial reviews when uncertain
7. **Completion**: Submits for review when confident

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   AI Agent (Claude)                 │
└───────────────────┬─────────────────────────────────┘
                    │ MCP Protocol (stdio)
┌───────────────────▼─────────────────────────────────┐
│              Task-Master MCP Server                 │
│  ┌──────────────────────────────────────────────┐  │
│  │  Resources: Contexts, Docs, Completed Tasks  │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Tools: 14 task management operations        │  │
│  └──────────────────────────────────────────────┘  │
└───────────────────┬─────────────────────────────────┘
                    │ Shell commands
┌───────────────────▼─────────────────────────────────┐
│         GitHub CLI + Bash Framework                 │
│  ┌────────────────┐  ┌────────────────┐           │
│  │  GitHub API    │  │  Git Commands  │           │
│  └────────────────┘  └────────────────┘           │
└─────────────────────────────────────────────────────┘
```

## Development

### Running in Development Mode

```bash
npm run dev
```

This watches for changes and restarts the server automatically.

### Testing the Server

```bash
# List resources
echo '{"jsonrpc":"2.0","method":"resources/list","id":1}' | node index.js

# Call a tool
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"list_active_tasks","arguments":{}},"id":2}' | node index.js
```

### Debugging

Set `DEBUG=*` environment variable for verbose logging:

```bash
DEBUG=* node index.js
```

## Requirements

- Node.js >= 18.0.0
- GitHub CLI (`gh`) installed and authenticated
- Task-Master framework CLI tools in PATH
- Active git repository

## Security Considerations

- The server executes shell commands - only run in trusted environments
- GitHub CLI authentication is inherited from user's session
- No authentication built into MCP server itself
- Context files may contain sensitive project information

## Troubleshooting

### Server won't start

Check that:
- Node.js version is >= 18.0.0
- `gh` CLI is installed: `gh --version`
- GitHub authentication is active: `gh auth status`

### Resources not appearing

Ensure:
- You're in a git repository
- Task contexts exist in `.task-context/` directory
- File permissions allow reading context files

### Tools failing

Verify:
- Framework CLI tools are in PATH: `which gh-task-start`
- Shell scripts are executable: `chmod +x gh-cli-integration.sh`
- You're in the repository root directory

## Roadmap

- [ ] Add streaming support for long-running operations
- [ ] Implement caching for frequently accessed resources
- [ ] Add webhooks for real-time board updates
- [ ] Support for multiple concurrent agents
- [ ] Integration with Linear, Jira, and other issue trackers
- [ ] Advanced pattern recognition and learning
- [ ] Team collaboration features

## Contributing

Contributions welcome! Please read the framework's CONTRIBUTING.md for guidelines.

## License

MIT

## Support

- GitHub Issues: [Report bugs or request features]
- Documentation: See `.github/agents/task-master.agent.md`
- Discord: [Community server link]

---

Built with ❤️ for agentic software development