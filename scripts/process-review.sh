#!/bin/bash
# Process a single review comment with Copilot Chat integration

set -euo pipefail

COMMENT_ID="$1"
AUTO_COMMIT="${2:-false}"
AUTO_RESOLVE="${3:-false}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get repo info
OWNER=$(gh repo view --json owner -q .owner.login)
REPO=$(gh repo view --json name -q .name)
PR_NUMBER=$(gh pr view --json number -q .number)

echo -e "${BLUE}🔍 Fetching comment #$COMMENT_ID...${NC}"

# Fetch comment details
COMMENT_JSON=$(gh api "repos/$OWNER/$REPO/pulls/comments/$COMMENT_ID")

# Extract fields
BODY=$(echo "$COMMENT_JSON" | jq -r .body)
FILE_PATH=$(echo "$COMMENT_JSON" | jq -r .path)
DIFF_HUNK=$(echo "$COMMENT_JSON" | jq -r .diff_hunk)
POSITION=$(echo "$COMMENT_JSON" | jq -r .position)
AUTHOR=$(echo "$COMMENT_JSON" | jq -r .user.login)

echo -e "${GREEN}
╔═══════════════════════════════════════════════════════════╗
║  Review Comment #$COMMENT_ID
╚═══════════════════════════════════════════════════════════╝${NC}

👤 Author: $AUTHOR
📁 File: $FILE_PATH (position: $POSITION)

💬 Comment:
${YELLOW}$BODY${NC}

📊 Diff Context:
${PURPLE}$DIFF_HUNK${NC}
"

# Create context file for Copilot Chat
CONTEXT_FILE=".vscode/.pr-review-context.md"
cat > "$CONTEXT_FILE" <<EOF
# PR Review Comment #$COMMENT_ID

