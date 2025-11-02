import { execa } from "execa";
import { GitError } from "./git-error.js";

/**
 * Validate if current directory is a git repository
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
 * Check if git is installed
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
 * Execute git command with error handling
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
