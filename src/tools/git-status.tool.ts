import { tool } from "langchain";
import { executeGitCommand, validateGitRepo } from "../utils/git-commands.js";
import type { ToolResult } from "../utils/git-error.js";

/**
 * Git status tool - Get the current status of the git repository
 */
export const git_status_tool = tool(
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
