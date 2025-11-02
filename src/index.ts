import { ChatOpenAI } from "@langchain/openai";
import dotenv from "dotenv";
import { execa } from "execa";
import fs from "fs/promises";
import { createAgent, HumanMessage, tool } from "langchain";
import os from "os";
import path from "path";
import { z } from "zod";
import { GIT_PROMPT, SYSTEM_PROMPT } from "./prompts.js";

// Load environment variables from multiple sources
// 1. Load from global .agent-config in user's home directory (if exists)
const globalEnvPath = path.join(os.homedir(), ".agent-config");
try {
    const fsSync = await import("fs");
    if (fsSync.existsSync(globalEnvPath)) {
        console.log(`Loading global config from: ${globalEnvPath}`);
        dotenv.config({ path: globalEnvPath });
    }
} catch (error) {
    // Ignore if file doesn't exist
}

// 2. Load from local .env (overrides global settings)
dotenv.config();

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

class GitError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: any,
        public recoverable: boolean = true,
        public suggestion?: string
    ) {
        super(message);
        this.name = "GitError";
    }
}

interface ToolResult {
    success: boolean;
    data?: any;
    error?: {
        code: string;
        message: string;
        command?: string;
        details?: any;
        recoverable: boolean;
        suggestion?: string;
    };
    warnings?: string[];
    partialResults?: Record<string, any>;
}

// Validate if current directory is a git repository
async function validateGitRepo(): Promise<void> {
    try {
        await execa("git", ["rev-parse", "--git-dir"]);
    } catch (error) {
        throw new GitError(
            "Not a git repository",
            "NOT_GIT_REPO",
            error,
            false,
            "Initialize a git repository with 'git init' or navigate to a git repository"
        );
    }
}

// Check if git is installed
async function isGitInstalled(): Promise<boolean> {
    try {
        await execa("git", ["--version"]);
        return true;
    } catch {
        return false;
    }
}

// Validate conventional commit message format
function validateCommitMessage(message: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!message || message.trim().length === 0) {
        errors.push("Commit message cannot be empty");
        return { valid: false, errors };
    }

    const lines = message.split("\n");
    const firstLine = lines[0] || "";

    // Check conventional commit format: type(scope): description
    const conventionalCommitRegex = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?: .+/;

    if (!conventionalCommitRegex.test(firstLine)) {
        errors.push(
            "First line should follow conventional commit format: type(scope): description\n" +
                "Valid types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert"
        );
    }

    if (firstLine.length > 72) {
        errors.push("First line should be 72 characters or less");
    }

    return { valid: errors.length === 0, errors };
}

// Execute git command with error handling
async function executeGitCommand(
    args: string[],
    options: {
        timeout?: number;
        required?: boolean;
        errorMessage?: string;
    } = {}
): Promise<{ stdout: string; stderr: string; success: boolean; error?: any }> {
    const { timeout = 30000, required = true, errorMessage } = options;

    try {
        const result = await execa("git", args, { timeout });
        return {
            stdout: result.stdout,
            stderr: result.stderr,
            success: true
        };
    } catch (error: any) {
        if (required) {
            throw new GitError(
                errorMessage || `Git command failed: git ${args.join(" ")}`,
                "GIT_COMMAND_FAILED",
                error,
                true,
                "Check git status and try again"
            );
        }
        return {
            stdout: "",
            stderr: error.stderr || error.message,
            success: false,
            error
        };
    }
}

// ============================================================================
// ENHANCED EXISTING TOOLS
// ============================================================================

const git_status_tool = tool(
    async (): Promise<string> => {
        console.log("Running the git_status_tool");

        try {
            await validateGitRepo();

            const results: ToolResult = {
                success: true,
                data: {},
                warnings: [],
                partialResults: {}
            };

            // Configure pager (optional, non-blocking)
            const pagerConfig = await executeGitCommand(["config", "--global", "pager.diff", "false"], {
                required: false
            });
            if (!pagerConfig.success) {
                results.warnings?.push("Could not configure pager (non-critical)");
            }

            // Get status (required)
            const status = await executeGitCommand(["status", "--porcelain"], {
                errorMessage: "Failed to get git status"
            });
            if (results.partialResults) {
                results.partialResults.status = status.stdout;
            }

            // Get unstaged changes (required)
            const diff = await executeGitCommand(["diff", "--name-only"], {
                errorMessage: "Failed to get changed files"
            });
            if (results.partialResults) {
                results.partialResults.changedFiles = diff.stdout;
            }

            // Get staged changes (required)
            const cached = await executeGitCommand(["diff", "--name-only", "--cached"], {
                errorMessage: "Failed to get staged files"
            });
            if (results.partialResults) {
                results.partialResults.stagedFiles = cached.stdout;
            }

            // Get current branch
            const branch = await executeGitCommand(["branch", "--show-current"], { required: false });
            if (branch.success && results.partialResults) {
                results.partialResults.currentBranch = branch.stdout.trim();
            }

            const output = [
                `Git Status:\n${status.stdout || "(no changes)"}`,
                `Changed Files:\n${diff.stdout || "(none)"}`,
                `Staged Files:\n${cached.stdout || "(none)"}`
            ];

            if (branch.success && branch.stdout.trim()) {
                output.unshift(`Current Branch: ${branch.stdout.trim()}`);
            }

            if (results.warnings && results.warnings.length > 0) {
                output.push(`\nWarnings:\n${results.warnings.join("\n")}`);
            }

            results.data = output.join("\n\n");
            return JSON.stringify(results, null, 2);
        } catch (error: any) {
            const errorResult: ToolResult = {
                success: false,
                error: {
                    code: error.code || "UNKNOWN_ERROR",
                    message: error.message,
                    command: "git status",
                    details: error.details,
                    recoverable: error.recoverable ?? true,
                    suggestion: error.suggestion
                }
            };
            return JSON.stringify(errorResult, null, 2);
        }
    },
    {
        name: "git_status",
        description:
            "Get the current status of the git repository including branch, changed files, and staged files. Returns detailed status with error handling."
    }
);

