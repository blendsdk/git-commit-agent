import { tool } from "langchain";
import { z } from "zod";
import { executeGitCommand, validateGitRepo } from "../utils/git-commands.js";
import type { ToolResult } from "../utils/git-error.js";

/**
 * Git diff tool - Get the detailed diff of changes in the repository
 */
export const git_diff_tool = tool(
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
