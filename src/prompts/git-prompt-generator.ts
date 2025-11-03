/**
 * @fileoverview Git prompt generator that creates parameterized task prompts based on configuration. This module
 * generates the main task prompt that instructs the agent on the git commit workflow.
 *
 * @module prompts/git-prompt-generator
 */

import type { PromptConfig } from "../config/prompt-config.js";

/**
 * Generate the git commit task prompt based on configuration. The prompt adapts to include different levels of
 * detail, staging behavior, and commit message requirements based on the provided config.
 *
 * @param config - Configuration object that controls prompt generation
 * @returns Generated git prompt string
 */
export function generateGitPrompt(config: PromptConfig): string {
    // Generate task objectives based on config
    const taskObjectives = generateTaskObjectives(config);

    // Generate commit message format rules based on config
    const commitMessageRules = generateCommitMessageRules(config);

    // Generate staging instructions based on config
    const stagingInstructions = generateStagingInstructions(config);

    // Generate execution instructions based on config
    const executionInstructions = generateExecutionInstructions(config);

    return `
# TASK OBJECTIVES
${taskObjectives}

# Master Git Tool Usage

You have access to \`execute_git_command\` tool that can run ANY git command with comprehensive logging and safety
checks.

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
execute_git_command({ command: "diff", args: ["--unified", "3"] })  // Auto-corrected to --unified=3
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

${commitMessageRules}

${stagingInstructions}

${executionInstructions}

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
${config.allowPush ? "You MAY push the commit if explicitly requested." : "DO NOT attempt to push the commit or interact with remote repositories."}

Perform the above steps methodically using the master git tool to ensure a clean, well-documented commit.
`;
}

function generateTaskObjectives(config: PromptConfig): string {
    const typeInstruction = config.commitType ? `using commit type "${config.commitType}"` : "determining the appropriate commit type";
    const scopeInstruction = config.scope ? `with scope "${config.scope}"` : "";
    const detailInstruction = config.detailLevel === "brief" ? "brief" : config.detailLevel === "detailed" ? "comprehensive and detailed" : "clear and informative";

    return `Analyze all current changes in the git repository using the master git tool, generate a ${detailInstruction} commit message ${typeInstruction} ${scopeInstruction} based on the modifications, stage changes as configured, and execute the commit. You have access to a single powerful tool that can execute any git command.`;
}

function generateCommitMessageRules(config: PromptConfig): string {
    const subjectLength = config.subjectMaxLength;
    const detailLevel = config.detailLevel;
    const includeFileBreakdown = config.includeFileBreakdown;
    const strictConventional = config.conventionalStrict;

    let detailInstructions = "";
    if (detailLevel === "brief") {
        detailInstructions = `
   **Body - Brief Format:**
   - Provide a concise summary of the changes in 1-2 sentences
   - Focus on the "what" and "why" without excessive detail
   - Skip file-by-file breakdown unless critical`;
    } else if (detailLevel === "detailed") {
        detailInstructions = `
   **Body - Detailed Format:**
   - Start with a comprehensive overview paragraph explaining the overall change
   - Provide extensive context about the motivation and impact
   - ${includeFileBreakdown ? 'Include a "Changes by File:" section with detailed explanations' : "Describe changes organized by functional area"}
   - ${includeFileBreakdown ? "For each modified file, explain WHAT changed and WHY in detail" : "Group related changes together with clear explanations"}
   - Include technical details about implementation choices`;
    } else {
        // normal
        detailInstructions = `
   **Body - Standard Format:**
   - Start with a brief overview paragraph explaining the overall change
   - ${includeFileBreakdown ? 'Provide a "Changes by File:" section with clear explanations' : "Describe the key changes made"}
   - ${includeFileBreakdown ? "For each modified file, explain WHAT changed and WHY in plain language" : "Focus on the most important modifications"}
   - Keep descriptions clear and to the point`;
    }

    const conventionalNote = strictConventional
        ? "You MUST follow conventional commit format strictly. Non-conventional commits are not acceptable."
        : "Follow conventional commit format when possible, but flexibility is allowed for special cases.";

    return `## 3. Generate Commit Message

1. Analyze all identified changes to determine the primary commit type${config.commitType ? ` (use "${config.commitType}" as specified)` : ""}
2. Create a ${detailLevel} commit message following conventional commit format:
   
   **First Line (Subject):**
   - ${config.commitType ? `Type: "${config.commitType}"` : "Type: Choose from (feat, fix, refactor, docs, test, build, ci, perf, style, chore)"}
   - ${config.scope ? `Scope: "${config.scope}"` : "Scope: Determine from changes (optional)"}
   - Format: \`type${config.scope ? `(${config.scope})` : "(scope)"}: descriptive summary\`
   - Maximum length: ${subjectLength} characters
   - Include the key outcome or purpose, not just the action
   
${detailInstructions}
   
   **Footer:**
   - Include breaking changes, issue references, or related information
   - ${conventionalNote}

3. ${detailLevel === "detailed" ? "Include extensive details about:" : detailLevel === "brief" ? "Include only essential information about:" : "Include key details about:"}
   - ${detailLevel === "detailed" ? "**Per-file changes**: Comprehensive description of what was added, modified, or removed" : "**Key changes**: What was modified and why"}
   - ${detailLevel === "detailed" ? "**Purpose**: Detailed explanation of why each change was made" : "**Purpose**: Brief explanation of the change motivation"}
   - ${detailLevel === "detailed" ? "**Functions/methods**: All significant functions added or modified with their purpose" : "**Functions/methods**: Major functions added or modified"}
   - ${detailLevel === "detailed" ? "**Impact**: Comprehensive analysis of how changes affect functionality" : "**Impact**: How changes affect the system"}`;
}

