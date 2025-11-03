/**
 * @fileoverview Master git command execution tool for LangChain agents.
 * Provides a unified interface for executing any git command with comprehensive
 * safety checks, logging, and multi-line commit message support.
 * 
 * @module tools/git-master-tool
 */

import { execa } from "execa";
import fs from "fs/promises";
import path from "path";
import { tool } from "langchain";
import { z } from "zod";
import { validateGitRepo, validateCommandSyntax } from "../utils/git-commands.js";
import { GitError, type ToolResult } from "../utils/git-error.js";

/**
 * List of dangerous git commands that should be blocked by default.
 * These commands can cause data loss or unintended consequences.
 * 
 * @constant {string[]}
 */
const DANGEROUS_COMMANDS = ["reset --hard", "push --force", "push -f", "clean -fd", "clean -f", "rm -rf"];

/**
 * List of git commands that require extra caution but can be allowed.
 * These commands modify git history or state in significant ways.
 * 
 * @constant {string[]}
 */
const CAUTION_COMMANDS = ["rebase", "merge", "cherry-pick", "reset"];

/**
 * Check if a command contains dangerous operations that could cause data loss.
 * 
 * @param {string} command - The git command name (e.g., "reset", "push")
 * @param {string[]} args - The command arguments
 * @returns {boolean} True if the command is considered dangerous
 * 
 * @example
 * isDangerousCommand("reset", ["--hard", "HEAD~1"]); // true
 * isDangerousCommand("status", ["--porcelain"]); // false
 */
function isDangerousCommand(command: string, args: string[]): boolean {
    const fullCommand = `${command} ${args.join(" ")}`;
    return DANGEROUS_COMMANDS.some((dangerous) => fullCommand.includes(dangerous));
}

/**
 * Check if a command requires extra caution during execution.
 * 
 * @param {string} command - The git command name
 * @returns {boolean} True if the command requires caution
 * 
 * @example
 * requiresCaution("rebase"); // true
 * requiresCaution("status"); // false
 */
function requiresCaution(command: string): boolean {
    return CAUTION_COMMANDS.includes(command);
}

/**
 * Log git command execution details in a minimal, user-friendly format.
 * Outputs a single line with success/failure indicator, command, and duration.
 * Only shows detailed error information on failure.
 * 
 * @param {Object} data - Execution data to log
 * @param {string} data.command - The git command that was executed
 * @param {string[]} data.args - The command arguments
 * @param {number} data.startTime - Execution start timestamp (ms)
 * @param {number} data.endTime - Execution end timestamp (ms)
 * @param {boolean} data.success - Whether the command succeeded
 * @param {string} [data.stdout] - Standard output from the command
 * @param {string} [data.stderr] - Standard error from the command
 * @param {any} [data.error] - Error object if command failed
 * 
 * @example
 * logExecution({
 *   command: "status",
 *   args: ["--porcelain"],
 *   startTime: 1234567890,
 *   endTime: 1234567935,
 *   success: true
 * });
 * // Output: ✓ git status --porcelain (45ms)
 */
function logExecution(data: {
    command: string;
    args: string[];
    startTime: number;
    endTime: number;
    success: boolean;
    stdout?: string;
    stderr?: string;
    error?: any;
}) {
    const duration = data.endTime - data.startTime;
    const icon = data.success ? "✓" : "✗";
    const argsStr = data.args.length > 0 ? " " + data.args.join(" ") : "";

    console.log(`${icon} git ${data.command}${argsStr} (${duration}ms)`);

    // Only show error details if command failed
    if (!data.success && data.error) {
        const errorMsg = data.error.message || data.stderr || data.error;
        console.log(`  Error: ${errorMsg}`);
    }
}

/**
 * Master git command execution tool for LangChain agents.
 * 
 * This is the primary tool for executing any git command with comprehensive safety checks,
 * automatic logging, and special handling for multi-line commit messages.
 * 
 * Key Features:
 * - Executes any git command with flexible argument passing
 * - Automatic validation that current directory is a git repository
 * - Safety checks to block dangerous commands by default
 * - Special handling for commit messages (saves to temp file, uses -F flag)
 * - Structured JSON responses with success/error information
 * - Minimal console logging (✓/✗ with duration)
 * - Automatic cleanup of temporary files
 * 
 * Safety Features:
 * - Blocks dangerous commands (reset --hard, push --force, etc.) unless explicitly allowed
 * - Warns about commands requiring caution (rebase, merge, etc.)
 * - 30-second timeout for all commands
 * - Comprehensive error handling with recovery suggestions
 * 
 * @async
 * @param {Object} params - Tool parameters
 * @param {string} params.command - Git command to execute (e.g., "status", "commit", "diff")
 * @param {string[]} params.args - Command arguments (e.g., ["--porcelain"], ["."])
 * @param {boolean} [params.allowDangerous=false] - Allow dangerous commands that could cause data loss
 * @param {string} [params.commitMessage] - Multi-line commit message (for commit command only)
 * 
 * @returns {Promise<string>} JSON string containing ToolResult with success/error information
 * 
 * @example
 * // Check repository status
 * const result = await execute_git_command_tool({
 *   command: "status",
 *   args: ["--porcelain"]
 * });
 * 
 * @example
 * // Stage all files
 * const result = await execute_git_command_tool({
 *   command: "add",
 *   args: ["."]
 * });
 * 
 * @example
 * // Commit with multi-line message
 * const result = await execute_git_command_tool({
 *   command: "commit",
 *   args: [],
 *   commitMessage: `feat(auth): add login functionality
 * 
 * - Implemented JWT authentication
 * - Added password hashing with bcrypt
 * - Created login and logout endpoints
 * 
 * Closes #123`
 * });
 * 
 * @example
 * // Get diff statistics
 * const result = await execute_git_command_tool({
 *   command: "diff",
 *   args: ["--stat"]
 * });
 * 
 * @example
 * // Allow dangerous command (use with caution!)
 * const result = await execute_git_command_tool({
 *   command: "reset",
 *   args: ["--hard", "HEAD~1"],
 *   allowDangerous: true
 * });
 */
