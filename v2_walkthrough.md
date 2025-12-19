# Task-Master v2.0: Complete Workflow Walkthrough

This document demonstrates all the new features in v2.0 through a realistic development scenario.

## Scenario: Fixing a Complex Bug

**Issue #87:** "API rate limiting not working correctly under high load"

**Labels:** `bug`, `high-priority`, `performance`

**Description:**
```
The API rate limiter allows burst requests that exceed configured limits. 
Under high load (>1000 req/s), the sliding window implementation fails to 
enforce limits correctly.

Acceptance Criteria:
- Rate limit must be enforced within 5% accuracy at all load levels
- No burst requests should exceed configured limit
- Performance overhead must be <1ms per request
- Must handle concurrent requests safely
```

---

## Phase 0: Pre-Flight Analysis (NEW)

Before writing any code, the agent performs comprehensive analysis:

```bash
$ gh-task-analyze 87
```

**Output:**

```
🔍 Analyzing issue #87...

📝 Issue Completeness:
  ✓ Title is descriptive
  ✓ Acceptance criteria present (4 items)
  ✓ Labels applied: bug, high-priority, performance
  ℹ Milestone: v3.2.0

🔗 Dependency Analysis:
  ✓ All mentioned packages appear to be available
  ℹ "sliding window" suggests algorithm-heavy implementation
  ℹ Performance testing may require load testing tools

📚 Similar Work Analysis:
  - #72: Rate limiter returning wrong counts (CLOSED - fixed)
    Pattern used: Redis atomic operations + Lua script
    Success rate: 100%
  - #58: Concurrent access race condition (CLOSED - fixed)
    Pattern used: Redis transactions
    Success rate: 100%
  - #41: Performance degradation under load (CLOSED - fixed)
    Pattern used: Connection pooling + caching
    Success rate: 100%

  💡 Recommendation: Review #72 and #58 for proven patterns
                    Redis Lua scripting seems to be the standard approach

📖 Documentation Availability:
  ✓ docs/architecture/rate-limiting.md (updated 3 weeks ago)
  ✓ docs/performance/load-testing.md (updated 1 month ago)
  ⚠ docs/redis-patterns.md (updated 9 months ago - may be stale)

⚠️  Conflict Detection:
  ⚠ Active branch touching same files:
     - feat/86-rate-limit-metrics (by @bob)
  
  💡 Recommendation: Coordinate with @bob before starting

❓ Ambiguity Check:
  ⚠ "Not working correctly" is vague - what's the exact failure mode?
  ? Is it a race condition, algorithm bug, or configuration issue?
  
  Suggested clarifications:
  - What's the actual behavior vs expected behavior?
  - Under what specific load conditions does it fail?
  - Are there error logs or metrics available?

🎯 Overall Assessment:
  Confidence: MEDIUM
  Blockers found: 1 (coordination with @bob needed)
  
  ⚠ Should coordinate with @bob and clarify failure mode before starting

Post this analysis to issue #87? (y/N)
```

**Decision:** I post the analysis and wait for clarification. Developer responds:

```markdown
@task-master-agent Thanks for the analysis! Here's the clarification:

- Failure mode: Under 1000+ req/s, rate limiter allows 120 req/100ms instead of 100
- Root cause (suspected): Sliding window buckets aren't being cleaned up atomically
- @bob's work is on metrics only, won't conflict with fix
- Proceed when ready
```

---

## Phase 1: Starting with Full Context

```bash
$ gh-task-start 87
```

**What Happens:**

