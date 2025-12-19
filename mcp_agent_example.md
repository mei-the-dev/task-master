# AI Agent Using Task-Master MCP Server

This document shows how an AI agent (like Claude) uses the MCP server to autonomously work on a GitHub issue.

## Scenario: Agent Receives Assignment

**Human:** "@claude, can you work on issue #112? It's about adding input validation to the API."

## Agent's Internal Process

### Step 1: Discover Available Context

```typescript
// Agent automatically queries available resources
const resources = await mcp.listResources();

console.log(resources);
// Returns:
// {
//   resources: [
//     { uri: "task://context/87", name: "Task Context #87", ... },
//     { uri: "task://context/94", name: "Task Context #94", ... },
//     { uri: "task://completed/72", name: "Completed Task #72", ... },
//     { uri: "task://completed/58", name: "Completed Task #58", ... }
//   ]
// }
```

**Agent's Reasoning:** "I can see there are some active tasks and completed tasks. Let me analyze the new issue first."

### Step 2: Analyze Issue #112

```typescript
const analysis = await mcp.callTool("analyze_issue", {
  issue_id: 112
});

console.log(JSON.parse(analysis.content[0].text));
// Returns:
// {
//   "issue_id": 112,
//   "completeness": true,
//   "has_acceptance_criteria": true,
//   "has_labels": true,
//   "similar_tasks": [72, 85],
//   "documentation_found": ["validation-patterns.md", "api-design.md"],
//   "confidence": "HIGH",
//   "recommendations": [
//     "Review #72 for similar validation pattern",
//     "Use Joi library (standard in this codebase)"
//   ]
// }
```

**Agent's Reasoning:** "Excellent! High confidence. There's a similar task #72 I can learn from. Let me check what approach worked there."

### Step 3: Learn from Similar Task

```typescript
const historicalContext = await mcp.readResource("task://completed/72");
const history = JSON.parse(historicalContext.contents[0].text);

console.log(history);
// Returns:
// {
//   "issue_id": 72,
//   "outcome": "successful",
//   "patterns_used": [
//     "Joi schema validation",
//     "Custom error messages",
//     "Middleware pattern"
//   ],
//   "confidence_accuracy": {
//     "predicted": { "fix_correctness": 0.85 },
//     "actual": { "fix_correctness": 0.95 }
//   },
//   "time_taken": "1h 45m",
//   "lessons_learned": [
//     "Joi validation works well for this API",
//     "Keep schemas in separate files for reusability",
//     "Add custom error messages for better UX"
//   ]
// }
```

**Agent's Reasoning:** "Perfect! #72 used Joi validation successfully. I'll follow that pattern. Expected time: ~2 hours based on their experience."

### Step 4: Start the Task

```typescript
const startResult = await mcp.callTool("start_task", {
  issue_id: 112
});

console.log(startResult.content[0].text);
// "Task started successfully!
//  Branch: feat/112-api-input-validation
//  Status: in_progress
//  Context: .task-context/112.json"
```

**Agent Posts to Issue:**
> 🤖 **Task-Master Agent Initialized**
> 
> **Branch:** `feat/112-api-input-validation`  
> **Status:** In Progress  
> **Started:** 2024-12-18 15:30:00 UTC
>
> **My Understanding:**
> Add input validation to API endpoints using Joi schema validation.
>
> **Approach:**
> Based on successful pattern from #72, I'll implement Joi validation middleware
> with custom error messages. Expected time: ~2 hours.
>
> **Confidence:** HIGH (0.85) - proven pattern from similar task
>
> Beginning implementation...

### Step 5: Access Cached Documentation

```typescript
// MCP server auto-fetched docs during start_task
const docs = await mcp.readResource("task://docs/112/validation-patterns.md");

console.log(docs.contents[0].text);
// Returns full markdown content of validation patterns doc
```

**Agent's Reasoning:** "Good, the docs explain the validation pattern. Let me also check the context to see what's been cached."

```typescript
const context = await mcp.readResource("task://context/112");
const ctx = JSON.parse(context.contents[0].text);

console.log(ctx.mcp_resources_accessed);
// [
//   "docs/architecture/validation-patterns.md",
//   "docs/api-design.md",
//   ".github/CONTRIBUTING.md"
// ]
```

