/**
 * @fileoverview Git command utilities and validation functions.
 * Provides helper functions for executing git commands and validating git repositories.
 *
 * @module utils/git-commands
 */

import { execa } from "execa";
import { GitError } from "./git-error.js";

/**
 * Validate if the current directory is a git repository.
 * Throws a GitError if not in a git repository.
 *
 * @async
 * @throws {GitError} When not in a git repository (code: NOT_GIT_REPO)
 * @returns {Promise<void>} Resolves if validation succeeds
 *
 * @example
 * try {
 *   await validateGitRepo();
 *   console.log("Valid git repository");
 * } catch (error) {
 *   console.error("Not a git repository");
 * }
 */
export async function validateGitRepo(): Promise<void> {
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

/**
 * Check if git is installed and available in the system PATH.
 *
 * @async
 * @returns {Promise<boolean>} True if git is installed, false otherwise
 *
 * @example
 * const hasGit = await isGitInstalled();
 * if (!hasGit) {
 *   console.error("Git is not installed");
 * }
 */
export async function isGitInstalled(): Promise<boolean> {
    try {
        await execa("git", ["--version"]);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get the installed git version.
 *
 * @async
 * @returns {Promise<string>} Git version string (e.g., "2.39.1")
 * @throws {GitError} When git is not installed or version cannot be determined
 *
 * @example
 * const version = await getGitVersion();
 * console.log(`Git version: ${version}`);
 */
export async function getGitVersion(): Promise<string> {
    try {
        const result = await execa("git", ["--version"]);
        // Output format: "git version 2.39.1"
        const match = result.stdout.match(/git version (\d+\.\d+\.\d+)/);
        if (match && match[1]) {
            return match[1];
        }
        // Fallback: return full output if pattern doesn't match
        return result.stdout.replace("git version ", "").trim();
    } catch (error) {
        throw new GitError(
            "Could not determine git version",
            "GIT_VERSION_ERROR",
            error,
            false,
            "Ensure git is installed and accessible in PATH"
        );
    }
}

/**
 * Validate and fix common git command syntax errors.
 * This helps prevent issues where the AI constructs commands with incorrect syntax.
 *
 * @param {string} command - The git command name
 * @param {string[]} args - The command arguments
 * @returns {string[]} Corrected arguments array
 *
 * @example
 * // Fix: --unified 3 → --unified=3
 * const fixed = validateCommandSyntax("diff", ["--unified", "3"]);
 * // Returns: ["--unified=3"]
 *
 * @example
 * // Fix: --format %H → --format=%H
 * const fixed = validateCommandSyntax("log", ["--format", "%H"]);
 * // Returns: ["--format=%H"]
 */
export function validateCommandSyntax(command: string, args: string[]): string[] {
    const correctedArgs: string[] = [];
    let i = 0;

    // Options that require values with = syntax
    const equalsOptions = [
        "unified",
        "format",
        "pretty",
        "date",
        "color",
        "abbrev",
        "depth",
        "since",
        "until",
        "author",
        "committer",
        "grep"
    ];

    while (i < args.length) {
        const arg = args[i];

        // Safety check for undefined
        if (!arg) {
            i++;
            continue;
        }

        // Check if this is a long option that needs = syntax
        if (arg.startsWith("--")) {
            const optionName = arg.substring(2);
            const nextArg = args[i + 1];

            // If this option requires = syntax and next arg is a value (not another option)
            if (equalsOptions.includes(optionName) && nextArg !== undefined && !nextArg.startsWith("-")) {
                // Combine into --option=value format
                correctedArgs.push(`${arg}=${nextArg}`);
                i += 2; // Skip both current and next arg
                continue;
            }
        }

        // No correction needed, keep as-is
        correctedArgs.push(arg);
        i++;
    }

    return correctedArgs;
}

/**
 * Check if the local repository needs to pull from remote.
 * This prevents the agent from running when the local branch is behind or has diverged from remote.
 *
 * @async
 * @returns {Promise<Object>} Status object indicating if pull is needed
 * @returns {boolean} return.needsPull - True if repository needs to be pulled
 * @returns {boolean} return.canAutoPull - True if safe to automatically pull (fast-forward only)
 * @returns {string} return.message - Descriptive message about the repository state
 *
 * @example
 * const status = await checkNeedsPull();
 * if (status.needsPull) {
 *   if (status.canAutoPull) {
 *     // Safe to auto-pull
 *   } else {
 *     // Require manual intervention
 *   }
 * }
 */
export async function checkNeedsPull(): Promise<{
    needsPull: boolean;
    canAutoPull: boolean;
    message: string;
}> {
    try {
        // First, try to fetch remote updates (silently)
        try {
            await execa("git", ["fetch"], { timeout: 10000 });
        } catch (fetchError) {
            // If fetch fails (network issues, no remote, etc.), warn but continue
            return {
                needsPull: false,
                canAutoPull: false,
                message: "⚠️  Could not fetch from remote (network issue or no remote configured). Continuing anyway..."
            };
        }

        // Get current branch name
        let currentBranch: string;
        try {
            const branchResult = await execa("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
            currentBranch = branchResult.stdout.trim();

            // Skip check if in detached HEAD state
            if (currentBranch === "HEAD") {
                return {
                    needsPull: false,
                    canAutoPull: false,
                    message: "ℹ️  In detached HEAD state, skipping pull check"
                };
            }
        } catch {
            return {
                needsPull: false,
                canAutoPull: false,
                message: "⚠️  Could not determine current branch, skipping pull check"
            };
        }

        // Get local commit hash
        let localHash: string;
        try {
            const localResult = await execa("git", ["rev-parse", "@"]);
            localHash = localResult.stdout.trim();
        } catch {
            return {
                needsPull: false,
                canAutoPull: false,
                message: "⚠️  Could not get local commit hash, skipping pull check"
            };
        }

        // Get remote commit hash (upstream)
        let remoteHash: string;
        try {
            const remoteResult = await execa("git", ["rev-parse", "@{u}"]);
            remoteHash = remoteResult.stdout.trim();
        } catch {
            // No upstream branch configured
            return {
                needsPull: false,
                canAutoPull: false,
                message: `ℹ️  No upstream branch configured for '${currentBranch}', skipping pull check`
            };
        }

        // If local and remote are the same, we're up to date
        if (localHash === remoteHash) {
            return {
                needsPull: false,
                canAutoPull: false,
                message: "✅ Local branch is up to date with remote"
            };
        }

        // Get merge base (common ancestor)
        let baseHash: string;
        try {
            const baseResult = await execa("git", ["merge-base", "@", "@{u}"]);
            baseHash = baseResult.stdout.trim();
        } catch {
            return {
                needsPull: true,
                canAutoPull: false,
                message: `Repository state is unclear. Please check 'git status' and sync with remote.`
            };
        }

        // Determine relationship between local and remote
        if (localHash === baseHash) {
            // Local is behind remote (fast-forward possible) - SAFE to auto-pull
            return {
                needsPull: true,
                canAutoPull: true,
                message: `Local branch '${currentBranch}' is behind remote (will auto-pull).`
            };
        } else if (remoteHash === baseHash) {
            // Local is ahead of remote (no pull needed, but might need push)
            return {
                needsPull: false,
                canAutoPull: false,
                message: `✅ Local branch '${currentBranch}' is ahead of remote (you may need to push later)`
            };
        } else {
            // Branches have diverged - NOT safe to auto-pull
            return {
                needsPull: true,
                canAutoPull: false,
                message: `Local branch '${currentBranch}' has diverged from remote. Please run 'git pull --rebase' or 'git pull' to sync.`
            };
        }
    } catch (error) {
        // If anything unexpected happens, don't block the user
        return {
            needsPull: false,
            canAutoPull: false,
            message: "⚠️  Could not check pull status, continuing anyway..."
        };
    }
}

/**
 * Execute a git command with comprehensive error handling and timeout support.
 *
 * This is a lower-level utility function. For most use cases, prefer using
 * the execute_git_command_tool which provides additional safety checks and logging.
 *
 * @async
 * @param {string[]} args - Git command arguments (e.g., ['status', '--porcelain'])
 * @param {Object} [options={}] - Execution options
 * @param {number} [options.timeout=30000] - Command timeout in milliseconds
 * @param {boolean} [options.required=true] - Whether to throw on failure
 * @param {string} [options.errorMessage] - Custom error message for failures
 *
 * @returns {Promise<Object>} Result object containing stdout, stderr, success flag, and optional error
 * @returns {string} return.stdout - Standard output from the command
 * @returns {string} return.stderr - Standard error from the command
 * @returns {boolean} return.success - Whether the command succeeded
 * @returns {any} [return.error] - Error object if command failed (only when required=false)
 *
 * @throws {GitError} When command fails and required=true (code: GIT_COMMAND_FAILED)
 *
 * @example
 * // Execute with default options (throws on error)
 * const result = await executeGitCommand(['status', '--porcelain']);
 * console.log(result.stdout);
 *
 * @example
 * // Execute without throwing on error
 * const result = await executeGitCommand(
 *   ['diff', '--cached'],
 *   { required: false, timeout: 5000 }
 * );
 * if (result.success) {
 *   console.log(result.stdout);
 * } else {
 *   console.error(result.error);
 * }
 */
export async function executeGitCommand(
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