1. **Context File Created:** `.task-context/87.json`
   ```json
   {
     "issue_id": 87,
     "started_at": "2024-12-18T10:00:00Z",
     "status": "in_progress",
     "branch": "fix/87-api-rate-limiting-under-load",
     "requirements": {
       "primary": "Fix rate limiting accuracy under high load",
       "acceptance_criteria": [
         "Within 5% accuracy at all loads",
         "No burst requests",
         "< 1ms overhead",
         "Thread-safe"
       ]
     },
     "technical_context": {
       "suspected_root_cause": "Non-atomic bucket cleanup in sliding window",
       "affected_files": ["src/middleware/rate-limiter.js"],
       "dependencies": ["redis", "ioredis"],
       "architecture_decision": "Use Lua script for atomic operations (proven in #72)"
     },
     "progress": {
       "completed": [],
       "in_progress": ["analysis", "reviewing similar issues"],
       "blocked": []
     },
     "confidence_scores": {
       "fix_correctness": 0.60,
       "test_coverage": 0.50,
       "performance_impact": 0.45
     },
     "similar_tasks": [
       {"issue": 72, "similarity": 0.92, "outcome": "successful", "pattern": "Redis Lua"},
       {"issue": 58, "similarity": 0.78, "outcome": "successful", "pattern": "Transactions"}
     ],
     "mcp_resources_accessed": []
   }
   ```

2. **Documentation Fetched:**
   ```
   📖 Fetching relevant documentation...
     ✓ Cached: docs/architecture/rate-limiting.md
     ✓ Cached: docs/performance/load-testing.md
     ✓ Cached: .github/CONTRIBUTING.md
   
   ✅ Cached 3 documents in .task-context/87/docs
   ```

3. **Issue Comment Posted:**
   ```markdown
   🤖 **Task-Master Agent Initialized**
   
   **Branch:** `fix/87-api-rate-limiting-under-load`  
   **Status:** In Progress  
   **Started:** 2024-12-18 10:00:00 UTC
   
   **My Understanding:**
   Rate limiter allows ~120 req/100ms under high load instead of enforced 100.
   Suspected cause: Non-atomic cleanup of sliding window buckets.
   
   **Approach:**
   Based on successful pattern from #72, I'll implement atomic operations using
   Redis Lua scripting to ensure bucket cleanup happens atomically with limit checks.
   
   **Confidence Levels:**
   - Fix approach: MEDIUM (0.60) - proven pattern, but complex implementation
   - Test coverage: MEDIUM (0.50) - will need load testing
   - Performance: MEDIUM (0.45) - Lua scripts may add latency, needs benchmarking
   
   **Relevant Documentation:**
   - 📖 docs/architecture/rate-limiting.md
   - 📖 docs/performance/load-testing.md
   
   Beginning implementation based on #72's Lua script pattern...
   ```

---

## Phase 2: Implementation with Test Iterations

I start coding and run into test failures:

```bash
$ gh-task-test 87
```

### Iteration 1: Initial Failure

```
🧪 Test Iteration #1

Running: npm test

❌ FAIL test/rate-limiter.test.js
  ● should enforce limit under concurrent load
    Expected 100 requests allowed, but got 112

🔍 Analysis:
Pattern detected: Race condition in concurrent tests (confidence: 0.75)

💡 Suggested fix:
Tests may be running too fast for Redis to process commands sequentially.
Try:
- Use Redis transactions (MULTI/EXEC)
- Add small delays between test requests
- Use Lua script for atomic test validation

Would you like me to:
[A] Apply suggested fix automatically
[H] Ask human for guidance  
[S] Skip and continue
```

I choose **[A] Apply suggested fix**

The agent modifies the Lua script to be more atomic and updates the test.

### Iteration 2: Different Failure

```bash
$ gh-task-test 87
```

```
🧪 Test Iteration #2

Running: npm test

❌ FAIL test/rate-limiter.test.js
  ● should clean up old buckets
    Timeout: async callback was not invoked within 5000ms

🔍 Analysis:
Pattern detected: Async timing issue (confidence: 0.85)
Similar failures: 3 in project history (all resolved by adding proper await)

💡 Suggested fix:
The cleanup is likely asynchronous but test expects synchronous completion.
Common solutions in this codebase:
- Add await for cleanup operation
- Use done() callback
- Increase timeout if cleanup is legitimately slow

Checking implementation...
Found: cleanup() returns Promise but test doesn't await it

Applying fix automatically...
```

The agent adds `await` to the test.

### Iteration 3: Success!

```bash
$ gh-task-test 87
```

```
🧪 Test Iteration #3

Running: npm test

✅ All tests passing!

Test Summary:
- 52 total tests
- 52 passing
- 0 failing
- Runtime: 3.2s

Updating confidence scores:
- Test coverage: 0.85 (HIGH) - all edge cases covered
- Fix correctness: 0.80 (HIGH) - tests validate atomic behavior

Context updated: .task-context/87.json
```

