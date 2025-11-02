import fs from "fs/promises";
import { tool } from "langchain";
import { z } from "zod";
import { executeGitCommand, validateGitRepo } from "../utils/git-commands.js";
import { GitError, type ToolResult } from "../utils/git-error.js";

/**
 * Git add tool - Stage changes in the repository
 */
export const git_add_tool = tool(
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