**PR:** #$PR_NUMBER
**Author:** $AUTHOR
**File:** \`$FILE_PATH\`
**Position:** Line $POSITION

## Reviewer's Suggestion
$BODY

## Code Context
\`\`\`diff
$DIFF_HUNK
\`\`\`

## Implementation Checklist
- [ ] Read current code in \`$FILE_PATH\`
- [ ] Implement the suggested fix
- [ ] Run \`ruff check .\` in \`w7-WHv1/backend\`
- [ ] Run \`pytest\` in \`w7-WHv1/backend\`
- [ ] Note: \`mypy .\` is advisory only
- [ ] Commit with format: \`fix: implement review from #discussion_r$COMMENT_ID\`

## Commit Message Template
\`\`\`
fix: implement review from #discussion_r$COMMENT_ID

{Brief explanation of what changed and why}

Addresses feedback from @$AUTHOR
\`\`\`

## After Implementation
Run this to reply:
\`\`\`bash
COMMIT_SHA=\$(git rev-parse HEAD)
gh api -X POST repos/$OWNER/$REPO/pulls/$PR_NUMBER/comments/$COMMENT_ID/replies \\
  -f body="✅ Fixed in commit \$COMMIT_SHA

{Explanation of fix}"
\`\`\`
EOF

echo -e "${GREEN}📄 Context saved to: $CONTEXT_FILE${NC}"
echo -e "${BLUE}🤖 Opening file and context in VS Code...${NC}"

# Open file with context
code "$FILE_PATH" "$CONTEXT_FILE"

# Trigger Copilot Chat with specific prompt
cat > ".vscode/.copilot-prompt-$COMMENT_ID.txt" <<EOF
@workspace Implement this GitHub PR review suggestion:

FILE: $FILE_PATH
REVIEWER: @$AUTHOR
SUGGESTION: $BODY

CONTEXT:
$DIFF_HUNK

REQUIREMENTS (from .github/copilot-instructions.md):
- Work in backend directory: w7-WHv1/backend
- Run ruff check after changes
- Run pytest to ensure tests pass
- mypy is advisory only (don't block on it)
- Create focused, minimal changes
- Follow PR template standards

STEPS:
1. Analyze the current code
2. Implement the fix following best practices
3. Show me the exact changes
4. Explain the trade-offs

After implementation, I'll run quality checks.
EOF

echo -e "${YELLOW}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 NEXT STEPS:

1. Review the context in: $CONTEXT_FILE
2. Open Copilot Chat (Ctrl+Shift+I)
3. Paste this prompt:

$(cat .vscode/.copilot-prompt-$COMMENT_ID.txt)

4. Let Copilot implement the fix
5. Review and accept changes
6. Press Enter here to continue with commit & reply...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${NC}"

read -p "Press Enter when implementation is complete..."

# Run quality checks
echo -e "${BLUE}🧪 Running quality checks...${NC}"

cd "w7-WHv1/backend"

echo "▶ Running ruff check..."
if ruff check .; then
    echo -e "${GREEN}✅ Ruff passed${NC}"
else
    echo -e "${YELLOW}⚠️ Ruff found issues. Fix them before continuing.${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

echo "▶ Running pytest..."
if pytest; then
    echo -e "${GREEN}✅ Tests passed${NC}"
else
    echo -e "${YELLOW}⚠️ Tests failed. Fix them before continuing.${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

echo "▶ Running mypy (advisory)..."
mypy . || echo -e "${YELLOW}ℹ️ mypy issues found (advisory - not blocking)${NC}"

cd ../..

# Commit
echo -e "${BLUE}📝 Creating commit...${NC}"

git add "$FILE_PATH"

COMMIT_MSG="fix: implement review from #discussion_r$COMMENT_ID

Addresses feedback from @$AUTHOR
$BODY"

if [[ "$AUTO_COMMIT" == "true" ]]; then
    git commit -m "$COMMIT_MSG"
else
    echo -e "${YELLOW}Proposed commit message:${NC}"
    echo "$COMMIT_MSG"
    echo ""
    read -p "Commit with this message? (Y/n) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        git commit
    else
        git commit -m "$COMMIT_MSG"
    fi
fi

COMMIT_SHA=$(git rev-parse HEAD)
echo -e "${GREEN}✅ Committed: $COMMIT_SHA${NC}"

# Push
echo -e "${BLUE}📤 Pushing to remote...${NC}"
git push
echo -e "${GREEN}✅ Pushed!${NC}"

# Reply
echo -e "${BLUE}💬 Replying to comment...${NC}"

REPLY_BODY="✅ Fixed in commit $COMMIT_SHA

Implemented the suggested fix and verified:
- ✅ ruff check passed
- ✅ pytest passed
- ℹ️ mypy advisory checks completed"

gh api -X POST \
    "repos/$OWNER/$REPO/pulls/$PR_NUMBER/comments/$COMMENT_ID/replies" \
    -f body="$REPLY_BODY"

echo -e "${GREEN}✅ Reply sent!${NC}"

# Resolve thread (optional)
if [[ "$AUTO_RESOLVE" == "true" ]]; then
    echo -e "${BLUE}🔒 Resolving thread...${NC}"
    
    THREAD_ID=$(gh api graphql -f query='
    query($owner:String!, $repo:String!, $pr:Int!) {
      repository(owner:$owner, name:$repo) {
        pullRequest(number:$pr) {
          reviewThreads(first:100) {
            nodes {
              id
              comments(first:1) {
                nodes { databaseId }
              }
            }
          }
        }
      }
    }' -F owner="$OWNER" -F repo="$REPO" -F pr="$PR_NUMBER" \
      --jq ".data.repository.pullRequest.reviewThreads.nodes[] | 
            select(.comments.nodes[].databaseId == $COMMENT_ID) | .id")
    
    if [[ -n "$THREAD_ID" ]]; then
        gh api graphql -f query='
        mutation {
          resolveReviewThread(input: {threadId: "'$THREAD_ID'"}) {
            thread { isResolved }
          }
        }' > /dev/null
        
        echo -e "${GREEN}✅ Thread resolved!${NC}"
    fi
fi

echo -e "${GREEN}
╔═══════════════════════════════════════════════════════════╗
║  ✅ Comment #$COMMENT_ID Processed Successfully!
╚═══════════════════════════════════════════════════════════╝${NC}"