**Context Now Shows:**

```json
{
  "test_iterations": [
    {
      "attempt": 1,
      "result": "failed",
      "failure_type": "race_condition",
      "lesson_learned": "Concurrent tests need atomic operations"
    },
    {
      "attempt": 2,
      "result": "failed",
      "failure_type": "timing_issue",
      "lesson_learned": "cleanup() is async, tests must await"
    },
    {
      "attempt": 3,
      "result": "passed",
      "fix_applied": "Added proper await in test"
    }
  ],
  "confidence_scores": {
    "fix_correctness": 0.80,
    "test_coverage": 0.85,
    "performance_impact": 0.45  // Still low - haven't benchmarked yet
  }
}
```

---

## Phase 3: Checkpoint Before Performance Testing

Before I start complex performance testing, I save progress:

```bash
$ gh-task-checkpoint 87 "implemented Lua script fix, all tests passing, starting benchmarks"
```

**Posted to Issue:**

```markdown
💾 **Checkpoint**

Progress: implemented Lua script fix, all tests passing, starting benchmarks

Branch: `fix/87-api-rate-limiting-under-load`  
Time: 2024-12-18 11:45:00 UTC

---
🤖 Work in progress - not ready for review yet
```

**Why This Helps:**
- My work is safely committed
- If benchmarking reveals major issues, I can easily roll back
- Human can see progress without a full PR
- I maintain context even if interrupted

---

## Phase 4: Performance Concern → Partial Review

After benchmarking, I discover the Lua script adds 0.8ms latency:

```bash
$ gh-task-review-partial 87 performance
```

**Creates Draft PR:**

```markdown
## 🔍 Partial Review Request: PERFORMANCE

**Status:** Work in Progress (seeking early feedback)

**What I've Done:**
- Implemented atomic Lua script for rate limiting
- All functional tests passing (52/52)
- Fixed race conditions

**What I'm Asking:**
Performance benchmarks show 0.8ms added latency per request. Acceptance criteria 
specifies <1ms overhead, so we're within spec but close to the limit.

**Confidence:** MEDIUM (0.65)
- ✅ Fix is functionally correct
- ✅ Within performance requirements (barely)
- ⚠️ Uncertain if 0.8ms is acceptable given "high performance" label

**Benchmark Results:**
| Scenario | Before | After | Change |
|----------|--------|-------|--------|
| Low load (10 req/s) | 0.1ms | 0.2ms | +0.1ms |
| Medium load (100 req/s) | 0.3ms | 0.6ms | +0.3ms |
| High load (1000 req/s) | 0.5ms | 1.3ms | +0.8ms ⚠️ |

**Trade-offs:**
- **Current approach (Lua script):** Atomic + accurate, but 0.8ms overhead
- **Alternative (optimistic locking):** Faster (~0.3ms), but may miss edge cases
- **Alternative (local caching):** Very fast (~0.1ms), but less accurate

**My Recommendation:** 
Stick with Lua script since it's within spec and proven reliable in #72.
However, flagging for human review given the performance priority.

**Files Changed:**
- `src/middleware/rate-limiter.js` - Lua script implementation
- `test/rate-limiter.test.js` - Atomic tests
- `benchmark/rate-limiter-bench.js` - New benchmark suite

---
🤖 This is a partial review. I'll continue after feedback.

**To approve approach:** Comment "LGTM - proceed"  
**To request changes:** Provide specific guidance
```

**Human Response:**

```markdown
@task-master-agent Good catch on the performance! 0.8ms is acceptable for 
accuracy gains. The "high-priority" label is about fixing the bug, not 
micro-optimizations.

LGTM - proceed with full implementation.

BTW, excellent work on the benchmarking - exactly what we needed to see.
```

---

## Phase 5: Full Review with Rich Context

Now confident in my approach, I complete the work and submit for review:

```bash
$ gh-task-review 87
```

**Pre-Review Checklist:**

