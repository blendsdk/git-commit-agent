import { execa } from "execa";
import { tool } from "langchain";
import { z } from "zod";
import { validateGitRepo } from "../utils/git-commands.js";
import { GitError, type ToolResult } from "../utils/git-error.js";

/**
 * Dangerous git commands that should be blocked by default
 */
const DANGEROUS_COMMANDS = ["reset --hard", "push --force", "push -f", "clean -fd", "clean -f", "rm -rf"];

/**
 * Commands that require extra caution but can be allowed
 */
const CAUTION_COMMANDS = ["rebase", "merge", "cherry-pick", "reset"];

/**
 * Check if a command contains dangerous operations
 */
function isDangerousCommand(command: string, args: string[]): boolean {
    const fullCommand = `${command} ${args.join(" ")}`;
    return DANGEROUS_COMMANDS.some((dangerous) => fullCommand.includes(dangerous));
}

/**
 * Check if a command requires caution
 */
function requiresCaution(command: string): boolean {
    return CAUTION_COMMANDS.includes(command);
}

/**
 * Log git command execution details
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
    const timestamp = new Date().toISOString();

    console.log("\n" + "=".repeat(80));
    console.log(`[GIT COMMAND EXECUTION LOG]`);
    console.log(`Timestamp: ${timestamp}`);
    console.log(`Command: git ${data.command}`);
    console.log(`Arguments: ${JSON.stringify(data.args)}`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Status: ${data.success ? "✓ SUCCESS" : "✗ FAILED"}`);

    if (data.stdout) {
        console.log(`\nStdout (${data.stdout.length} chars):`);
        console.log(data.stdout.substring(0, 500) + (data.stdout.length > 500 ? "..." : ""));
    }

    if (data.stderr) {
        console.log(`\nStderr:`);
        console.log(data.stderr);
    }

    if (data.error) {
        console.log(`\nError Details:`);
        console.log(data.error.message || data.error);
    }

    console.log("=".repeat(80) + "\n");
}

/**
 * Master Git Tool - Execute any git command with safety checks and logging
 */
export const execute_git_command_tool = tool(
    async ({
        command,
        args,
        allowDangerous = false
    }: {
        command: string;
        args: string[];
        allowDangerous?: boolean;
    }): Promise<string> => {
        const startTime = Date.now();

        try {
            // Validate git repository
            await validateGitRepo();

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
        }
    },
    {
        name: "execute_git_command",
        description:
            "Execute any git command with comprehensive logging and safety checks. This is a master tool that can run any git operation. Dangerous commands (reset --hard, push --force, etc.) are blocked by default. All executions are logged with command, arguments, timing, and results.",
        schema: z.object({
            command: z.string().describe("The git command to execute (e.g., 'status', 'diff', 'add', 'commit')"),
            args: z
                .array(z.string())
                .describe("Arguments for the git command (e.g., ['--porcelain'], ['.'], ['-m', 'commit message'])"),
            allowDangerous: z
                .boolean()
                .optional()
                .describe("Allow dangerous commands that could cause data loss (default: false)")
        })
    }
);
