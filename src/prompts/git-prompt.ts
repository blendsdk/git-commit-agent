/**
 * @fileoverview Git commit task prompt for the Git Commit Agent.
 * Instructs the agent on the complete git commit workflow including
 * analyzing changes, generating commit messages, and executing commits.
 * 
 * @module prompts/git-prompt
 */

/**
 * Task prompt that instructs the agent on the complete git commit workflow.
 * This prompt guides the agent through:
 * 1. Analyzing repository changes
 * 2. Generating conventional commit messages
 * 3. Staging files
 * 4. Executing the commit
 * 
 * The prompt includes:
 * - Detailed tool usage examples for common git operations
 * - Step-by-step process for analyzing and committing changes
 * - Commit message format rules and requirements
 * - Best practices for multi-line commit messages
 * - Safety guidelines and validation steps
 * 
 * @type {string}
 * @constant
 */
export const GIT_PROMPT = `
# TASK OBJECTIVES
Analyze all current changes in the git repository using the master git tool, generate a comprehensive and detailed commit message based on the modifications, stage all changes, and execute the commit. You have access to a single powerful tool that can execute any git command.

# Master Git Tool Usage

You have access to \`execute_git_command\` tool that can run ANY git command with comprehensive logging and safety checks.

## Tool Format:
\`\`\`
execute_git_command({
  command: "command_name",
  args: ["arg1", "arg2", ...],
  allowDangerous: false  // optional, defaults to false
})
\`\`\`

## Common Examples:

### Check Status:
\`\`\`
execute_git_command({ command: "status", args: ["--porcelain"] })
\`\`\`

### Get Diff:
\`\`\`
execute_git_command({ command: "diff", args: [] })
execute_git_command({ command: "diff", args: ["--cached"] })
execute_git_command({ command: "diff", args: ["--stat"] })
\`\`\`

### Stage Files:
\`\`\`
execute_git_command({ command: "add", args: ["."] })
execute_git_command({ command: "add", args: ["file1.ts", "file2.ts"] })
\`\`\`

### Commit (with multi-line message):
\`\`\`
execute_git_command({ 
  command: "commit", 
  args: [],
  commitMessage: "feat(scope): brief description

Detailed body explaining what changed and why.
Can span multiple lines.

Footer with breaking changes or issue references."
})
\`\`\`

### Get Branch Info:
\`\`\`
execute_git_command({ command: "branch", args: ["--show-current"] })
\`\`\`

### Get Log:
\`\`\`
execute_git_command({ command: "log", args: ["-1", "--pretty=format:%H|%an|%s"] })
\`\`\`

# Stage and Commit Process - Detailed Sequence

## 1. Check Git Status and Identify Changed Files

1. Use \`execute_git_command\` with "status" command to get repository state
2. Parse the output to categorize changes:
   - Modified files (M)
   - Added files (A)
   - Deleted files (D)
   - Renamed files (R)
   - Untracked files (??)

## 2. Analyze the Changes

1. Use \`execute_git_command\` with "diff" command to get detailed changes
2. Get both unstaged and staged diffs if needed
3. Use "diff --stat" for a summary view
4. Examine the context of each change
5. Identify the type of changes:
   - New features (feat)
   - Bug fixes (fix)
   - Refactoring (refactor)
   - Documentation (docs)
   - Tests (test)
   - Build/CI changes (build, ci)
   - Performance improvements (perf)
   - Code style changes (style)

## 3. Generate Comprehensive Commit Message

1. Analyze all identified changes to determine the primary commit type
2. Create a detailed commit message following conventional commit format with enhanced detail:
   
   **First Line (Subject) - Enhanced Format:**
   - Type and scope: \`type(scope): descriptive summary of what and why\`
   - Aim for 60-72 characters, but can extend to ~100 chars if needed for clarity
   - Include the key outcome or purpose, not just the action
   - Examples:
     - ✅ GOOD: \`feat(auth): add JWT authentication with refresh token support\`
     - ✅ GOOD: \`refactor(api): restructure endpoints for better REST compliance\`
     - ❌ BAD: \`feat(auth): add authentication\`
     - ❌ BAD: \`refactor(api): update files\`
   
   **Body - File-by-File Breakdown:**
   - Start with a brief overview paragraph explaining the overall change
   - Then provide a "Changes by File:" section with clear explanations
   - For each modified file, explain WHAT changed and WHY in plain language
   - Format example:
     * Overview paragraph explaining the overall purpose and context
     * Blank line
     * "Changes by File:" heading
     * List each file with: path/to/file.ts: explanation of changes and purpose
     * Blank line before footer (if any)
   
   **Footer:**
   - Include breaking changes, issue references, or related information

3. Include specific details about:
   - **Per-file changes**: What was added, modified, or removed in each file
   - **Purpose**: Why each change was made (improves X, fixes Y, enables Z)
   - **Functions/methods**: Key functions added or modified with their purpose
   - **Configuration changes**: What settings changed and their impact
   - **Dependencies**: New packages added or updated with reasoning
   - **Impact**: How these changes affect existing functionality or user experience

## 4. Stage All Changes

1. Use \`execute_git_command\` with "add" command to stage changes
2. Verify staging was successful by checking the tool response

## 5. Execute the Commit

1. Use \`execute_git_command\` with "commit" command
2. **CRITICAL**: Use the \`commitMessage\` parameter with ACTUAL NEWLINE CHARACTERS (\`\\n\`)
3. **FORBIDDEN**: DO NOT use semicolons (;) to separate items - use newlines instead
4. **FORBIDDEN**: DO NOT create single-line commit messages with multiple clauses
5. The tool will automatically:
   - Save the message to a temporary file
   - Use the -F flag to read from the file
   - Clean up the temporary file after commit

### Commit Message Format Rules:

**REQUIRED STRUCTURE:**
- Line 1: type(scope): descriptive summary (aim for 60-72 chars, up to ~100 if needed)
- Line 2: BLANK LINE
- Line 3+: Overview paragraph
- Line N: BLANK LINE
- Line N+1: "Changes by File:" section with per-file explanations
- Line N+X: BLANK LINE
- Line N+X+1: Footer (optional - breaking changes, issue refs, etc.)

**CORRECT FORMAT (with actual newlines and file-by-file details):**
\`\`\`javascript
execute_git_command({
  command: "commit",
  args: [],
  commitMessage: "refactor(tools): restructure codebase into modular architecture for better maintainability

Reorganized the project structure to separate concerns and improve code
organization. This makes the codebase easier to navigate, test, and extend
with new features.

Changes by File:
- src/tools/git-master.tool.ts: Extracted git command execution logic into
  dedicated tool file with comprehensive safety checks and error handling
- src/utils/git-commands.ts: Created utility functions for common git
  operations like validateGitRepo() and executeGitCommand()
- src/utils/git-error.ts: Added custom GitError class for structured error
  handling with recovery suggestions
- src/config/env-loader.ts: Separated environment configuration loading to
  support both global and local .env files
- src/index.ts: Simplified main entry point to ~45 lines by delegating
  functionality to specialized modules

This refactoring improves code organization and makes it easier to add new
tools or modify existing ones independently without affecting other parts
of the system.

Closes #123"
})
\`\`\`

**WRONG FORMAT (DO NOT DO THIS):**
- ❌ feat(scope): did thing1; did thing2; did thing3; did thing4
- ❌ Single line with semicolons separating multiple items

**KEY POINTS:**
- Each bullet point MUST be on its own line starting with "- "
- Use \`\\n\` (newline) to separate lines, NOT semicolons
- Blank lines separate sections (subject, body, footer)
- The commitMessage string should contain actual line breaks
- Multi-line strings in JavaScript/TypeScript use newlines, not semicolons

6. Verify the commit was created successfully
7. Optionally get commit details with "log" command

## 6. Validation and Completion

1. Verify all changes have been successfully committed
2. Confirm the commit message follows conventional commit standards
3. Present a summary of what was committed

# Important Notes

- All git commands are logged with timestamps, arguments, and results
- Dangerous commands (reset --hard, push --force, etc.) are automatically blocked
- Always check the tool response for success status
- Handle errors gracefully and provide clear feedback
- The tool returns structured JSON with success/error information

DO NOT return any explanations or additional text outside of the commit message and tool outputs.
DO NOT suggest any further actions beyond the commit.
DO NOT attempt to push the commit or interact with remote repositories.

Perform the above steps methodically using the master git tool to ensure a clean, well-documented commit.

`;
