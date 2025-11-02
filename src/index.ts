import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import { execa } from "execa";
import fs from "fs";
import { createAgent, HumanMessage, tool } from "langchain";
import path from "path";
import { z } from "zod";

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
the modifications, stage all changes, and execute the commit. The workflow takes current git status and changed files
as input, analyzes the nature and scope of changes, and outputs a properly staged and committed set of changes with
a detailed conventional commit message.

Use the:
    - git_status_tool to get the current status of the repository and the list of changed files.
    - git_add_tool to stage all changes.
    - git_commit_tool to commit the staged changes with the generated commit message.
    - git_diff_tool to get detailed differences if needed.

Ensure the commit message adheres to conventional commit standards, providing clarity on what changes were made
and why. The commit message should be detailed enough for future reference.

# COMMIT MESSAGE GUIDELINES
- Use conventional commit format (type(scope): subject).
- Include a detailed description of changes.
- Mention any related issues or tickets if applicable.
- Ensure clarity and conciseness.

# RESPONSE FORMAT
Provide the response in the following JSON format:

{
  "commit_message": string; // A detailed conventional commit message summarizing all changes.
  "staged_files": string[]; // A list of all files that were staged for the commit.
  "commit_hash": string; // The hash of the created commit.
}

Make sure to stage all changes before committing and provide accurate information in the response.
        `)
    ]
});

console.log("Done!");