const git_diff_tool = tool(
    async ({ files }: { files?: string[] }): Promise<string> => {
        console.log("Running the git_diff_tool", { files });

        try {
            await validateGitRepo();

            const results: ToolResult = {
                success: true,
                data: {},
                partialResults: {}
            };

            const diffArgs = ["--no-pager", "diff"];
            if (files && files.length > 0) {
                diffArgs.push("--", ...files);
            }

            // Get unstaged changes
            const diff1 = await executeGitCommand(diffArgs, {
                errorMessage: "Failed to get unstaged diff"
            });

            // Get staged changes
            const cachedArgs = ["diff", "--cached"];
            if (files && files.length > 0) {
                cachedArgs.push("--", ...files);
            }
            const diff2 = await executeGitCommand(cachedArgs, {
                errorMessage: "Failed to get staged diff"
            });

            // Get diff stats
            const statArgs = ["diff", "--stat"];
            if (files && files.length > 0) {
                statArgs.push("--", ...files);
            }
            const stats = await executeGitCommand(statArgs, { required: false });

            const output = [
                `=== UNSTAGED CHANGES ===\n${diff1.stdout || "(no unstaged changes)"}`,
                `\n=== STAGED CHANGES ===\n${diff2.stdout || "(no staged changes)"}`
            ];

            if (stats.success && stats.stdout) {
                output.push(`\n=== STATISTICS ===\n${stats.stdout}`);
            }

            // Check for large diffs
            const totalLines = (diff1.stdout + diff2.stdout).split("\n").length;
            if (totalLines > 1000) {
                results.warnings = [`Large diff detected (${totalLines} lines). Consider reviewing in smaller chunks.`];
            }

            results.data = output.join("\n");
            return JSON.stringify(results, null, 2);
        } catch (error: any) {
            const errorResult: ToolResult = {
                success: false,
                error: {
                    code: error.code || "UNKNOWN_ERROR",
                    message: error.message,
                    command: "git diff",
                    details: error.details,
                    recoverable: error.recoverable ?? true,
                    suggestion: error.suggestion
                }
            };
            return JSON.stringify(errorResult, null, 2);
        }
    },
    {
        name: "git_diff",
        description:
            "Get the detailed diff of changes in the git repository. Optionally specify files to diff. Returns both unstaged and staged changes with statistics.",
        schema: z.object({
            files: z
                .array(z.string())
                .optional()
                .describe("Optional array of file paths to get diff for specific files")
        })
    }
);

const git_add_tool = tool(
    async ({ files, all }: { files?: string[]; all?: boolean }): Promise<string> => {
        console.log("Running the git_add_tool", { files, all });

        try {
            await validateGitRepo();

            // Check if there are changes to stage
            const statusCheck = await executeGitCommand(["status", "--porcelain"], {
                errorMessage: "Failed to check repository status"
            });

            if (!statusCheck.stdout.trim()) {
                const result: ToolResult = {
                    success: true,
                    data: "No changes to stage",
                    warnings: ["Repository is clean, nothing to add"]
                };
                return JSON.stringify(result, null, 2);
            }

            const addArgs = ["add"];

            if (all || !files || files.length === 0) {
                addArgs.push(".");
            } else {
                // Validate files exist
                for (const file of files) {
                    try {
                        await fs.access(file);
                    } catch {
                        throw new GitError(
                            `File not found: ${file}`,
                            "FILE_NOT_FOUND",
                            { file },
                            true,
                            "Check the file path and try again"
                        );
                    }
                }
                addArgs.push(...files);
            }

            await executeGitCommand(addArgs, {
                errorMessage: "Failed to stage changes"
            });

            // Verify what was staged
            const staged = await executeGitCommand(["diff", "--name-only", "--cached"], { required: false });

            const result: ToolResult = {
                success: true,
                data: {
                    message: "Changes staged successfully",
                    stagedFiles: staged.stdout.split("\n").filter((f) => f.trim())
                }
            };

            return JSON.stringify(result, null, 2);
        } catch (error: any) {
            const errorResult: ToolResult = {
                success: false,
                error: {
                    code: error.code || "UNKNOWN_ERROR",
                    message: error.message,
                    command: "git add",
                    details: error.details,
                    recoverable: error.recoverable ?? true,
                    suggestion: error.suggestion
                }
            };
            return JSON.stringify(errorResult, null, 2);
        }
    },
    {
        name: "git_add",
        description:
            "Stage changes in the git repository. Can stage all changes or specific files. Validates files exist before staging.",
        schema: z.object({
            files: z.array(z.string()).optional().describe("Optional array of specific file paths to stage"),
            all: z.boolean().optional().describe("Stage all changes (default: true if no files specified)")
        })
    }
);

