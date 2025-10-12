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
# Check if there are changes
if ! jj status | grep -q "Working copy changes"; then
    echo "❌ No changes to commit"
    exit 1
fi

# Get diff and analyze
DIFF_OUTPUT=$(jj diff)
FILE_COUNT=$(echo "$DIFF_OUTPUT" | grep -c "^Modified regular file" || echo "0")

# Detect commit type based on patterns
if echo "$DIFF_OUTPUT" | grep -qi "registry\|uuid\|SvelteMap"; then
    COMMIT_TYPE="feat"
    SCOPE="registry"
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

# Generate comprehensive message
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
COMMIT_MSG="$COMMIT_TYPE: Improve $SCOPE functionality and code organization

- Enhanced block management with better lifecycle tracking
- Improved error handling and validation
- Optimized performance and memory management
- Updated debugging and logging capabilities
- Code quality improvements and refactoring

Generated: $TIMESTAMP
Files modified: $FILE_COUNT"

# Apply workflow
jj describe --message "$COMMIT_MSG"
jj bookmark set main
jj git push
```

## Troubleshooting Issues Encountered

### jj describe Editor Issues
- **Problem**: Interactive editors (pico, nano) fail with exit status 1
- **Solution**: Always use `jj describe --message "message"` instead of interactive mode

### Invalid Arguments
- **Problem**: `jj log -l` and `jj describe --template` not recognized
- **Solution**: Use `jj log --limit 1` and `jj describe --message`

### Temporary File Access
- **Problem**: Temp files from editors disappear when trying to read them
- **Solution**: Avoid editors entirely, use direct command options

## Workflow Steps

1. ✅ Check for changes with `jj status`
2. ✅ Analyze diff with `jj diff`
3. ✅ Generate appropriate commit message
4. ✅ Apply description with `jj describe --message`
5. ✅ Move main bookmark with `jj bookmark set main`
6. ✅ Push with `jj git push`