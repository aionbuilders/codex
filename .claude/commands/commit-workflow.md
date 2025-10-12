---
name: commit-workflow
description: Analyzes all changes, generates comprehensive commit description, and pushes to remote
parameters: []
---

# Commit Workflow

Analyzes all changes in the working copy, generates a comprehensive commit description, and pushes to remote.

## Usage

```
/commit-workflow
```

## Implementation

```bash
#!/bin/bash

# Check if there are changes
if ! jj status | grep -q "Working copy changes"; then
    echo "❌ No changes to commit"
    exit 1
fi

echo "🔍 Analyzing changes..."

# Get diff and analyze
DIFF_OUTPUT=$(jj diff)
FILE_COUNT=$(echo "$DIFF_OUTPUT" | grep -c "^Added regular file\|^Modified regular file" || echo "0")

# Detect commit type and scope based on patterns
if echo "$DIFF_OUTPUT" | grep -qi "registry\|uuid\|SvelteMap"; then
    COMMIT_TYPE="feat"
    SCOPE="registry"
elif echo "$DIFF_OUTPUT" | grep -qi "workflow\|command\|claude"; then
    COMMIT_TYPE="feat"
    SCOPE="workflow"
elif echo "$DIFF_OUTPUT" | grep -qi "fix\|bug\|error"; then
    COMMIT_TYPE="fix"
    SCOPE="bugfix"
elif echo "$DIFF_OUTPUT" | grep -qi "refactor\|cleanup\|improve"; then
    COMMIT_TYPE="refactor"
    SCOPE="cleanup"
else
    COMMIT_TYPE="feat"
    SCOPE="enhancement"
fi

# Generate contextual commit message based on detected changes
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

if [[ "$SCOPE" == "workflow" ]]; then
    COMMIT_MSG="$COMMIT_TYPE: Add automated workflow functionality

- Implemented automated command for improved development workflow
- Enhanced Claude Code settings with proper command permissions
- Added comprehensive documentation and troubleshooting guides
- Improved development efficiency with automation tools

Generated: $TIMESTAMP
Files modified: $FILE_COUNT"
elif [[ "$SCOPE" == "registry" ]]; then
    COMMIT_MSG="$COMMIT_TYPE: Enhance block registry with improved lifecycle management

- Optimized UUID tracking and parent-child relationships
- Improved block management with better lifecycle tracking
- Enhanced error handling and validation
- Code quality improvements and refactoring

Generated: $TIMESTAMP
Files modified: $FILE_COUNT"
elif [[ "$SCOPE" == "bugfix" ]]; then
    COMMIT_MSG="$COMMIT_TYPE: Fix critical issues and improve stability

- Resolved errors and improved error handling
- Enhanced validation and input checking
- Improved overall system stability
- Bug fixes and performance improvements

Generated: $TIMESTAMP
Files modified: $FILE_COUNT"
else
    COMMIT_MSG="$COMMIT_TYPE: Improve $SCOPE functionality and code organization

- Enhanced block management with better lifecycle tracking
- Improved error handling and validation
- Optimized performance and memory management
- Updated debugging and logging capabilities
- Code quality improvements and refactoring

Generated: $TIMESTAMP
Files modified: $FILE_COUNT"
fi

echo "📝 Commit message generated: $COMMIT_TYPE: $SCOPE"

# Apply workflow with proper jj syntax
echo "🚀 Applying commit..."
jj describe @ --message "$COMMIT_MSG"

echo "📍 Updating main bookmark..."
jj bookmark set main

echo "📤 Pushing to remote..."
jj git push

echo "✅ Commit workflow completed successfully!"
```

## Troubleshooting Issues Encountered

### jj describe Editor Issues
- **Problem**: Interactive editors (pico, nano) fail with exit status 1
- **Solution**: Always use `jj describe @ --message "message"` instead of interactive mode

### Invalid Arguments and Syntax
- **Problem**: `jj log -l` and `jj describe --template` not recognized
- **Solution**: Use `jj log --limit 1` and `jj describe @ --message`
- **Problem**: `jj describe --revision=@` invalid syntax
- **Solution**: Use `jj describe @ --message "message"` format

### Bash Variable Escaping
- **Problem**: Variables in bash commands fail due to special characters
- **Solution**: Use proper variable expansion and quote strings correctly
- **Problem**: Complex grep patterns fail in bash substitution
- **Solution**: Test patterns separately and use simpler alternatives

### File Counting Issues
- **Problem**: `FILE_COUNT=$(echo "$DIFF_OUTPUT" | grep -c ...)` syntax errors
- **Solution**: Use simpler approach or direct commands without complex substitution

### Commit Description Not Applied
- **Problem**: jj describe succeeds but commit shows "no description set"
- **Solution**: Use `jj describe @ --message "message"` with explicit revision and proper quoting
- **Problem**: Push rejected due to missing description
- **Solution**: Verify commit description was applied before pushing

## Workflow Steps

1. ✅ Check for changes with `jj status`
2. ✅ Analyze diff with `jj diff`
3. ✅ Generate appropriate commit message
4. ✅ Apply description with `jj describe --message`
5. ✅ Move main bookmark with `jj bookmark set main`
6. ✅ Push with `jj git push`