# Task-Master Framework: Complete Setup Guide

Get the entire GitHub-Native Agentic Framework running in under 10 minutes.

## Prerequisites

- **Operating System:** macOS, Linux, or WSL2 on Windows
- **Node.js:** >= 18.0.0 ([install](https://nodejs.org/))
- **GitHub CLI:** ([install](https://cli.github.com/))
- **Git:** >= 2.30.0
- **jq:** JSON processor ([install](https://stedolan.github.io/jq/download/))
- **bc:** Calculator (usually pre-installed)

## Quick Install (Recommended)

```bash
# Clone the framework
git clone https://github.com/your-org/task-master-framework.git
cd task-master-framework

# Run automated setup
./setup.sh

# Follow the prompts - it will:
# - Verify prerequisites
# - Authenticate with GitHub
# - Install CLI tools
# - Set up MCP server
# - Configure your shell
# - Initialize your project
```

## Manual Installation

### Step 1: Install Dependencies

```bash
# macOS
brew install gh jq bc node

# Ubuntu/Debian
sudo apt-get install gh jq bc nodejs npm

# Install GitHub CLI if not available via package manager
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt update
sudo apt install gh
```

### Step 2: Authenticate GitHub CLI

```bash
# Login to GitHub
gh auth login

# Grant project permissions
gh auth refresh -s project

# Verify authentication
gh auth status
```

### Step 3: Install Framework CLI Tools

```bash
# Download the CLI integration script
curl -o gh-cli-integration.sh https://raw.githubusercontent.com/your-org/task-master/main/gh-cli-integration.sh

# Make executable
chmod +x gh-cli-integration.sh

# Add to your shell configuration
cat gh-cli-integration.sh >> ~/.zshrc  # or ~/.bashrc

# Reload shell
source ~/.zshrc  # or source ~/.bashrc
```

### Step 4: Configure Environment

```bash
# Find your GitHub Project number
gh project list

# Set environment variables
export GH_PROJECT_NUMBER=1  # Replace with your project number
export GH_TASK_CONTEXT_DIR=".task-context"

# Add to shell config for persistence
echo 'export GH_PROJECT_NUMBER=1' >> ~/.zshrc
echo 'export GH_TASK_CONTEXT_DIR=".task-context"' >> ~/.zshrc
```

### Step 5: Install MCP Server

```bash
# Install the MCP server globally
npm install -g @taskmaster/mcp-server

# Or install locally in your project
cd your-repo
npm install --save-dev @taskmaster/mcp-server
```

### Step 6: Configure MCP Client (Claude Desktop)

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "task-master": {
      "command": "node",
      "args": ["/usr/local/lib/node_modules/@taskmaster/mcp-server/index.js"],
      "env": {
        "GH_TASK_CONTEXT_DIR": ".task-context",
        "GH_PROJECT_NUMBER": "1"
      }
    }
  }
}
```

For local installation:

```json
{
  "mcpServers": {
    "task-master": {
      "command": "node",
      "args": ["./node_modules/@taskmaster/mcp-server/index.js"],
      "env": {
        "GH_TASK_CONTEXT_DIR": ".task-context",
        "GH_PROJECT_NUMBER": "1"
      }
    }
  }
}
```

### Step 7: Install Agent Profile

```bash
# In your repository
mkdir -p .github/agents

# Download agent profile
curl -o .github/agents/task-master.agent.md \
  https://raw.githubusercontent.com/your-org/task-master/main/task-master.agent.md

# Commit to repo
git add .github/agents/
git commit -m "chore: add Task-Master agent profile"
git push
```

### Step 8: Verify Installation

```bash
# Verify CLI tools
gh-task-verify

# Expected output:
# 🔍 Verifying GitHub-Native Agentic Framework v2.0...
# ✅ gh CLI: gh version 2.40.0
# ✅ git: git version 2.42.0
# ✅ jq: jq-1.7
# ✅ bc: installed
# ✅ GitHub authentication: Active
# ✅ Context directory: .task-context
# 🎉 Framework v2.0 ready!

# Test MCP server
task-master-mcp --help

# Test a simple tool call
echo '{"jsonrpc":"2.0","method":"tools/list","id":1}' | task-master-mcp
```

## First Task: Hello World

Let's walk through your first task using the framework.

### 1. Create a Test Issue

```bash
gh issue create \
  --title "Add hello world endpoint" \
  --body "Create a GET /hello endpoint that returns {message: 'Hello, World!'}" \
  --label "enhancement" \
  --assignee "@me"

# Note the issue number (e.g., #1)
```

### 2. Analyze the Issue

```bash
gh-task-analyze 1

# Expected output:
# 🔍 Analyzing issue #1...
# 
# 📝 Issue Completeness:
#   ✓ Title is descriptive
#   ⚠ No clear acceptance criteria found
#   ✓ Labels applied: enhancement
# ...
```

### 3. Start Working on It

```bash
gh-task-start 1

# Expected output:
# 🚀 Starting work on issue #1...
# 📝 Context initialized: .task-context/1.json
# 📝 Creating branch: feat/1-add-hello-world-endpoint
# 📊 Updating project board...
# ✅ Ready to work on issue #1
```

### 4. Implement the Feature

```bash
# Create the endpoint file
cat > src/routes/hello.js << 'EOF'
export const hello = (req, res) => {
  res.json({ message: 'Hello, World!' });
};
EOF

# Update your router
# (implementation depends on your framework)

# Commit
git add src/routes/hello.js
git commit -m "feat: add hello world endpoint

Returns JSON greeting message

Refs: #1"
```

### 5. Run Tests

```bash
gh-task-test 1

# If tests fail, the framework will help debug
# If tests pass, confidence scores are updated
```

### 6. Submit for Review

```bash
gh-task-review 1

# This will:
# - Push your branch
# - Create a draft PR
# - Update project board to "Review"
# - Post a comment with confidence scores
```

### 7. Complete the Task (Human Approval)

```bash
# After human review and approval
gh-task-complete 1

# Confirm merge: y
# ✅ Task completed successfully
```

## Using with AI Agent (Claude)

### 1. Open Claude Desktop with MCP

Restart Claude Desktop after configuring the MCP server.

### 2. Verify MCP Connection

In Claude, ask:
> "Can you list the available MCP resources?"

Claude should respond with:
> I can see the task-master MCP server is connected. I have access to task contexts, documentation, and completed tasks.

### 3. Assign Work to Claude

> "@claude, can you work on issue #2? It's about adding input validation."

Claude will:
1. Analyze the issue
2. Check for similar past work
3. Start the task
4. Implement the feature
5. Run tests and iterate
6. Submit for your review

### 4. Collaborate with Claude

You can:
- Ask for progress updates: "How's issue #2 going?"
- Request partial reviews: "Can you show me your architecture approach first?"
- Provide feedback: "Please also add validation for the PATCH endpoint"
- Check confidence: "What's your confidence level on this fix?"

## Project Structure

After setup, your repository will have:

```
your-repo/
├── .github/
│   ├── agents/
│   │   └── task-master.agent.md          # Agent behavior definition
│   ├── workflows/
│   │   └── task-master.yml               # Optional CI/CD
│   └── README.md                         # Workflow documentation
├── .task-context/                        # Context files (gitignored)
│   ├── 1.json                           # Active task contexts
│   ├── 2.json
│   ├── completed/                       # Historical data
│   │   ├── 1.json
│   │   └── 2.json
│   └── 1/
│       └── docs/                        # Cached documentation
│           ├── architecture.md
│           └── api-design.md
├── node_modules/
│   └── @taskmaster/
│       └── mcp-server/                  # MCP server (if local)
└── package.json
```

## Configuration Reference

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GH_PROJECT_NUMBER` | `1` | GitHub Project board number |
| `GH_TASK_CONTEXT_DIR` | `.task-context` | Directory for context files |
| `GH_STATUS_FIELD` | `Status` | Project board status field name |
| `GH_STATUS_BACKLOG` | `Backlog` | Backlog column name |
| `GH_STATUS_IN_PROGRESS` | `In Progress` | In progress column name |
| `GH_STATUS_REVIEW` | `Review` | Review column name |
| `GH_STATUS_BLOCKED` | `Blocked` | Blocked column name |
| `GH_STATUS_DONE` | `Done` | Done column name |
| `GH_TASK_MAX_TEST_ATTEMPTS` | `5` | Max test iterations before blocking |
| `GH_TASK_CHECKPOINT_COOLDOWN` | `600` | Seconds between checkpoints |

### Project Board Setup

Your GitHub Project should have columns matching the status names:

```
┌──────────┬──────────────┬────────┬─────────┬──────┐
│ Backlog  │ In Progress  │ Review │ Blocked │ Done │
└──────────┴──────────────┴────────┴─────────┴──────┘
```

Customize column names by setting environment variables.

### Gitignore Recommendations

Add to your `.gitignore`:

```
# Task-Master Framework
.task-context/
!.task-context/.gitkeep
.task-context/*/
```

This keeps context files local while allowing the directory structure to be tracked.

## Troubleshooting

### "Command not found: gh-task-*"

**Problem:** Shell aliases not loaded

**Solution:**
```bash
source ~/.zshrc  # or ~/.bashrc
gh-task-verify
```

### "GitHub authentication: Not configured"

**Problem:** Not logged into GitHub CLI

**Solution:**
```bash
gh auth login
gh auth refresh -s project
gh auth status
```

### "Project board not found"

**Problem:** Wrong project number or no access

**Solution:**
```bash
# List your projects
gh project list

# Update configuration
export GH_PROJECT_NUMBER=<correct_number>
echo 'export GH_PROJECT_NUMBER=<correct_number>' >> ~/.zshrc
```

### "MCP server not connecting"

**Problem:** Incorrect configuration or server not running

**Solution:**
```bash
# Test MCP server standalone
task-master-mcp

# Check Claude config path (macOS)
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Restart Claude Desktop
killall Claude && open -a Claude

# Check logs
tail -f ~/Library/Logs/Claude/mcp*.log
```

### "Tests failing immediately"

**Problem:** Project dependencies not installed

**Solution:**
```bash
npm install  # or yarn install
gh-task-test <issue_id>
```

### "Context file corrupted"

**Problem:** Invalid JSON in context file

**Solution:**
```bash
# Validate context
jq '.' .task-context/42.json

# If corrupted, reinitialize
rm .task-context/42.json
gh-task-start 42
```

## Upgrading

### CLI Tools

```bash
# Download latest version
curl -o gh-cli-integration.sh https://raw.githubusercontent.com/your-org/task-master/main/gh-cli-integration.sh

# Replace old version in shell config
# Remove old section and append new
source ~/.zshrc
```

### MCP Server

```bash
npm update -g @taskmaster/mcp-server

# Or for local install
npm update @taskmaster/mcp-server
```

### Agent Profile

```bash
# Download latest
curl -o .github/agents/task-master.agent.md \
  https://raw.githubusercontent.com/your-org/task-master/main/task-master.agent.md

# Commit and push
git add .github/agents/task-master.agent.md
git commit -m "chore: update agent profile to v2.1"
git push
```

## Best Practices

### For Developers

1. **Write Clear Issues**
   - Include acceptance criteria
   - Add relevant labels
   - Link related issues
   - Provide context

2. **Review Agent Work Promptly**
   - Check notifications for agent comments
   - Provide clear feedback
   - Approve or request changes quickly

3. **Maintain the Board**
   - Keep status columns up to date
   - Close stale issues
   - Archive completed work

### For Agents

1. **Always Analyze First**
   - Run `analyze_issue` before starting
   - Check for similar past work
   - Verify documentation availability

2. **Express Uncertainty**
   - Use confidence scores honestly
   - Request partial reviews when unsure
   - Block early if stuck

3. **Communicate Proactively**
   - Post checkpoints at milestones
   - Update context frequently
   - Ask questions before making assumptions

### For Teams

1. **Standardize Workflows**
   - Agree on column names
   - Define label conventions
   - Document project-specific patterns

2. **Build Knowledge Base**
   - Archive successful approaches
   - Document common patterns
   - Share learnings across team

3. **Monitor Agent Performance**
   - Review confidence accuracy
   - Track time estimates
   - Identify improvement areas

## Getting Help

- **Documentation:** [GitHub Wiki](https://github.com/your-org/task-master/wiki)
- **Issues:** [Report bugs](https://github.com/your-org/task-master/issues)
- **Discussions:** [Community forum](https://github.com/your-org/task-master/discussions)
- **Discord:** [Join our server](https://discord.gg/taskmaster)

## Next Steps

1. **Read the Agent Profile:** Understand how the agent thinks (`.github/agents/task-master.agent.md`)
2. **Try the Examples:** Work through the complete workflow guide
3. **Customize for Your Team:** Adapt column names, labels, and workflows
4. **Enable Your AI Agent:** Configure Claude or other MCP-compatible agents
5. **Start Small:** Begin with simple tasks before complex features
6. **Provide Feedback:** Help us improve the framework

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Code of conduct
- Development setup
- Pull request process
- Coding standards

## License

MIT License - see [LICENSE](LICENSE) for details

---

**Ready to build?** Run `gh-task-verify` to confirm everything is set up correctly, then start your first task with `gh-task-start <issue_id>`!

🤖 Happy agentic development!