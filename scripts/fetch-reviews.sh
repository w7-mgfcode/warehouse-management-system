#!/bin/bash
# Fetch all PR review comments and prepare for batch processing

set -euo pipefail

PR_NUMBER="${1:-}"

# Get repo info
OWNER=$(gh repo view --json owner -q .owner.login)
REPO=$(gh repo view --json name -q .name)

# Auto-detect PR if not provided
if [[ -z "$PR_NUMBER" ]]; then
    PR_NUMBER=$(gh pr view --json number -q .number 2>/dev/null || echo "")
    if [[ -z "$PR_NUMBER" ]]; then
        echo "❌ No PR found. Provide PR number or checkout PR branch."
        exit 1
    fi
fi

echo "📡 Fetching review comments for PR #$PR_NUMBER..."

# Fetch all comments
COMMENTS_JSON=$(gh api "repos/$OWNER/$REPO/pulls/$PR_NUMBER/comments" --paginate)

# Count
TOTAL=$(echo "$COMMENTS_JSON" | jq length)

if [[ "$TOTAL" -eq 0 ]]; then
    echo "✅ No review comments found!"
    exit 0
fi

# Save to temp file for VS Code extension
REVIEW_FILE="/tmp/pr-${PR_NUMBER}-reviews.json"
echo "$COMMENTS_JSON" > "$REVIEW_FILE"

echo "✅ Found $TOTAL review comments"
echo "📄 Saved to: $REVIEW_FILE"

# Display summary
echo ""
echo "📋 Review Comments Summary:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for i in $(seq 0 $((TOTAL - 1))); do
    COMMENT=$(echo "$COMMENTS_JSON" | jq ".[$i]")
    ID=$(echo "$COMMENT" | jq -r .id)
    AUTHOR=$(echo "$COMMENT" | jq -r .user.login)
    FILE=$(echo "$COMMENT" | jq -r .path)
    BODY=$(echo "$COMMENT" | jq -r .body | head -c 60)
    
    echo "$((i+1)). ID: $ID | Author: $AUTHOR"
    echo "   File: $FILE"
    echo "   Comment: $BODY..."
    echo ""
done

# Output for VS Code Task to parse
echo "::set-output name=review_file::$REVIEW_FILE"
echo "::set-output name=total_comments::$TOTAL"
echo "::set-output name=pr_number::$PR_NUMBER"