```
✓ Pre-Review Checklist:
  Tests: ✅ Passing (52/52)
  Linter: ✅ Clean
  Context: ✅ Complete
  Benchmarks: ✅ Run and documented
  
  Confidence scores:
    - Fix correctness: 0.90 (HIGH)
    - Test coverage: 0.85 (HIGH)
    - Performance: 0.75 (MEDIUM - approved by human)
```

**Generated PR Description:**

```markdown
## Description
Fixes rate limiting accuracy under high load by implementing atomic operations
using Redis Lua scripting. Under load >1000 req/s, the previous implementation
allowed burst requests due to non-atomic bucket cleanup.

## Related Issue
Closes #87

## Root Cause Analysis
The sliding window implementation was cleaning up old buckets in a separate
operation from the limit check. Under high concurrency, requests could slip
through during the cleanup window.

## Solution
- Implement atomic Lua script that combines bucket cleanup + limit check
- Use Redis EVALSHA for performance
- Add comprehensive load testing

**Why Lua Script:** Proven pattern from #72 (100% success rate)

## Changes Made
- `src/middleware/rate-limiter.js`: Atomic Lua script implementation
- `src/redis/scripts/rate-limit.lua`: New Lua script
- `test/rate-limiter.test.js`: Concurrent safety tests
- `benchmark/rate-limiter-bench.js`: Load testing suite
- `docs/architecture/rate-limiting.md`: Updated with new approach

## Testing Strategy
- ✅ Unit tests: All 52 passing including concurrency tests
- ✅ Load tests: Verified at 1000, 5000, 10000 req/s
- ✅ Accuracy test: 99.8% accuracy at all load levels (within 5% requirement)
- ✅ Thread safety: No race conditions in concurrent scenarios

**Test Iterations:** 3
- Iteration 1: Race condition in tests (fixed with atomic operations)
- Iteration 2: Async timing issue (fixed with proper await)
- Iteration 3: All passing ✅

## Performance Impact
⚠️ **Human Review Completed:** Performance overhead verified acceptable

| Load Level | Added Latency | Within Spec? |
|-----------|---------------|--------------|
| Low (10 req/s) | +0.1ms | ✅ Yes |
| Medium (100 req/s) | +0.3ms | ✅ Yes |
| High (1000 req/s) | +0.8ms | ✅ Yes (<1ms requirement) |

Performance trade-off accepted for accuracy gains (per human approval in
partial review).

## Confidence Assessment
| Aspect | Confidence | Notes |
|--------|-----------|-------|
| Fix Correctness | HIGH (90%) | Pattern proven in #72, all tests pass |
| Test Coverage | HIGH (85%) | Load tested up to 10K req/s |
| Performance | MEDIUM (75%) | Within spec, approved by human |
| Breaking Changes | HIGH (98%) | API unchanged |

## Similar Work
- #72: Rate limiter counting bug (used Lua script pattern)
  - Success rate: 100%
  - Same atomic operation approach
- #58: Concurrent access issue (used Redis transactions)
  - Inspired transaction safety approach

## Context
- **Started:** 2024-12-18 10:00:00 UTC
- **Time spent:** 3h 15m
- **Test iterations:** 3
- **Checkpoints created:** 1 (before benchmarking)
- **Partial reviews:** 1 (performance approval)
- **Context preserved:** `.task-context/87.json`

## Documentation
Updated:
- Architecture docs with new atomic approach
- Added inline comments for Lua script logic
- Documented performance characteristics

## Checklist
- [x] Tests passing (52/52)
- [x] Load tested at scale
- [x] Performance benchmarked and approved
- [x] Documentation updated
- [x] No breaking changes
- [x] Pattern from successful similar task (#72)
- [ ] Human review of implementation (REQUESTED)
- [ ] Human final approval (REQUIRED)

---
🤖 Generated by Task-Master Agent v2.0  
**Context:** `.task-context/87.json`  
**Test iterations:** 3  
**Similar successful work:** #72 (92% similarity)
```

**Issue Comment:**

