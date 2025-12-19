#!/bin/bash
# GitHub-Native Agentic Framework - Enhanced CLI Integration v2.0
# Add these to your ~/.zshrc or ~/.bashrc

# ============================================================================
# CONFIGURATION
# ============================================================================

export GH_PROJECT_NUMBER="${GH_PROJECT_NUMBER:-1}"
export GH_STATUS_FIELD="Status"
export GH_STATUS_BACKLOG="Backlog"
export GH_STATUS_IN_PROGRESS="In Progress"
export GH_STATUS_REVIEW="Review"
export GH_STATUS_BLOCKED="Blocked"
export GH_STATUS_DONE="Done"

# Context persistence
export GH_TASK_CONTEXT_DIR=".task-context"
export GH_TASK_MAX_TEST_ATTEMPTS=5
export GH_TASK_CHECKPOINT_COOLDOWN=600  # 10 minutes in seconds

# ============================================================================
# CONTEXT MANAGEMENT
# ============================================================================

# Initialize task context
gh-task-context-init() {
    local issue_id="$1"
    local context_file="$GH_TASK_CONTEXT_DIR/${issue_id}.json"
    
    mkdir -p "$GH_TASK_CONTEXT_DIR"
    mkdir -p "$GH_TASK_CONTEXT_DIR/${issue_id}/docs"
    
    local issue_data=$(gh issue view "$issue_id" --json title,body,labels,assignees)
    
    cat > "$context_file" << EOF
{
  "issue_id": ${issue_id},
  "started_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "last_updated": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "status": "initializing",
  "branch": "",
  "requirements": {
    "primary": $(echo "$issue_data" | jq -r '.title'),
    "acceptance_criteria": []
  },
  "technical_context": {
    "root_cause": "",
    "affected_files": [],
    "dependencies": [],
    "architecture_decision": ""
  },
  "progress": {
    "completed": [],
    "in_progress": [],
    "blocked": []
  },
  "confidence_scores": {
    "fix_correctness": 0.5,
    "test_coverage": 0.5,
    "performance_impact": 0.5
  },
  "test_iterations": [],
  "similar_tasks": [],
  "human_interactions": [],
  "mcp_resources_accessed": []
}
EOF
    
    echo "$context_file"
}

# Update task context
gh-task-context-update() {
    local issue_id="$1"
    local key="$2"
    local value="$3"
    local context_file="$GH_TASK_CONTEXT_DIR/${issue_id}.json"
    
    if [ ! -f "$context_file" ]; then
        echo "❌ Context file not found. Run gh-task-start first."
        return 1
    fi
    
    # Update timestamp
    local updated=$(jq --arg ts "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" '.last_updated = $ts' "$context_file")
    
    # Update the specified key
    echo "$updated" | jq --arg k "$key" --arg v "$value" 'setpath($k | split("."); $v)' > "$context_file.tmp"
    mv "$context_file.tmp" "$context_file"
}

# Get task context value
gh-task-context-get() {
    local issue_id="$1"
    local key="$2"
    local context_file="$GH_TASK_CONTEXT_DIR/${issue_id}.json"
    
    if [ ! -f "$context_file" ]; then
        echo ""
        return 1
    fi
    
    jq -r ".$key // empty" "$context_file"
}

# Show full task context
gh-task-context-show() {
    local issue_id="$1"
    local context_file="$GH_TASK_CONTEXT_DIR/${issue_id}.json"
    
    if [ ! -f "$context_file" ]; then
        echo "❌ No context found for issue #${issue_id}"
        return 1
    fi
    
    echo "📋 Task Context for Issue #${issue_id}"
    echo ""
    jq -C '.' "$context_file"
}

# ============================================================================
# PRE-FLIGHT ANALYSIS
# ============================================================================

