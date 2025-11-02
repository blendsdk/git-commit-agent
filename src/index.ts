import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import { execa } from "execa";
import fs from "fs";
import { createAgent, HumanMessage, tool } from "langchain";
import path from "path";
import { z } from "zod";
import os from "os";

// Load environment variables from multiple sources
// 1. Load from global .env-git-agent in user's home directory (if exists)
const globalEnvPath = path.join(os.homedir(), ".env-git-agent");
if (fs.existsSync(globalEnvPath)) {
    console.log(`Loading global config from: ${globalEnvPath}`);
    dotenv.config({ path: globalEnvPath });
}

// 2. Load from local .env (overrides global settings)
dotenv.config();

const model = new ChatOpenAI({
    temperature: 1,
    modelName: "gpt-5-nano-2025-08-07"
});

const git_status_tool = tool(
    async () => {
        console.log("Executing git status...");
        await execa("git", ["config", "--global", "pager.diff", "false"]);

        const status = await execa("git", ["status", "--porcelain"]);
        const diff = await execa("git", ["diff", "--name-only"]);
        const cached = await execa("git", ["diff", "--name-only", "--cached"]);
        return [
            `Git Status:\n${status.stdout}`,
            `Changed Files:\n${diff.stdout}`,
            `Staged Files:\n${cached.stdout}`
        ].join("\n\n");
    },
    {
        name: "git_status",
        description: "Get the current status of the git repository"
    }
);

const git_diff_tool = tool(
    async () => {
        console.log("Executing git diff...");
        const diff1 = await execa("git", ["--no-pager", "diff"]);
        const diff2 = await execa("git", ["diff", "--cached"]);
        const stdout = `=== UNSTAGED CHANGES ===\n${diff1.stdout}\n\n=== STAGED CHANGES ===\n${diff2.stdout}`;
        return stdout;
    },
    {
        name: "git_diff",
        description: "Get the detailed diff of the current changes in the git repository"
    }
);

const git_add_tool = tool(
    async () => {
        console.log("Executing git add . ...");
        const { stdout } = await execa("git", ["add", "."]);
        return stdout.toString();
    },
    {
        name: "git_add",
        description: "Stage all changes in the git repository"
    }
);

const git_commit_tool = tool(
    async ({ commit_message }) => {
        console.log("Executing git commit...");
        console.log("Commit message:", commit_message);
        const commitMessageFile = path.join(process.cwd(), "commit_message.txt");
        fs.writeFileSync(commitMessageFile, commit_message.toString());
        const result = await execa("git", ["commit", "-F", commitMessageFile]);
        fs.unlinkSync(commitMessageFile);
        return result.stdout.toString();
    },
    {
        name: "git_commit",
        description: "Commit the staged changes with the provided commit message",
        schema: z.object({
            commit_message: z.string().describe("The commit message summarizing the changes")
        })
    }
);

const agent = createAgent({
    model,
    tools: [git_status_tool, git_diff_tool, git_add_tool, git_commit_tool],
    systemPrompt: `You are a helpful assistant that can execute git commands to help manage a git repository.`
});

