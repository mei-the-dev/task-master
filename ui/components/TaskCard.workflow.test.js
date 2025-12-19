// Test: UI Component Workflow Life Cycle
// This test validates the full development workflow for a UI component (TaskCard)
// including issue creation, branch, implementation, checkpoint, block, test, PR, and merge.

const { execSync } = require('child_process');
const fs = require('fs');

describe('TaskCard UI Component Workflow', () => {
  const issueId = 12345;
  const componentPath = 'ui/components/TaskCard.js';
  const testPath = 'ui/components/TaskCard.test.js';

  beforeAll(() => {
    // Simulate issue creation (would be done via GitHub UI or CLI)
    // For test, just ensure context file does not exist
    if (fs.existsSync(`.task-context/${issueId}.json`)) {
      fs.unlinkSync(`.task-context/${issueId}.json`);
    }
  });

  test('Start task via CLI', () => {
    const output = execSync(`bin/gh-task-start ${issueId}`).toString();
    expect(output).toMatch(/Task started successfully/);
    expect(fs.existsSync(`.task-context/${issueId}.json`)).toBe(true);
  });

  test('Develop component', () => {
    fs.writeFileSync(componentPath, 'export default function TaskCard() { return <div>TaskCard</div>; }');
    expect(fs.existsSync(componentPath)).toBe(true);
  });

  test('Checkpoint progress', () => {
    const output = execSync(`bin/gh-task-checkpoint ${issueId} "Initial layout done"`).toString();
    expect(output).toMatch(/Checkpoint created/);
  });

  test('Block task if needed', () => {
    const output = execSync(`bin/gh-task-block ${issueId} "Waiting for API"`).toString();
    expect(output).toMatch(/marked as blocked/);
  });

  test('Write and run minimal test', () => {
    fs.writeFileSync(testPath, `import TaskCard from './TaskCard';
test('renders TaskCard', () => {
  expect(typeof TaskCard).toBe('function');
});`);
    const jestOutput = execSync('npm test ui/components/TaskCard.test.js').toString();
    expect(jestOutput).toMatch(/PASS/);
  });

  test('Submit for review', () => {
    const output = execSync(`bin/gh-task-pr ${issueId}`).toString();
    expect(output).toMatch(/PR created/);
  });
});
