import fs from "fs/promises";
import path from "path";
import { tool } from "langchain";
import { z } from "zod";
import { executeGitCommand, validateGitRepo } from "../utils/git-commands.js";
import { GitError, type ToolResult } from "../utils/git-error.js";
import { validateCommitMessage } from "../utils/validators.js";

/**
 * Git commit tool - Commit staged changes with a message
 */
export const git_commit_tool = tool(
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