### Step 6: Implementation (Agent writes code)

```javascript
// Agent creates validation schemas
// src/validators/user.validator.js

import Joi from 'joi';

export const createUserSchema = Joi.object({
  email: Joi.string().email().required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  name: Joi.string().min(2).max(100).required()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters'
    }),
  age: Joi.number().integer().min(0).max(150).optional()
});

// Agent creates middleware
// src/middleware/validate.js

export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({ errors });
    }
    
    next();
  };
};

// Agent updates API routes
// src/routes/users.js

import { validate } from '../middleware/validate.js';
import { createUserSchema } from '../validators/user.validator.js';

router.post('/users', validate(createUserSchema), createUser);
```

**Agent Updates Context:**

```typescript
await mcp.callTool("update_context", {
  issue_id: 112,
  updates: {
    technical_context: {
      implementation_approach: "Joi middleware pattern from #72",
      files_created: [
        "src/validators/user.validator.js",
        "src/middleware/validate.js"
      ],
      files_modified: [
        "src/routes/users.js"
      ]
    },
    progress: {
      completed: ["Schema design", "Middleware implementation"],
      in_progress: ["Writing tests"]
    },
    confidence_scores: {
      fix_correctness: 0.90,
      test_coverage: 0.50  // Haven't written tests yet
    }
  }
});
```

### Step 7: Writing Tests

```javascript
// Agent writes comprehensive tests
// test/validators/user.validator.test.js

import { createUserSchema } from '../../src/validators/user.validator.js';

describe('User Validator', () => {
  describe('createUserSchema', () => {
    it('should validate correct user data', () => {
      const validUser = {
        email: 'test@example.com',
        name: 'John Doe',
        age: 25
      };
      
      const { error } = createUserSchema.validate(validUser);
      expect(error).toBeUndefined();
    });
    
    it('should reject invalid email', () => {
      const invalidUser = {
        email: 'not-an-email',
        name: 'John Doe'
      };
      
      const { error } = createUserSchema.validate(invalidUser);
      expect(error).toBeDefined();
      expect(error.details[0].message).toContain('valid email');
    });
    
    // ... more tests
  });
});
```

### Step 8: Run Tests (First Attempt)

```typescript
const testResult = await mcp.callTool("run_tests", {
  issue_id: 112
});

console.log(JSON.parse(testResult.content[0].text));
// {
//   "passed": false,
//   "iteration": 1,
//   "pattern_detected": "missing_import",
//   "output": "Error: Cannot find module 'joi'"
// }
```

**Agent's Reasoning:** "Ah, Joi isn't installed. Let me add it to package.json and run tests again."

```bash
npm install joi
```

### Step 9: Run Tests (Second Attempt)

```typescript
const testResult2 = await mcp.callTool("run_tests", {
  issue_id: 112
});

console.log(JSON.parse(testResult2.content[0].text));
// {
//   "passed": true,
//   "iteration": 2,
//   "pattern_detected": "unknown",
//   "output": "All 24 tests passing..."
// }
```

**Agent Updates Context:**

```typescript
await mcp.callTool("update_context", {
  issue_id: 112,
  updates: {
    confidence_scores: {
      fix_correctness: 0.95,
      test_coverage: 0.90,
      performance_impact: 0.85
    },
    test_iterations: [
      {
        attempt: 1,
        result: "failed",
        failure_type: "missing_import",
        lesson_learned: "Joi dependency not installed"
      },
      {
        attempt: 2,
        result: "passed",
        fix_applied: "Added Joi to package.json"
      }
    ],
    progress: {
      completed: [
        "Schema design",
        "Middleware implementation",
        "Comprehensive tests",
        "Dependency installation"
      ],
      in_progress: [],
      blocked: []
    }
  }
});
```

### Step 10: Create Checkpoint Before Documentation

```typescript
await mcp.callTool("create_checkpoint", {
  issue_id: 112,
  message: "validation working and tested, updating docs"
});
```

**Posted to Issue:**
> 💾 **Checkpoint**
>
> Progress: validation working and tested, updating docs
>
> Branch: `feat/112-api-input-validation`  
> Time: 2024-12-18 16:45:00 UTC

### Step 11: Update Documentation

