// Example tool implementation: startTask
import { execCommand } from '../utils/exec.js';
import { writeContext } from '../context.js';

export async function startTask(issueId, issue) {
  const branchName = `task-${issueId}-${issue.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  let branchExists = false;
  try {
    await execCommand(`git show-ref --verify --quiet refs/heads/${branchName}`);
    branchExists = true;
  } catch {}
  if (branchExists) {
    await execCommand(`git checkout ${branchName}`);
  } else {
    await execCommand(`git checkout -b ${branchName}`);
  }
  const context = {
    issue_id: issueId,
    started_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    status: "in_progress",
    branch: branchName,
    requirements: { primary: issue.title, acceptance_criteria: [] },
    technical_context: { root_cause: "", affected_files: [], dependencies: [] },
    progress: { completed_steps: [], current_step: "Analysis", blockers: [], confidence: 0.8 },
    testing: { test_cases: [], coverage_target: 0.8, performance_requirements: [] },
    documentation: { api_docs: [], user_docs: [], architecture_decisions: [] }
  };
  await writeContext(issueId, context);
  return context;
}