const streamResponse = await agent.invoke({
    messages: [
        new HumanMessage(`
# TASK OBJECTIVE
Analyze all current changes in the git repository, generate a comprehensive and detailed commit message based on
the modifications, stage all changes, and execute the commit. Create a commit message that follows conventional
commit standards and provides clear context for future developers.

# WORKFLOW
1. Use git_status_tool to get current repository status and changed files
2. Use git_diff_tool to examine detailed differences and understand the nature of changes
3. Analyze the changes to determine:
   - The primary type of change (feature, fix, refactor, etc.)
   - The scope/area affected (component, module, feature area)
   - The impact and purpose of the changes
4. Use git_add_tool to stage all changes
5. Generate a comprehensive conventional commit message
6. Use git_commit_tool to commit with the generated message

# CONVENTIONAL COMMIT FORMAT

Structure:
<type>(<scope>): <subject>

<body>

<footer>

## Commit Types (Choose the most appropriate)

| Type | When to Use | Example |
|------|-------------|---------|
| feat | New feature or functionality | feat(auth): add OAuth2 support |
| fix | Bug fix | fix(api): prevent race condition in requests |
| docs | Documentation only | docs(readme): update installation steps |
| style | Code style/formatting (no logic change) | style(parser): fix indentation |
| refactor | Code restructuring (no bug fix or feature) | refactor(utils): extract validation logic |
| perf | Performance improvement | perf(query): optimize database queries |
| test | Adding or updating tests | test(auth): add unit tests for login |
| build | Build system or dependency changes | build(deps): update webpack to v5 |
| ci | CI configuration changes | ci(github): add automated testing |
| chore | Other changes (no src/test modification) | chore(config): update eslint rules |

## Scope Guidelines

The scope indicates the area of codebase affected. Examples:
- Component name: auth, api, ui, dashboard, parser
- Module name: validator, router, middleware
- File type: config, types, styles
- Feature area: login, checkout, profile, search

## Subject Line Rules (CRITICAL)

- Use imperative mood: "add" NOT "added" or "adds"
- Do NOT capitalize first letter
- No period at the end
- Maximum 72 characters
- Be specific and descriptive

Good: "add user authentication middleware"
Bad: "Added new feature" (wrong tense, vague, capitalized)

## Body Guidelines (For non-trivial changes)

- Explain WHAT changed and WHY (not HOW - code shows that)
- Wrap at 72 characters per line
- Separate from subject with blank line
- Use bullet points for multiple changes
- Provide context that helps future developers understand the reasoning

## Footer (Optional)

- Breaking changes: "BREAKING CHANGE: description"
- Issue references: "Fixes #123" or "Closes #456"

# ANALYSIS GUIDELINES

When analyzing the diff:

1. **Read carefully** - Understand what actually changed, not just file names
2. **Identify patterns** - Are multiple files changed for the same reason?
3. **Determine primary type** - What's the main purpose? (feat/fix/refactor/etc)
4. **Find the scope** - What component/module/area is affected?
5. **Assess impact** - Is this breaking? Does it affect users?
6. **Group related changes** - Multiple small changes might be one logical change
7. **Be specific** - "fix null pointer in validation" NOT "fix bug"

# COMPLETE EXAMPLES

Example 1 - Feature with body:
feat(auth): add OAuth2 authentication support

- Implement OAuth2 flow with Google and GitHub providers
- Add token refresh mechanism
- Create user session management
- Update authentication middleware to support OAuth tokens

This enables users to sign in using their existing social accounts,
improving user experience and reducing friction in the signup process.

Example 2 - Bug fix with context:
fix(api): prevent race condition in concurrent requests

The previous implementation didn't properly handle concurrent API calls
to the same resource, causing data inconsistency. This fix adds proper
request queuing and mutex locks to ensure data integrity.

Example 3 - Refactoring:
refactor(parser): extract validation logic into separate module

- Move validation functions to validators.ts
- Create reusable validation schemas
- Improve error messages for better debugging
- Add unit tests for validation logic

This improves code maintainability and makes validation logic
reusable across different parsers.

# QUALITY CHECKLIST

Before finalizing, verify:
- Type accurately reflects the change
- Scope clearly indicates affected area
- Subject is concise (<72 chars), imperative mood, no period
- Body explains WHAT and WHY for non-trivial changes
- Message is clear for someone unfamiliar with the code
- No typos or grammatical errors

# IMPORTANT NOTES

- Always examine actual diff content, don't just rely on file names
- For multiple unrelated changes, focus on the primary change
- If changes are complex, summarize main points in body with bullets
- Make the commit message tell a story that future developers can understand
- Stage all changes before committing
        `)
    ]
});

console.log("Done!");