```javascript
// Agent updates API documentation
// docs/api/users.md

## POST /users

Creates a new user.

### Request Body

```json
{
  "email": "user@example.com",    // required, valid email
  "name": "John Doe",              // required, 2-100 chars
  "age": 25                        // optional, 0-150
}
```

### Validation Rules

- **email**: Must be a valid email format
- **name**: 2-100 characters, required
- **age**: Integer between 0-150, optional

### Error Response (400 Bad Request)

```json
{
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    }
  ]
}
```
```

### Step 12: Submit for Review

```typescript
const reviewResult = await mcp.callTool("submit_for_review", {
  issue_id: 112
});

console.log(reviewResult.content[0].text);
// "PR created for issue #112
//  Confidence scores:
//  {
//    "fix_correctness": 0.95,
//    "test_coverage": 0.90,
//    "performance_impact": 0.85
//  }"
```

**Generated PR Description:**

> ## Description
> Adds comprehensive input validation to API endpoints using Joi schema validation.
>
> ## Related Issue
> Closes #112
>
> ## Solution
> - Implemented Joi validation schemas for user endpoints
> - Created reusable validation middleware
> - Added custom error messages for better UX
> - Updated API documentation
>
> **Pattern Used:** Based on successful approach from #72
>
> ## Changes Made
> - `src/validators/user.validator.js`: Joi schemas
> - `src/middleware/validate.js`: Validation middleware
> - `src/routes/users.js`: Applied validation to routes
> - `test/validators/user.validator.test.js`: Comprehensive tests
> - `docs/api/users.md`: Updated documentation
> - `package.json`: Added Joi dependency
>
> ## Testing
> - ✅ Unit tests: 24/24 passing
> - ✅ Integration tests: All endpoints validated
> - ✅ Error messages verified
>
> **Test Iterations:** 2
> - Iteration 1: Missing Joi dependency (fixed)
> - Iteration 2: All passing ✅
>
> ## Confidence Assessment
> | Aspect | Confidence | Notes |
> |--------|-----------|-------|
> | Fix Correctness | HIGH (95%) | Pattern proven in #72 |
> | Test Coverage | HIGH (90%) | All cases covered |
> | Performance | HIGH (85%) | Minimal overhead |
>
> ## Similar Work
> - #72: Used same Joi pattern (100% success)
>
> ## Context
> - **Started:** 2024-12-18 15:30:00 UTC
> - **Time spent:** 1h 45m
> - **Test iterations:** 2
> - **Checkpoints:** 1 (before docs)
> - **Context preserved:** `.task-context/112.json`
>
> ---
> 🤖 Generated by Task-Master Agent v2.0

**Posted to Issue:**