function generateStagingInstructions(config: PromptConfig): string {
    let stagingCommand = "";
    let stagingDescription = "";

    switch (config.autoStage) {
        case "all":
            stagingCommand = 'execute_git_command({ command: "add", args: ["."] })';
            stagingDescription = "Stage ALL changes including untracked files";
            break;
        case "modified":
            stagingCommand = 'execute_git_command({ command: "add", args: ["-u"] })';
            stagingDescription = "Stage only MODIFIED and DELETED files (excludes untracked)";
            break;
        case "none":
            stagingCommand = "// Skip staging - commit only what's already staged";
            stagingDescription = "DO NOT stage any files - only commit what is already staged";
            break;
    }

    return `## 4. Stage Changes

1. ${stagingDescription}
2. ${config.autoStage !== "none" ? "Use `execute_git_command` with appropriate staging command" : "Skip to commit step"}
3. ${config.autoStage !== "none" ? "Verify staging was successful by checking the tool response" : "Verify that files are already staged"}

**Staging Command:**
\`\`\`
${stagingCommand}
\`\`\``;
}

function generateExecutionInstructions(config: PromptConfig): string {
    const dryRunNote = config.dryRun
        ? `
**DRY RUN MODE ACTIVE:**
- DO NOT execute the actual commit
- Generate the commit message and show what would be committed
- Stop before running the commit command
- Present the generated message for review`
        : "";

    const verificationFlag = config.skipVerification ? " --no-verify" : "";

    return `## 5. Execute the Commit

${dryRunNote}

1. Use \`execute_git_command\` with "commit" command
2. **CRITICAL**: Use the \`commitMessage\` parameter with ACTUAL NEWLINE CHARACTERS (\`\\n\`)
3. **FORBIDDEN**: DO NOT use semicolons (;) to separate items - use newlines instead
4. **FORBIDDEN**: DO NOT create single-line commit messages with multiple clauses
5. ${config.skipVerification ? "Use --no-verify flag to skip verification hooks" : "Allow verification hooks to run"}
6. The tool will automatically:
   - Save the message to a temporary file
   - Use the -F flag to read from the file
   - Clean up the temporary file after commit

### Commit Message Format Rules:

**REQUIRED STRUCTURE:**
- Line 1: type${config.scope ? `(${config.scope})` : "(scope)"}: descriptive summary (max ${config.subjectMaxLength} chars)
- Line 2: BLANK LINE
- Line 3+: ${config.detailLevel === "brief" ? "Brief description" : config.detailLevel === "detailed" ? "Detailed overview and file-by-file breakdown" : "Overview and key changes"}
- Line N: BLANK LINE
- Line N+1: Footer (optional - breaking changes, issue refs, etc.)

**Commit Command:**
\`\`\`javascript
execute_git_command({
  command: "commit",
  args: [${verificationFlag ? `"${verificationFlag}"` : ""}],
  commitMessage: "type(scope): subject line

Body paragraph with changes...

Footer if needed"
})
\`\`\`

**KEY POINTS:**
- Each section MUST be on its own line
- Use \`\\n\` (newline) to separate lines, NOT semicolons
- Blank lines separate sections (subject, body, footer)
- The commitMessage string should contain actual line breaks

${config.dryRun ? "7. **STOP HERE** - Do not execute the commit in dry run mode" : "7. Verify the commit was created successfully"}
${config.dryRun ? "" : "8. Optionally get commit details with \"log\" command"}`;
}
