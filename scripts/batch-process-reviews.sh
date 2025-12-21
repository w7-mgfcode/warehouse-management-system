#!/bin/bash
# Automated Batch PR Review Resolver
# Processes ALL review comments step-by-step with Copilot

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

print_header() {
    echo -e "${CYAN}
╔════════════════════════════════════════════════════════════════════╗
║  $1
╚════════════════════════════════════════════════════════════════════╝${NC}"
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Get repo info
OWNER=$(gh repo view --json owner -q .owner.login)
REPO=$(gh repo view --json name -q .name)

# Get PR number
PR_NUMBER="${1:-}"
if [[ -z "$PR_NUMBER" ]]; then
    PR_NUMBER=$(gh pr view --json number -q .number 2>/dev/null || echo "")
    if [[ -z "$PR_NUMBER" ]]; then
        print_error "No PR found. Please provide PR number or checkout PR branch."
        exit 1
    fi
fi

print_header "Batch Processing PR #$PR_NUMBER Review Comments"

# Fetch ALL review comments
print_step "Fetching all review comments..."
COMMENTS_JSON=$(gh api "repos/$OWNER/$REPO/pulls/$PR_NUMBER/comments" --paginate)

# Count total comments
TOTAL_COMMENTS=$(echo "$COMMENTS_JSON" | jq length)

if [[ "$TOTAL_COMMENTS" -eq 0 ]]; then
    print_success "No review comments found! 🎉"
    exit 0
fi

echo -e "${GREEN}Found $TOTAL_COMMENTS review comments to process${NC}"
echo ""

# Statistics
PROCESSED=0
SUCCEEDED=0
SKIPPED=0

# Create session log
SESSION_LOG="/tmp/pr-review-session-$(date +%s).log"
touch "$SESSION_LOG"

# Process each comment
for i in $(seq 0 $((TOTAL_COMMENTS - 1))); do
    COMMENT_JSON=$(echo "$COMMENTS_JSON" | jq ".[$i]")
    
    COMMENT_ID=$(echo "$COMMENT_JSON" | jq -r .id)
    COMMENT_BODY=$(echo "$COMMENT_JSON" | jq -r .body)
    FILE_PATH=$(echo "$COMMENT_JSON" | jq -r .path)
    AUTHOR=$(echo "$COMMENT_JSON" | jq -r .user.login)
    
    CURRENT=$((i + 1))
    
    print_header "Comment $CURRENT/$TOTAL_COMMENTS (ID: $COMMENT_ID)"
    
    echo -e "${CYAN}👤 Author:${NC} $AUTHOR"
    echo -e "${CYAN}📁 File:${NC} $FILE_PATH"
    echo -e "${CYAN}💬 Comment:${NC}"
    echo -e "${YELLOW}$COMMENT_BODY${NC}"
    echo ""
    
    # Ask user what to do
    echo "Options:"
    echo "  [p] Process this comment"
    echo "  [s] Skip this comment"
    echo "  [q] Quit batch processing"
    echo ""
    read -p "Your choice: " -n 1 -r CHOICE
    echo ""
    
    case "$CHOICE" in
        [Qq])
            print_warning "Batch processing stopped by user"
            break
            ;;
        [Ss])
            print_warning "Skipping comment $CURRENT/$TOTAL_COMMENTS"
            SKIPPED=$((SKIPPED + 1))
            echo "Comment #$COMMENT_ID - Skipped by user" >> "$SESSION_LOG.skipped"
            echo ""
            continue
            ;;
        [Pp])
            # Process the comment
            print_step "Processing comment #$COMMENT_ID..."
            
            if ./scripts/process-review.sh "$COMMENT_ID" "false" "false"; then
                SUCCEEDED=$((SUCCEEDED + 1))
                print_success "Comment $CURRENT/$TOTAL_COMMENTS completed!"
                echo "✅ Comment #$COMMENT_ID" >> "$SESSION_LOG"
            else
                print_error "Failed to process comment #$COMMENT_ID"
                SKIPPED=$((SKIPPED + 1))
                echo "❌ Comment #$COMMENT_ID - Failed" >> "$SESSION_LOG.failed"
            fi
            ;;
        *)
            print_warning "Invalid choice. Skipping comment."
            SKIPPED=$((SKIPPED + 1))
            continue
            ;;
    esac
    
    PROCESSED=$((PROCESSED + 1))
    
    # Wait for confirmation before next comment
    if [[ $CURRENT -lt $TOTAL_COMMENTS ]]; then
        echo ""
        echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        read -p "⏸️  Press Enter to continue to next comment (or Ctrl+C to stop)..."
        echo ""
    fi
done

# Final summary
print_header "Batch Processing Complete!"

echo -e "${GREEN}
📊 Summary Report:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Total Comments:    $TOTAL_COMMENTS
  ✅ Succeeded:      $SUCCEEDED
  ⏭️  Skipped:        $SKIPPED
  📝 Processed:      $PROCESSED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${NC}"

echo -e "${CYAN}Session log saved to: $SESSION_LOG${NC}"

if [[ -f "$SESSION_LOG.skipped" ]]; then
    echo -e "${YELLOW}Skipped comments logged to: $SESSION_LOG.skipped${NC}"
fi

if [[ -f "$SESSION_LOG.failed" ]]; then
    echo -e "${RED}Failed comments logged to: $SESSION_LOG.failed${NC}"
fi

# Open PR in browser
echo ""
read -p "Open PR in browser to review? (Y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    gh pr view --web
fi