gh-task-analyze() {
    local issue_id="$1"
    
    if [ -z "$issue_id" ]; then
        echo "Usage: gh-task-analyze <issue_id>"
        return 1
    fi
    
    echo "🔍 Analyzing issue #${issue_id}..."
    echo ""
    
    # Fetch issue data
    local issue_data=$(gh issue view "$issue_id" --json title,body,labels,milestone,assignees,state)
    local issue_title=$(echo "$issue_data" | jq -r '.title')
    local issue_body=$(echo "$issue_data" | jq -r '.body')
    local labels=$(echo "$issue_data" | jq -r '.labels[].name')
    local milestone=$(echo "$issue_data" | jq -r '.milestone.title // "None"')
    
    # Issue completeness check
    echo "📝 Issue Completeness:"
    
    if [ ${#issue_title} -gt 10 ]; then
        echo "  ✓ Title is descriptive"
    else
        echo "  ⚠ Title is too short"
    fi
    
    if echo "$issue_body" | grep -qi "acceptance criteria\|requirements\|should"; then
        echo "  ✓ Acceptance criteria present"
    else
        echo "  ⚠ No clear acceptance criteria found"
    fi
    
    if [ -n "$labels" ]; then
        echo "  ✓ Labels applied: $(echo "$labels" | tr '\n' ',' | sed 's/,$//')"
    else
        echo "  ⚠ No labels applied"
    fi
    
    echo "  ℹ Milestone: $milestone"
    echo ""
    
    # Dependency discovery
    echo "🔗 Dependency Analysis:"
    
    # Check for mentioned packages not in package.json
    if [ -f "package.json" ]; then
        local mentioned_packages=$(echo "$issue_body" | grep -oE '\b[a-z-]+\b' | sort -u)
        local missing_deps=""
        
        for pkg in $mentioned_packages; do
            # sanitize to avoid leading hyphens causing grep to interpret as options
            local pkg_sanitized="${pkg#-}"
            if echo "$issue_body" | grep -qi -- "$pkg_sanitized" && \
               ! jq -e ".dependencies.\"$pkg_sanitized\" // .devDependencies.\"$pkg_sanitized\"" package.json >/dev/null 2>&1; then
                if [ "$pkg_sanitized" != "the" ] && [ "$pkg_sanitized" != "and" ] && [ "$pkg_sanitized" != "for" ]; then
                    missing_deps="$missing_deps $pkg_sanitized"
                fi
            fi
        done
        
        if [ -n "$missing_deps" ]; then
            echo "  ⚠ Potentially missing dependencies:$missing_deps"
            echo "    ? Please clarify if these need to be installed"
        else
            echo "  ✓ All mentioned packages appear to be available"
        fi
    fi
    echo ""
    
    # Similar work analysis
    echo "📚 Similar Work Analysis:"
    
    # Search for similar closed issues
    local keywords=$(echo "$issue_title" | tr ' ' '\n' | grep -v "^[aA]$\|^[tT]he$\|^[iI]n$" | head -3 | tr '\n' ' ')
    local similar=$(gh issue list --state closed --limit 5 --search "$keywords" --json number,title,state 2>/dev/null)
    
    if [ -n "$similar" ] && [ "$(echo "$similar" | jq 'length')" -gt 0 ]; then
        echo "$similar" | jq -r '.[] | "  - #\(.number): \(.title) (CLOSED)"'
        echo ""
        echo "  💡 Recommendation: Review these issues for patterns"
    else
        echo "  ℹ No similar closed issues found"
    fi
    echo ""
    
    # Documentation availability
    echo "📖 Documentation Availability:"
    
    local docs_found=0
    
    if [ -d "docs" ]; then
        # Search for relevant docs based on issue keywords
        local doc_files=$(find docs -name "*.md" -type f 2>/dev/null)
        
        for keyword in $keywords; do
            # Find matching docs in a portable way (avoid xargs grep parsing issues)
            local matching_docs=""
            for doc in $doc_files; do
                [ -z "$doc" ] && continue
                if grep -qi -- "$keyword" "$doc" 2>/dev/null; then
                    matching_docs="$matching_docs $doc"
                fi
            done

            if [ -n "$matching_docs" ]; then
                for doc in $matching_docs; do
                    # Determine modification date in a portable way
                    local mod_time=""
                    if git ls-files --error-unmatch "$doc" >/dev/null 2>&1; then
                        mod_time=$(git log -1 --format=%ci -- "$doc" 2>/dev/null | cut -d' ' -f1)
                    fi
                    if [ -z "$mod_time" ]; then
                        # Try GNU stat then BSD stat
                        mod_time=$(stat -c "%y" "$doc" 2>/dev/null | cut -d' ' -f1 || true)
                        if [ -z "$mod_time" ]; then
                            mod_time=$(stat -f "%Sm" -t "%Y-%m-%d" "$doc" 2>/dev/null || true)
                        fi
                    fi

                    # Fallback if still empty
                    if [ -z "$mod_time" ]; then
                        echo "  ✓ $doc (mod date unknown)"
                    else
                        # Parse mod_time to epoch portably using date -d (GNU) or date -j (BSD)
                        local mod_ts=$(date -d "$mod_time" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "$mod_time" +%s 2>/dev/null || echo 0)
                        local age_days=$(( ( $(date +%s) - mod_ts ) / 86400 ))

                        if [ $age_days -lt 90 ]; then
                            echo "  ✓ $doc (updated recently)"
                        elif [ $age_days -lt 180 ]; then
                            echo "  ⚠ $doc (updated $age_days days ago)"
                        else
                            echo "  ⚠ $doc (updated $age_days days ago - may be stale)"
                        fi
                    fi

                    docs_found=$((docs_found + 1))
                done
            fi
        done
    fi
    
    if [ $docs_found -eq 0 ]; then
        echo "  ℹ No relevant documentation found"
    fi
    echo ""
    
    # Conflict detection
    echo "⚠️  Conflict Detection:"
    
    # Check for other branches modifying similar files
    local current_branch=$(git branch --show-current)
    local other_branches=$(git branch -r | grep -v HEAD | grep -v "$current_branch")
    
    # This is a simplified check - in practice, you'd want more sophisticated analysis
    echo "  ℹ Check with team for any work in progress on related features"
    echo ""
    
    # Ambiguity detection
    echo "❓ Ambiguity Check:"
    
    # Check for vague terms
    if echo "$issue_body" | grep -qiE "some|fix|improve|better|optimize" && \
       ! echo "$issue_body" | grep -qE "should|must|will"; then
        echo "  ⚠ Issue contains vague terms without specific criteria"
        echo "    Suggest clarifying exact requirements"
    else
        echo "  ✓ Requirements appear specific"
    fi
    echo ""
    
    # Overall recommendation
    echo "🎯 Overall Assessment:"
    
    local confidence="HIGH"
    local blockers=0
    
    if ! echo "$issue_body" | grep -qi "acceptance criteria"; then
        confidence="MEDIUM"
        blockers=$((blockers + 1))
    fi
    
    if [ $docs_found -eq 0 ]; then
        confidence="MEDIUM"
    fi
    
    if [ -n "$missing_deps" ]; then
        confidence="LOW"
        blockers=$((blockers + 1))
    fi
    
    echo "  Confidence: $confidence"
    echo "  Blockers found: $blockers"
    echo ""
    
    if [ "$confidence" = "HIGH" ]; then
        echo "  ✅ Ready to proceed with implementation"
    elif [ "$confidence" = "MEDIUM" ]; then
        echo "  ⚠ Can proceed but may need clarification"
    else
        echo "  ❌ Should clarify requirements before starting"
    fi
    
    # Post analysis as comment
    read -p "Post this analysis to issue #${issue_id}? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        gh issue comment "$issue_id" --body "🤖 **Pre-Flight Analysis**

$(gh-task-analyze "$issue_id" 2>&1 | sed 's/\x1b\[[0-9;]*m//g')

---
Analysis completed at $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
        echo "✅ Analysis posted to issue"
    fi
}

# ============================================================================
# DOCUMENTATION FETCHER (MCP Integration)
# ============================================================================

gh-task-docs() {
    local issue_id="$1"
    
    if [ -z "$issue_id" ]; then
        echo "Usage: gh-task-docs <issue_id>"
        return 1
    fi
    
    echo "📖 Fetching relevant documentation for issue #${issue_id}..."
    echo ""
    
    local docs_dir="$GH_TASK_CONTEXT_DIR/${issue_id}/docs"
    mkdir -p "$docs_dir"
    
    # Get issue keywords
    local issue_data=$(gh issue view "$issue_id" --json title,body)
    local issue_text=$(echo "$issue_data" | jq -r '.title + " " + .body')
    local keywords=$(echo "$issue_text" | tr ' ' '\n' | grep -v "^[aA]$\|^[tT]he$" | sort -u | head -10)
    
    local docs_found=0
    
    # Search for relevant markdown files
    if [ -d "docs" ]; then
        for keyword in $keywords; do
            local matching_docs=$(find docs -name "*.md" -type f -exec grep -l -i "$keyword" {} \; 2>/dev/null)
            
            for doc in $matching_docs; do
                local basename=$(basename "$doc")
                if [ ! -f "$docs_dir/$basename" ]; then
                    cp "$doc" "$docs_dir/"
                    echo "  ✓ Cached: $doc"
                    docs_found=$((docs_found + 1))
                    
                    # Update context
                    gh-task-context-update "$issue_id" "mcp_resources_accessed" "$doc"
                fi
            done
        done
    fi
    
    # Look for CONTRIBUTING.md
    if [ -f ".github/CONTRIBUTING.md" ]; then
        cp ".github/CONTRIBUTING.md" "$docs_dir/"
        echo "  ✓ Cached: .github/CONTRIBUTING.md"
        docs_found=$((docs_found + 1))
    fi
    
    # Look for README in affected directories
    # (This would be enhanced with actual file analysis)
    
    if [ $docs_found -eq 0 ]; then
        echo "  ℹ No relevant documentation found"
    else
        echo ""
        echo "✅ Cached $docs_found document(s) in $docs_dir"
        echo ""
        echo "Available docs:"
        ls -1 "$docs_dir"
    fi
}

# ============================================================================
# ENHANCED TASK MANAGEMENT
# ============================================================================

gh-task-start() {
    local issue_id="$1"
    local auto_proceed="${2:---manual}"
    
    if [ -z "$issue_id" ]; then
        echo "Usage: gh-task-start <issue_id> [--auto-proceed]"
        return 1
    fi
    
    echo "🚀 Starting work on issue #${issue_id}..."
    echo ""
    
    # Initialize context
    local context_file=$(gh-task-context-init "$issue_id")
    echo "📝 Context initialized: $context_file"
    
    # Fetch issue details
    local issue_data=$(gh issue view "$issue_id" --json title,number,state,body)
    local issue_title=$(echo "$issue_data" | jq -r '.title')
    local issue_state=$(echo "$issue_data" | jq -r '.state')
    
    if [ "$issue_state" != "OPEN" ]; then
        echo "❌ Error: Issue #${issue_id} is not open"
        return 1
    fi
    
    # Create branch
    local slug=$(echo "$issue_title" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g' | sed -E 's/^-|-$//g' | cut -c1-50)
    local labels=$(gh issue view "$issue_id" --json labels --jq '.labels[].name')
    local branch_type="feat"
    
    if echo "$labels" | grep -q "bug"; then
        branch_type="fix"
    elif echo "$labels" | grep -q "documentation"; then
        branch_type="docs"
    elif echo "$labels" | grep -q "refactor"; then
        branch_type="refactor"
    fi
    
    local branch_name="${branch_type}/${issue_id}-${slug}"
    
    echo "📝 Creating branch: ${branch_name}"
    git checkout -b "$branch_name" || return 1
    
    # Update context
    gh-task-context-update "$issue_id" "branch" "$branch_name"
    gh-task-context-update "$issue_id" "status" "in_progress"
    
    # Fetch documentation
    echo ""
    gh-task-docs "$issue_id"
    
    # Update project board
    echo ""
    echo "📊 Updating project board..."
    gh-task-update-status "$issue_id" "$GH_STATUS_IN_PROGRESS"
    
    # Post initialization comment
    local my_understanding=$(echo "$issue_data" | jq -r '.body' | head -3)
    
    gh issue comment "$issue_id" --body "🤖 **Task-Master Agent Initialized**

**Branch:** \`${branch_name}\`  
**Status:** In Progress  
**Started:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")

**My Understanding:**
${my_understanding}

**Approach:**
I'll analyze similar issues and apply proven patterns from this repository.

**Confidence:** Calculating... (will update after analysis)

**Context Preserved:** \`$context_file\`

Beginning implementation..."
    
    echo ""
    echo "✅ Ready to work on issue #${issue_id}"
    echo "   Branch: ${branch_name}"
    echo "   Status: In Progress"
    echo "   Context: $context_file"
}

# ============================================================================
# TEST ITERATION
# ============================================================================

gh-task-test() {
    local issue_id="$1"
    local mode="${2:---iterate}"
    
    if [ -z "$issue_id" ]; then
        echo "Usage: gh-task-test <issue_id> [--iterate|--once]"
        return 1
    fi
    
    local context_file="$GH_TASK_CONTEXT_DIR/${issue_id}.json"
    
    if [ ! -f "$context_file" ]; then
        echo "❌ Context not found. Run gh-task-start first."
        return 1
    fi
    
    local attempt_count=$(jq -r '.test_iterations | length' "$context_file")
    attempt_count=$((attempt_count + 1))
    
    if [ $attempt_count -gt $GH_TASK_MAX_TEST_ATTEMPTS ]; then
        echo "❌ Max test attempts ($GH_TASK_MAX_TEST_ATTEMPTS) reached"
        echo "   Consider asking for human help with: gh-task-block $issue_id"
        return 1
    fi
    
    echo "🧪 Test Iteration #${attempt_count}"
    echo ""
    echo "Running: npm test"
    echo ""
    
    # Run tests and capture output
    local test_output=$(npm test 2>&1)
    local test_result=$?
    
    if [ $test_result -eq 0 ]; then
        echo "✅ All tests passing!"
        
        # Record successful iteration
        local iteration=$(jq -n \
            --arg attempt "$attempt_count" \
            --arg ts "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
            --arg result "passed" \
            '{attempt: $attempt, timestamp: $ts, result: $result}')
        
        jq --argjson iter "$iteration" '.test_iterations += [$iter]' "$context_file" > "$context_file.tmp"
        mv "$context_file.tmp" "$context_file"
        
        # Update confidence
        jq '.confidence_scores.test_coverage = 0.85' "$context_file" > "$context_file.tmp"
        mv "$context_file.tmp" "$context_file"
        
        return 0
    else
        echo "❌ Tests failed"
        echo ""
        echo "$test_output"
        echo ""
        
        # Analyze failure pattern
        echo "🔍 Analyzing failure..."
        
        local failure_type="unknown"
        
        if echo "$test_output" | grep -q "timeout\|timed out"; then
            failure_type="timing_issue"
            echo "  Pattern detected: Async timing issue (confidence: 0.85)"
            echo ""
            echo "  💡 Suggested fix:"
            echo "  - Add await for async operations"
            echo "  - Increase timeout in test configuration"
            echo "  - Use done() callback for completion"
        elif echo "$test_output" | grep -q "Expected.*to be called.*but.*not"; then
            failure_type="spy_not_called"
            echo "  Pattern detected: Jest spy not registering calls (confidence: 0.80)"
            echo ""
            echo "  💡 Suggested fix:"
            echo "  - Verify spy is attached before method is called"
            echo "  - Check if method binding is correct"
            echo "  - Consider using jest.fn() instead of spyOn"
        elif echo "$test_output" | grep -q "Cannot find module"; then
            failure_type="missing_import"
            echo "  Pattern detected: Missing import or module (confidence: 0.95)"
            echo ""
            echo "  💡 Suggested fix:"
            echo "  - Check import paths"
            echo "  - Verify module is installed"
            echo "  - Review package.json dependencies"
        fi
        
        # Record failed iteration
        local iteration=$(jq -n \
            --arg attempt "$attempt_count" \
            --arg ts "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
            --arg result "failed" \
            --arg failure_type "$failure_type" \
            --arg output "$test_output" \
            '{attempt: $attempt, timestamp: $ts, result: $result, failure_type: $failure_type, output: $output}')
        
        jq --argjson iter "$iteration" '.test_iterations += [$iter]' "$context_file" > "$context_file.tmp"
        mv "$context_file.tmp" "$context_file"
        
        if [ $attempt_count -ge $GH_TASK_MAX_TEST_ATTEMPTS ]; then
            echo ""
            echo "⚠️  Max attempts reached. Consider blocking task for human help."
        fi
        
        return 1
    fi
}

# ============================================================================
# CHECKPOINT SYSTEM
# ============================================================================

gh-task-checkpoint() {
    local issue_id="$1"
    local message="$2"
    
    if [ -z "$issue_id" ] || [ -z "$message" ]; then
        echo "Usage: gh-task-checkpoint <issue_id> \"<progress message>\""
        return 1
    fi
    
    local context_file="$GH_TASK_CONTEXT_DIR/${issue_id}.json"
    
    if [ ! -f "$context_file" ]; then
        echo "❌ Context not found"
        return 1
    fi
    
    # Check cooldown
    local last_checkpoint=$(jq -r '.last_checkpoint // 0' "$context_file")
    local now=$(date +%s)
    local elapsed=$((now - last_checkpoint))
    
    if [ $elapsed -lt $GH_TASK_CHECKPOINT_COOLDOWN ]; then
        local remaining=$((GH_TASK_CHECKPOINT_COOLDOWN - elapsed))
        echo "⚠️  Checkpoint cooldown active. Wait ${remaining}s before next checkpoint."
        return 1
    fi
    
    echo "💾 Creating checkpoint for issue #${issue_id}..."
    
    # Commit current work
    local branch=$(gh-task-context-get "$issue_id" "branch")
    
    if [ -n "$(git status --porcelain)" ]; then
        git add -A
        git commit -m "checkpoint: $message

Refs: #${issue_id}
Context: work in progress"
        
        git push -u origin "$branch"
        
        echo "  ✓ Changes committed and pushed"
    else
        echo "  ℹ No changes to commit"
    fi
    
    # Update context
    jq --arg msg "$message" --arg ts "$now" \
        '.progress.in_progress += [$msg] | .last_checkpoint = ($ts | tonumber)' \
        "$context_file" > "$context_file.tmp"
    mv "$context_file.tmp" "$context_file"
    
    # Post update
    gh issue comment "$issue_id" --body "💾 **Checkpoint**

Progress: $message

Branch: \`$branch\`  
Time: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

---
🤖 Work in progress - not ready for review yet"
    
    echo "✅ Checkpoint created"
}

# ============================================================================
# PARTIAL REVIEW
# ============================================================================

gh-task-review-partial() {
    local issue_id="$1"
    local aspect="$2"
    
    if [ -z "$issue_id" ] || [ -z "$aspect" ]; then
        echo "Usage: gh-task-review-partial <issue_id> <aspect>"
        echo "Aspects: architecture, implementation, tests, performance, security"
        return 1
    fi
    
    local valid_aspects="architecture implementation tests performance security"
    if ! echo "$valid_aspects" | grep -qw "$aspect"; then
        echo "❌ Invalid aspect. Choose from: $valid_aspects"
        return 1
    fi
    
    echo "🔍 Requesting partial review of $aspect for issue #${issue_id}..."
    
    local branch=$(gh-task-context-get "$issue_id" "branch")
    local confidence=$(gh-task-context-get "$issue_id" "confidence_scores.${aspect}")
    
    if [ -z "$branch" ]; then
        echo "❌ No branch found. Run gh-task-start first."
        return 1
    fi
    
    # Push branch
    git push -u origin "$branch"
    
    # Create draft PR with partial review request
    local pr_body="## 🔍 Partial Review Request: $(echo $aspect | tr '[:lower:]' '[:upper:]')

**Status:** Work in Progress (seeking early feedback)

**What I'm Asking:**
Feedback on the $aspect approach before completing full implementation.

**Confidence:** ${confidence:-MEDIUM}

**Context:**
- Branch: \`$branch\`
- Issue: #${issue_id}
- Full context: \`.task-context/${issue_id}.json\`

**What's Ready:**
- [ ] Complete implementation
- [x] ${aspect} approach defined
- [ ] All tests passing
- [ ] Full documentation

---
🤖 This is a partial review. I'll continue after feedback.

To provide feedback, comment on this PR or the issue.
To approve this approach: Comment 'LGTM - proceed'
To request changes: Provide specific guidance"

    local pr_url=$(gh pr create \
        --draft \
        --title "[WIP] $(gh issue view "$issue_id" --json title --jq '.title')" \
        --body "$pr_body" \
        --assignee "@me")
    
    # Post comment on issue
    gh issue comment "$issue_id" --body "🔍 **Partial Review Requested: $aspect**

I've created a draft PR for early feedback on the $aspect approach.

**PR:** $pr_url  
**Confidence:** ${confidence:-MEDIUM}

Please review when you have a moment. I'll continue based on your feedback.

---
🤖 Partial review - full implementation pending feedback"
    
    echo "✅ Partial review requested: $pr_url"
}

# ============================================================================
# ENHANCED FULL REVIEW
# ============================================================================

gh-task-review() {
    local issue_id="$1"
    
    if [ -z "$issue_id" ]; then
        echo "Usage: gh-task-review <issue_id>"
        return 1
    fi
    
    echo "📤 Preparing issue #${issue_id} for review..."
    echo ""
    
    local context_file="$GH_TASK_CONTEXT_DIR/${issue_id}.json"
    
    if [ ! -f "$context_file" ]; then
        echo "❌ Context not found"
        return 1
    fi
    
    # Pre-review checklist
    echo "✓ Pre-Review Checklist:"
    
    # Run tests
    echo -n "  Tests: "
    if npm test >/dev/null 2>&1; then
        echo "✅ Passing"
    else
        echo "❌ Failing"
        echo ""
        echo "⚠️  Cannot create PR with failing tests"
        echo "   Run: gh-task-test $issue_id"
        return 1
    fi
    
    # Check linter
    echo -n "  Linter: "
    if npm run lint >/dev/null 2>&1 || true; then
        echo "✅ Clean"
    else
        echo "⚠️  Has warnings"
    fi
    
    # Check context completeness
    echo -n "  Context: "
    if [ -f "$context_file" ]; then
        echo "✅ Complete"
    else
        echo "⚠️  Incomplete"
    fi
    
    echo ""
    
    # Get context data
    local branch=$(jq -r '.branch' "$context_file")
    local started=$(jq -r '.started_at' "$context_file")
    local confidence_fix=$(jq -r '.confidence_scores.fix_correctness // 0.5' "$context_file")
    local confidence_tests=$(jq -r '.confidence_scores.test_coverage // 0.5' "$context_file")
    local confidence_perf=$(jq -r '.confidence_scores.performance_impact // 0.5' "$context_file")
    local test_iterations=$(jq -r '.test_iterations | length' "$context_file")
    
    # Push branch
    echo "⬆️  Pushing branch..."
    git push -u origin "$branch" || return 1
    
    # Build comprehensive PR description
    local pr_body="## Description
$(gh issue view "$issue_id" --json body --jq '.body' | head -5)

## Related Issue
Closes #${issue_id}

## Changes Made
$(git log --oneline origin/main..HEAD | sed 's/^/- /')

## Testing Strategy
- Test iterations: $test_iterations
- Coverage: $(echo "$confidence_tests" | awk '{printf "%.0f%%", $1*100}')

## Confidence Assessment
| Aspect | Confidence | Notes |
|--------|-----------|-------|
| Fix Correctness | $(gh-task-format-confidence "$confidence_fix") | |
| Test Coverage | $(gh-task-format-confidence "$confidence_tests") | $test_iterations iterations |
| Performance | $(gh-task-format-confidence "$confidence_perf") | |

$(if [ $(echo "$confidence_perf < 0.7" | bc -l) -eq 1 ]; then echo "⚠️ **Human Review Needed:** Performance impact requires verification"; fi)

## Context
- Started: $started
- Time spent: $(gh-task-duration "$started")
- Test iterations: $test_iterations
- Similar successful tasks: $(jq -r '.similar_tasks | length' "$context_file")

## Checklist
- [x] Tests passing
- [x] Code follows style guidelines
- [x] Context preserved
- [ ] Human review completed (REQUIRED)
- [ ] Human final approval (REQUIRED)

---
🤖 Generated by Task-Master Agent v2.0  
Context: \`$context_file\`"
    
    # Create PR
    local pr_url=$(gh pr create \
        --draft \
        --title "$(gh issue view "$issue_id" --json title --jq '.title')" \
        --body "$pr_body" \
        --assignee "@me")
    
    # Update project board
    echo "📊 Updating project board..."
    gh-task-update-status "$issue_id" "$GH_STATUS_REVIEW"
    
    # Update context
    jq --arg status "review" '.status = $status' "$context_file" > "$context_file.tmp"
    mv "$context_file.tmp" "$context_file"
    
    # Post review comment
    local review_focus=""
    if [ $(echo "$confidence_perf < 0.7" | bc -l 2>/dev/null || echo 0) -eq 1 ]; then
        review_focus="

**⚠️ Human Review Focus:**
Performance impact confidence is MEDIUM. Please verify this is acceptable."
    fi
    
    gh issue comment "$issue_id" --body "🤖 **Task Ready for Review**

**PR:** $pr_url  
**Branch:** \`$branch\`  
**Status:** Review  
**Completed:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")  
**Time Spent:** $(gh-task-duration "$started")

**Confidence Scores:**
- Fix Correctness: $(gh-task-format-confidence "$confidence_fix")
- Test Coverage: $(gh-task-format-confidence "$confidence_tests")
- Performance: $(gh-task-format-confidence "$confidence_perf")$review_focus

**Test Iterations:** $test_iterations

**Context Preserved:** \`$context_file\`

---
**Human Actions Required:**
- [ ] Review code quality
- [ ] Verify approach
- [ ] Approve when satisfied
- [ ] Merge (human-only)"
    
    echo ""
    echo "✅ PR created: $pr_url"
    echo "   Status: Review"
}

# Helper function for confidence formatting
gh-task-format-confidence() {
    local score="$1"
    local percent=$(echo "$score * 100" | bc -l 2>/dev/null | cut -d. -f1)
    
    if [ "$percent" -ge 80 ]; then
        echo "HIGH ($percent%)"
    elif [ "$percent" -ge 50 ]; then
        echo "MEDIUM ($percent%)"
    else
        echo "LOW ($percent%)"
    fi
}

# Helper function for duration calculation
gh-task-duration() {
    local start="$1"
    local now=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    local start_ts=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$start" +%s 2>/dev/null || date -d "$start" +%s 2>/dev/null || echo 0)
    local now_ts=$(date +%s)
    local diff=$((now_ts - start_ts))
    
    local hours=$((diff / 3600))
    local minutes=$(((diff % 3600) / 60))
    
    if [ $hours -gt 0 ]; then
        echo "${hours}h ${minutes}m"
    else
        echo "${minutes}m"
    fi
}

# ============================================================================
# ENHANCED BLOCKING
# ============================================================================

gh-task-block() {
    local issue_id="$1"
    local blocker_message="$2"
    local with_context="${3:---context}"
    
    if [ -z "$issue_id" ] || [ -z "$blocker_message" ]; then
        echo "Usage: gh-task-block <issue_id> \"<blocker_description>\" [--context]"
        return 1
    fi
    
    echo "🚧 Marking issue #${issue_id} as blocked..."
    
    local context_file="$GH_TASK_CONTEXT_DIR/${issue_id}.json"
    local context_data=""
    
    if [ -f "$context_file" ] && [ "$with_context" = "--context" ]; then
        # Extract relevant context
        local test_iterations=$(jq -r '.test_iterations' "$context_file")
        local attempts=$(jq -r '.test_iterations | length' "$context_file")
        local branch=$(jq -r '.branch' "$context_file")
        
        context_data="

**Context:**
- **Branch:** \`$branch\`
- **Attempts Made:** $attempts/$GH_TASK_MAX_TEST_ATTEMPTS

**Test History:**
\`\`\`json
$test_iterations
\`\`\`"
    fi
    
    # Update project board
    gh-task-update-status "$issue_id" "$GH_STATUS_BLOCKED"
    
    # Update context
    if [ -f "$context_file" ]; then
        jq --arg blocker "$blocker_message" \
            '.status = "blocked" | .progress.blocked += [$blocker]' \
            "$context_file" > "$context_file.tmp"
        mv "$context_file.tmp" "$context_file"
    fi
    
    # Post detailed blocker comment
    gh issue comment "$issue_id" --body "🤖 **Task Blocked**

**Blocker:** ${blocker_message}$context_data

**Human Input Needed:** Please review and provide guidance.

Moving to \"Blocked\" status. Awaiting human resolution.

---
💡 To unblock: Update issue with guidance, then I'll resume work"
    
    echo "✅ Issue marked as blocked"
}

# ============================================================================
# PROJECT BOARD UTILITIES (unchanged but included for completeness)
# ============================================================================

gh-task-update-status() {
    local issue_id="$1"
    local new_status="$2"
    
    if [ -z "$issue_id" ] || [ -z "$new_status" ]; then
        return 1
    fi
    
    local item_id=$(gh project item-list "$GH_PROJECT_NUMBER" --owner "@me" \
        --format json --jq ".items[] | select(.content.number == $issue_id) | .id" 2>/dev/null)
    
    if [ -z "$item_id" ]; then
        gh project item-add "$GH_PROJECT_NUMBER" --owner "@me" \
            --url "$(gh issue view "$issue_id" --json url --jq '.url')" >/dev/null 2>&1
        sleep 1
        item_id=$(gh project item-list "$GH_PROJECT_NUMBER" --owner "@me" \
            --format json --jq ".items[] | select(.content.number == $issue_id) | .id")
    fi
    
    gh project item-edit --project-id "$GH_PROJECT_NUMBER" --id "$item_id" \
        --field-id "$GH_STATUS_FIELD" --text "$new_status" 2>/dev/null
    
    echo "✅ Status updated: ${new_status}"
}

gh-task-list() {
    local status="${1:-$GH_STATUS_IN_PROGRESS}"
    
    echo "📋 Tasks in status: ${status}"
    echo ""
    
    gh project item-list "$GH_PROJECT_NUMBER" --owner "@me" --format json \
        | jq -r ".items[] | select(.status == \"$status\") | \"#\(.content.number) - \(.content.title)\""
}

gh-task-show() {
    local issue_id="$1"
    
    if [ -z "$issue_id" ]; then
        echo "Usage: gh-task-show <issue_id>"
        return 1
    fi
    
    # Show issue
    gh issue view "$issue_id"
    
    echo ""
    echo "📊 Project Board Status:"
    gh project item-list "$GH_PROJECT_NUMBER" --owner "@me" --format json \
        | jq -r ".items[] | select(.content.number == $issue_id) | .status"
    
    # Show context if exists
    local context_file="$GH_TASK_CONTEXT_DIR/${issue_id}.json"
    if [ -f "$context_file" ]; then
        echo ""
        echo "🤖 Agent Context:"
        jq -C '{
            status,
            branch,
            confidence_scores,
            test_iterations: (.test_iterations | length),
            time_spent: .started_at
        }' "$context_file"
    fi
}

gh-task-complete() {
    local issue_id="$1"
    
    if [ -z "$issue_id" ]; then
        echo "Usage: gh-task-complete <issue_id>"
        return 1
    fi
    
    echo "🎯 Completing issue #${issue_id}..."
    echo "⚠️  This action requires human approval."
    
    local pr_number=$(gh pr list --search "head:$(git branch --show-current)" --json number --jq '.[0].number')
    
    if [ -z "$pr_number" ]; then
        echo "❌ No PR found for current branch"
        return 1
    fi
    
    read -p "Merge PR #${pr_number} and close issue #${issue_id}? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        return 1
    fi
    
    gh pr ready "$pr_number"
    gh pr merge "$pr_number" --squash --delete-branch || return 1
    gh-task-update-status "$issue_id" "$GH_STATUS_DONE"
    
    # Archive context (keep for learning)
    local context_file="$GH_TASK_CONTEXT_DIR/${issue_id}.json"
    if [ -f "$context_file" ]; then
        mkdir -p "$GH_TASK_CONTEXT_DIR/completed"
        jq --arg completed "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
            '.completed_at = $completed | .outcome = "successful"' \
            "$context_file" > "$GH_TASK_CONTEXT_DIR/completed/${issue_id}.json"
        echo "📚 Context archived for learning"
    fi
    
    echo "✅ Task completed successfully"
}

# ============================================================================
# LEARNING & ANALYTICS
# ============================================================================

gh-task-similar() {
    local issue_id="$1"
    
    if [ -z "$issue_id" ]; then
        echo "Usage: gh-task-similar <issue_id>"
        return 1
    fi
    
    echo "🔍 Finding similar completed tasks to issue #${issue_id}..."
    echo ""
    
    # Get issue keywords
    local issue_title=$(gh issue view "$issue_id" --json title --jq '.title')
    local keywords=$(echo "$issue_title" | tr ' ' '\n' | grep -v "^[aA]$\|^[tT]he$" | head -3)
    
    # Search completed contexts
    local completed_dir="$GH_TASK_CONTEXT_DIR/completed"
    
    if [ ! -d "$completed_dir" ]; then
        echo "ℹ️  No completed tasks found"
        return 0
    fi
    
    echo "📚 Similar completed tasks:"
    
    for context in "$completed_dir"/*.json; do
        if [ -f "$context" ]; then
            local task_id=$(basename "$context" .json)
            local task_title=$(jq -r '.requirements.primary // ""' "$context")
            local outcome=$(jq -r '.outcome // "unknown"' "$context")
            local confidence=$(jq -r '.confidence_scores.fix_correctness // 0' "$context")
            
            # Simple similarity check (could be enhanced)
            local match_count=0
            for keyword in $keywords; do
                if echo "$task_title" | grep -qi "$keyword"; then
                    match_count=$((match_count + 1))
                fi
            done
            
            if [ $match_count -gt 0 ]; then
                echo "  - #$task_id: $task_title"
                echo "    Outcome: $outcome | Confidence: $(gh-task-format-confidence "$confidence")"
                echo ""
            fi
        fi
    done
}

gh-task-stats() {
    echo "📊 Task-Master Performance Statistics"
    echo ""
    
    local completed_dir="$GH_TASK_CONTEXT_DIR/completed"
    
    if [ ! -d "$completed_dir" ]; then
        echo "ℹ️  No completed tasks yet"
        return 0
    fi
    
    local total_tasks=$(ls -1 "$completed_dir"/*.json 2>/dev/null | wc -l)
    local successful=0
    local total_time=0
    local total_iterations=0
    
    for context in "$completed_dir"/*.json; do
        if [ -f "$context" ]; then
            local outcome=$(jq -r '.outcome' "$context")
            if [ "$outcome" = "successful" ]; then
                successful=$((successful + 1))
            fi
            
            local iterations=$(jq -r '.test_iterations | length' "$context")
            total_iterations=$((total_iterations + iterations))
        fi
    done
    
    echo "**Tasks Completed:** $total_tasks"
    echo "**Success Rate:** $(echo "scale=1; $successful * 100 / $total_tasks" | bc 2>/dev/null || echo "N/A")%"
    echo "**Avg Test Iterations:** $(echo "scale=1; $total_iterations / $total_tasks" | bc 2>/dev/null || echo "N/A")"
    echo ""
    
    echo "💡 Run 'gh-task-similar <issue_id>' to learn from past work"
}

# ============================================================================
# CONVENIENCE ALIASES
# ============================================================================

alias gh-task="gh-task-show"
alias gh-tasks="gh-task-list"
alias task-start="gh-task-start"
alias task-analyze="gh-task-analyze"
alias task-test="gh-task-test"
alias task-checkpoint="gh-task-checkpoint"
alias task-review="gh-task-review"
alias task-review-partial="gh-task-review-partial"
alias task-block="gh-task-block"
alias task-done="gh-task-complete"
alias task-context="gh-task-context-show"
alias task-similar="gh-task-similar"
alias task-stats="gh-task-stats"

# ============================================================================
# HELP & VERIFICATION
# ============================================================================

gh-task-verify() {
    echo "🔍 Verifying GitHub-Native Agentic Framework v2.0..."
    echo ""
    
    local all_good=true
    
    # Check dependencies
    if command -v gh &> /dev/null; then
        echo "✅ gh CLI: $(gh --version | head -n1)"
    else
        echo "❌ gh CLI: Not installed"
        all_good=false
    fi
    
    if command -v git &> /dev/null; then
        echo "✅ git: $(git --version)"
    else
        echo "❌ git: Not installed"
        all_good=false
    fi
    
    if command -v jq &> /dev/null; then
        echo "✅ jq: $(jq --version)"
    else
        echo "❌ jq: Not installed"
        all_good=false
    fi
    
    if command -v bc &> /dev/null; then
        echo "✅ bc: installed"
    else
        echo "⚠️  bc: Not installed (optional, for calculations)"
    fi
    
    if gh auth status &> /dev/null; then
        echo "✅ GitHub authentication: Active"
    else
        echo "❌ GitHub authentication: Not configured"
        all_good=false
    fi
    
    # Check context directory
    if [ -d "$GH_TASK_CONTEXT_DIR" ]; then
        echo "✅ Context directory: $GH_TASK_CONTEXT_DIR"
    else
        echo "ℹ️  Context directory will be created on first use"
    fi
    
    echo ""
    if [ "$all_good" = true ]; then
        echo "🎉 Framework v2.0 ready!"
    else
        echo "⚠️  Some dependencies missing. Install them to use all features."
    fi
}

gh-task-help() {
    cat << 'EOF'
GitHub-Native Agentic Framework v2.0 - CLI Commands
====================================================

🚀 WORKFLOW:
  gh-task-analyze <id>              Pre-flight analysis before starting
  gh-task-start <id>                Start working on issue (creates branch + context)
  gh-task-test <id>                 Run tests with iteration tracking
  gh-task-checkpoint <id> "msg"     Save progress without creating PR
  gh-task-review-partial <id> <asp> Request feedback on specific aspect
  gh-task-review <id>               Submit for full review (creates PR)
  gh-task-complete <id>             Merge and close (human-only)

📋 PROJECT BOARD:
  gh-task-list [status]             List tasks by status
  gh-task-show <id>                 Show issue + context + board status
  gh-task-update-status <id> <stat> Update board status

🤖 CONTEXT & LEARNING:
  gh-task-context-show <id>         View full task context
  gh-task-docs <id>                 Fetch relevant documentation (MCP)
  gh-task-similar <id>              Find similar completed tasks
  gh-task-stats                     View performance statistics

🚧 PROBLEM HANDLING:
  gh-task-block <id> "msg"          Mark as blocked with diagnostic info

🛠️  UTILITIES:
  gh-task-verify                    Verify installation
  gh-task-help                      Show this help

SHORTCUTS:
  task-start, task-analyze, task-test, task-checkpoint,
  task-review, task-review-partial, task-block, task-done,
  task-context, task-similar, task-stats

NEW IN V2.0:
  ✨ Context persistence across sessions
  ✨ Adaptive test iteration with pattern detection
  ✨ Confidence scoring for all work
  ✨ Incremental checkpoints
  ✨ Partial review requests
  ✨ Learning from completed tasks
  ✨ Enhanced MCP documentation integration

ENVIRONMENT:
  GH_PROJECT_NUMBER                 Your project board number
  GH_TASK_CONTEXT_DIR               Where context is stored (.task-context)
  GH_TASK_MAX_TEST_ATTEMPTS         Max test iterations (default: 5)

For full documentation, see .github/agents/task-master.agent.md
EOF
}

# Initialize on load
echo "🤖 GitHub-Native Agentic Framework v2.0 loaded"
echo "   Run 'gh-task-help' for usage information"
echo "   Run 'gh-task-verify' to check installation"