export const execute_git_command_tool = tool(
    async ({
        command,
        args,
        allowDangerous = false,
        commitMessage
    }: {
        command: string;
        args: string[];
        allowDangerous?: boolean;
        commitMessage?: string;
    }): Promise<string> => {
        const startTime = Date.now();
        let commitMessageFile: string | null = null;

        try {
            // Validate git repository
            await validateGitRepo();

            // Validate and fix command syntax
            args = validateCommandSyntax(command, args);

            // Special handling for commit command with commitMessage
            if (command === "commit" && commitMessage) {
                // Save commit message to temporary file
                commitMessageFile = path.join(process.cwd(), `commit_message_${Date.now()}.txt`);
                await fs.writeFile(commitMessageFile, commitMessage);

                // Replace -m flag with -F flag pointing to the file
                const filteredArgs = args.filter((arg) => arg !== "-m" && !arg.startsWith("commit message"));
                args = ["-F", commitMessageFile, ...filteredArgs];

                // Show first line of commit message
                const firstLine = commitMessage.split("\n")[0];
                console.log(`📝 Commit: ${firstLine}`);
            }

            // Safety check for dangerous commands
            if (!allowDangerous && isDangerousCommand(command, args)) {
                const error = new GitError(
                    `Dangerous command blocked: git ${command} ${args.join(" ")}`,
                    "DANGEROUS_COMMAND_BLOCKED",
                    { command, args },
                    false,
                    "This command could cause data loss. If you're sure, set allowDangerous: true"
                );

                logExecution({
                    command,
                    args,
                    startTime,
                    endTime: Date.now(),
                    success: false,
                    error: error.message
                });

                const errorResult: ToolResult = {
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message,
                        command: `git ${command} ${args.join(" ")}`,
                        details: error.details,
                        recoverable: error.recoverable,
                        ...(error.suggestion && { suggestion: error.suggestion })
                    }
                };

                return JSON.stringify(errorResult, null, 2);
            }

            // Warning for caution commands
            const warnings: string[] = [];
            if (requiresCaution(command)) {
                warnings.push(`⚠️  Caution: '${command}' command requires careful review`);
            }

            // Execute the git command
            const result = await execa("git", [command, ...args], {
                timeout: 30000,
                reject: false
            });

            const endTime = Date.now();
            const success = result.exitCode === 0;

            // Log execution details
            logExecution({
                command,
                args,
                startTime,
                endTime,
                success,
                stdout: result.stdout,
                stderr: result.stderr,
                error: result.failed ? result : undefined
            });

            if (!success) {
                const error = new GitError(
                    `Git command failed: git ${command} ${args.join(" ")}`,
                    "GIT_COMMAND_FAILED",
                    {
                        exitCode: result.exitCode,
                        stderr: result.stderr,
                        stdout: result.stdout
                    },
                    true,
                    "Check the command syntax and repository state"
                );

                const errorResult: ToolResult = {
                    success: false,
                    error: {
                        code: error.code,
                        message: error.message,
                        command: `git ${command} ${args.join(" ")}`,
                        details: error.details,
                        recoverable: error.recoverable,
                        ...(error.suggestion && { suggestion: error.suggestion })
                    }
                };

                return JSON.stringify(errorResult, null, 2);
            }

            // Success result
            const successResult: ToolResult = {
                success: true,
                data: {
                    command: `git ${command} ${args.join(" ")}`,
                    stdout: result.stdout,
                    stderr: result.stderr,
                    exitCode: result.exitCode,
                    executionTime: endTime - startTime
                },
                ...(warnings.length > 0 && { warnings })
            };

            return JSON.stringify(successResult, null, 2);
        } catch (error: any) {
            const endTime = Date.now();

            logExecution({
                command,
                args,
                startTime,
                endTime,
                success: false,
                error
            });

            const errorResult: ToolResult = {
                success: false,
                error: {
                    code: error.code || "UNKNOWN_ERROR",
                    message: error.message,
                    command: `git ${command} ${args.join(" ")}`,
                    details: error.details,
                    recoverable: error.recoverable ?? true,
                    suggestion: error.suggestion || "Check git installation and repository state"
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
        name: "execute_git_command",
        description:
            "Execute any git command with comprehensive logging and safety checks. This is a master tool that can run any git operation. For commit commands, use the commitMessage parameter to provide multi-line commit messages - the tool will automatically save it to a file and use -F flag. Dangerous commands (reset --hard, push --force, etc.) are blocked by default. All executions are logged with command, arguments, timing, and results.",
        schema: z.object({
            command: z.string().describe("The git command to execute (e.g., 'status', 'diff', 'add', 'commit')"),
            args: z
                .array(z.string())
                .describe(
                    "Arguments for the git command (e.g., ['--porcelain'], ['.']). For commit, do NOT include -m flag, use commitMessage parameter instead."
                ),
            allowDangerous: z
                .boolean()
                .optional()
                .describe("Allow dangerous commands that could cause data loss (default: false)"),
            commitMessage: z
                .string()
                .optional()
                .describe(
                    "For commit command: Multi-line commit message. Tool will save to file and use -F flag automatically. Supports full conventional commit format with body and footer."
                )
        })
    }
);