```markdown
🤖 **Task Ready for Review**

**PR:** #203  
**Branch:** `fix/87-api-rate-limiting-under-load`  
**Status:** Review  
**Completed:** 2024-12-18 13:15:00 UTC  
**Time Spent:** 3h 15m

**Summary:**
Fixed rate limiting by implementing atomic Lua script based on proven pattern
from #72. Load tested up to 10K req/s with 99.8% accuracy.

**Confidence Scores:**
- ✅ Fix Correctness: 0.90 (HIGH)
- ✅ Test Coverage: 0.85 (HIGH)
- ⚠️ Performance Impact: 0.75 (MEDIUM - approved in partial review)

**Test Journey:**
- Iteration 1: Race condition (learned: need atomic test operations)
- Iteration 2: Async timing (learned: cleanup is async, must await)
- Iteration 3: All passing ✅

**Performance Note:**
Adds 0.8ms latency under high load. Within <1ms requirement and approved by
human in partial review.

**Context Preserved:** `.task-context/87.json`

---
**Human Actions Required:**
- [ ] Review Lua script implementation
- [ ] Verify benchmark methodology
- [ ] Approve when satisfied
- [ ] Merge (human-only)

**Estimated review time:** 30-45min (complex change with performance considerations)
```

---

## Phase 6: Human Review & Learning

The human reviews and approves:

```markdown
Excellent work! The Lua script is clean and well-documented. Benchmarks look
solid. Merging now.

Great job flagging the performance concern early - saved us a lot of back-and-forth.
```

```bash
$ gh-task-complete 87
```

**Learning Phase (Automatic):**

The context is archived to `.task-context/completed/87.json` with outcome data:

```json
{
  "issue_id": 87,
  "outcome": "successful",
  "completed_at": "2024-12-18T13:45:00Z",
  "time_estimated": "2-3 hours",
  "time_actual": "3h 15m",
  "estimation_accuracy": 0.92,
  "patterns_used": [
    "Redis Lua script for atomicity",
    "Load testing for performance validation",
    "Partial review for early feedback"
  ],
  "confidence_accuracy": {
    "predicted": {
      "fix_correctness": 0.90,
      "test_coverage": 0.85,
      "performance_impact": 0.75
    },
    "actual": {
      "fix_correctness": 1.0,
      "test_coverage": 0.95,
      "performance_impact": 0.80
    },
    "delta": {
      "fix_correctness": -0.10,
      "test_coverage": -0.10,
      "performance_impact": -0.05
    }
  },
  "test_iterations": 3,
  "checkpoints_used": 1,
  "partial_reviews_requested": 1,
  "human_feedback": "Excellent work, great job on early performance flag",
  "lessons_learned": [
    "Lua script pattern works well for this codebase (3rd time, 100% success)",
    "Performance benchmarking before full review prevents rework",
    "Partial reviews effective for complex trade-off decisions",
    "Test iteration pattern detection works well (saved time on iteration 2)"
  ]
}
```

---

## Later: Using Learned Context

A week later, a similar issue comes up:

```bash
$ gh-task-analyze 94
```

**Analysis Output:**

```
📚 Similar Work Analysis:
  - #87: Rate limiting accuracy under load (CLOSED - fixed) ⭐ HIGH SIMILARITY
    Pattern used: Redis Lua script + atomic operations
    Success rate: 100%
    Time taken: 3h 15m
    Confidence was: 90% → Actual: 100%
    
  💡 Recommendation: Use same Lua script pattern
                    Reference: .task-context/completed/87.json
                    Expected time: ~3 hours
                    
  🎯 Confidence Boost: Previous success increases predicted confidence to 0.85
```

---

## Summary of v2.0 Benefits Demonstrated

1. **Context Persistence:** Full history maintained across sessions
2. **Adaptive Learning:** Pattern detection improved fix on iteration 2
3. **Confidence Scoring:** Clear communication of certainty levels
4. **Incremental Checkpoints:** Safe progress saves without PR noise
5. **Partial Reviews:** Early feedback prevented wasted work on performance
6. **Rich Diagnostics:** Detailed blocker info when things go wrong
7. **Historical Learning:** Future similar tasks benefit from past success
8. **Time Estimation:** Learned patterns improve time estimates
9. **Proactive Analysis:** Prevented issues before starting work
10. **MCP Integration:** Auto-fetched relevant docs for context

The agent operated autonomously for most of the task but knew when to ask for human input (performance trade-off decision), resulting in efficient collaboration without micromanagement.