> 🤖 **Task Ready for Review**
>
> **PR:** #245  
> **Branch:** `feat/112-api-input-validation`  
> **Status:** Review  
> **Completed:** 2024-12-18 17:15:00 UTC  
> **Time Spent:** 1h 45m
>
> **Summary:**
> Implemented Joi validation based on proven pattern from #72. All tests passing
> with comprehensive error handling.
>
> **Confidence Scores:**
> - ✅ Fix Correctness: 0.95 (HIGH)
> - ✅ Test Coverage: 0.90 (HIGH)
> - ✅ Performance: 0.85 (HIGH)
>
> **Test Journey:**
> - Iteration 1: Missing Joi dependency (added to package.json)
> - Iteration 2: All passing ✅
>
> **Time Estimate vs Actual:**
> - Estimated: ~2 hours (from #72 history)
> - Actual: 1h 45m
> - Accuracy: 87.5%
>
> ---
> **Human Actions Required:**
> - [ ] Review validation approach
> - [ ] Verify error messages are user-friendly
> - [ ] Approve when satisfied
> - [ ] Merge (human-only)

### Step 13: Human Reviews and Provides Feedback

**Human Comment on PR:**
> Looks great! One small request: can you also add validation for the PATCH /users/:id endpoint? It should allow partial updates (all fields optional).

### Step 14: Agent Responds to Feedback

**Agent's Reasoning:** "The human wants additional validation. This is within scope and straightforward. I'll update the implementation."

```typescript
// Agent updates context
await mcp.callTool("update_context", {
  issue_id: 112,
  updates: {
    human_interactions: [
      {
        timestamp: "2024-12-18T17:30:00Z",
        type: "feedback",
        request: "Add PATCH endpoint validation",
        response: "Implementing now"
      }
    ],
    progress: {
      in_progress: ["Adding PATCH validation"]
    }
  }
});
```

**Agent Implements Additional Validation:**

```javascript
// src/validators/user.validator.js

export const updateUserSchema = Joi.object({
  email: Joi.string().email().optional()
    .messages({
      'string.email': 'Please provide a valid email address'
    }),
  name: Joi.string().min(2).max(100).optional(),
  age: Joi.number().integer().min(0).max(150).optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// src/routes/users.js

router.patch('/users/:id', validate(updateUserSchema), updateUser);
```

**Agent Commits and Pushes:**

```bash
git add .
git commit -m "feat(validation): add PATCH endpoint validation

- Created updateUserSchema with optional fields
- Applied to PATCH /users/:id route
- Added tests for partial updates

Refs: #112"
git push
```

**Agent Posts Update:**

> 🤖 **Feedback Addressed**
>
> Added PATCH endpoint validation with optional fields.
>
> **Changes:**
> - Created `updateUserSchema` (all fields optional)
> - Applied to `PATCH /users/:id`
> - Added 8 new tests for partial updates
> - All 32 tests now passing ✅
>
> Ready for re-review.

### Step 15: Human Approves and Merges

**Human:** "Perfect! LGTM 🚀"

```bash
# Human executes (not agent)
gh pr review 245 --approve
gh pr merge 245 --squash
```

### Step 16: Learning Phase (Automatic)

The MCP server automatically archives the context:

```typescript
// This happens automatically when PR is merged
// Context is moved to .task-context/completed/112.json

{
  "issue_id": 112,
  "outcome": "successful",
  "completed_at": "2024-12-18T17:45:00Z",
  "time_estimated": "~2 hours",
  "time_actual": "2h 15m",
  "estimation_accuracy": 0.889,
  "patterns_used": [
    "Joi validation middleware",
    "Custom error messages",
    "Reusable schema design"
  ],
  "confidence_accuracy": {
    "predicted": {
      "fix_correctness": 0.95,
      "test_coverage": 0.90,
      "performance_impact": 0.85
    },
    "actual": {
      "fix_correctness": 1.0,  // No bugs found
      "test_coverage": 0.95,   // Comprehensive
      "performance_impact": 0.90  // No complaints
    }
  },
  "test_iterations": 2,
  "checkpoints_used": 1,
  "human_interactions": 1,
  "human_feedback": "Perfect! LGTM",
  "lessons_learned": [
    "Joi pattern continues to work well (4th time, 100% success)",
    "Optional validation for PATCH is a common request",
    "Time estimation from similar tasks is accurate (89%)",
    "Single checkpoint before docs was sufficient"
  ],
  "improvement_notes": [
    "Could have anticipated PATCH validation in initial implementation",
    "Consider creating both POST and PATCH schemas upfront"
  ]
}
```

## Next Time This Agent Works on Validation

When issue #150 comes up about validation:

```typescript
const analysis = await mcp.callTool("analyze_issue", {
  issue_id: 150
});

// Similar task detection finds #112 and #72
const similar = await mcp.callTool("find_similar_tasks", {
  issue_id: 150
});

// Agent reads completed context
const context112 = await mcp.readResource("task://completed/112");

// Agent learns:
// - Use Joi validation
// - Create both POST and PATCH schemas upfront
// - Time estimate: ~2 hours
// - Expect potential feedback on PATCH validation
// - Confidence boost from 3 successful similar tasks
```

## Summary of MCP Benefits

1. **Context Persistence**: Agent maintains state across sessions
2. **Learning**: Agent learns from successful patterns
3. **Discovery**: Agent finds relevant resources automatically
4. **Confidence**: Agent expresses uncertainty appropriately
5. **Autonomy**: Agent works independently within safety boundaries
6. **Collaboration**: Agent requests help when needed
7. **Transparency**: All actions visible to humans
8. **Efficiency**: Agent avoids repeating mistakes

The MCP server provides the "memory" and "knowledge base" that transforms a stateless AI into an effective autonomous developer.