const git_commit_tool = tool(
    async ({ commit_message, validate }: { commit_message: string; validate?: boolean }): Promise<string> => {
        console.log("Running the git_commit_tool", { commit_message, validate });

        let commitMessageFile: string | null = null;

        try {
            await validateGitRepo();

            // Validate commit message format if requested
            if (validate !== false) {
                const validation = validateCommitMessage(commit_message);
                if (!validation.valid) {
                    throw new GitError(
                        "Invalid commit message format",
                        "INVALID_COMMIT_MESSAGE",
                        { errors: validation.errors },
                        true,
                        validation.errors.join("\n")
                    );
                }
            }

            // Check if there are staged changes
            const stagedCheck = await executeGitCommand(["diff", "--cached", "--name-only"], {
                errorMessage: "Failed to check staged changes"
            });

            if (!stagedCheck.stdout.trim()) {
                throw new GitError(
                    "No staged changes to commit",
                    "NO_STAGED_CHANGES",
                    undefined,
                    true,
                    "Stage changes with git_add before committing"
                );
            }

            // Write commit message to temporary file
            commitMessageFile = path.join(process.cwd(), `commit_message_${Date.now()}.txt`);
            await fs.writeFile(commitMessageFile, commit_message);

            console.log({ commit_message });

            // Execute commit
            const commitResult = await executeGitCommand(["commit", "-F", commitMessageFile], {
                errorMessage: "Failed to create commit"
            });

            // Get commit hash
            const hashResult = await executeGitCommand(["rev-parse", "HEAD"], { required: false });

            // Get commit details
            const logResult = await executeGitCommand(["log", "-1", "--pretty=format:%H|%an|%ae|%ad|%s"], {
                required: false
            });

            const result: ToolResult = {
                success: true,
                data: {
                    message: "Commit created successfully",
                    commitOutput: commitResult.stdout,
                    commitHash: hashResult.success ? hashResult.stdout.trim() : "unknown",
                    stagedFiles: stagedCheck.stdout.split("\n").filter((f) => f.trim())
                }
            };

            if (logResult.success) {
                const [hash, author, email, date, subject] = logResult.stdout.split("|");
                result.data.commitDetails = { hash, author, email, date, subject };
            }

            return JSON.stringify(result, null, 2);
        } catch (error: any) {
            const errorResult: ToolResult = {
                success: false,
                error: {
                    code: error.code || "UNKNOWN_ERROR",
                    message: error.message,
                    command: "git commit",
                    details: error.details,
                    recoverable: error.recoverable ?? true,
                    suggestion: error.suggestion
                }
            };
            return JSON.stringify(errorResult, null, 2);
        } finally {
            // Cleanup: Always try to delete the temporary commit message file
            if (commitMessageFile) {
                try {
                    await fs.unlink(commitMessageFile);
                } catch {
                    // Ignore cleanup errors
                }
            }
        }
    },
    {
        name: "git_commit",
        description:
            "Commit staged changes with a commit message. Validates conventional commit format and ensures staged changes exist. Returns commit hash and details.",
        schema: z.object({
            commit_message: z.string().describe("The commit message summarizing the changes"),
            validate: z.boolean().optional().describe("Validate commit message format (default: true)")
        })
    }
);

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL?.toString() || "gpt-5-nano-2025-08-07",
    apiKey: process.env.OPENAI_API_KEY || "<NEED API KEY>",
    maxRetries: 3
});

const agent = createAgent({
    model,
    tools: [git_status_tool, git_diff_tool, git_add_tool, git_commit_tool],
    systemPrompt: SYSTEM_PROMPT
});

// ============================================================================
// MAIN EXECUTION
// ============================================================================

const streamResponse = await agent.invoke({
    messages: [new HumanMessage(GIT_PROMPT)]
});

console.log(streamResponse.messages.at(-1)?.content || "No response from agent.");
