/**
 * @fileoverview Custom error handling and result types for Git operations.
 * Provides structured error reporting and standardized tool result formats.
 * 
 * @module utils/git-error
 */

/**
 * Custom error class for Git operations with enhanced error information.
 * Extends the standard Error class to include additional context about git failures.
 * 
 * @class GitError
 * @extends {Error}
 * 
 * @example
 * throw new GitError(
 *   "Not a git repository",
 *   "NOT_GIT_REPO",
 *   { cwd: process.cwd() },
 *   false,
 *   "Initialize a git repository with 'git init'"
 * );
 */
export class GitError extends Error {
    /**
     * Creates a new GitError instance.
     * 
     * @param {string} message - Human-readable error message
     * @param {string} code - Machine-readable error code for programmatic handling
     * @param {any} [details] - Additional error context (e.g., command output, exit codes)
     * @param {boolean} [recoverable=true] - Whether the error can be recovered from
     * @param {string} [suggestion] - Suggested action to resolve the error
     */
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

/**
 * Standard result format for tool operations.
 * Provides a consistent structure for both successful and failed tool executions.
 * 
 * @interface ToolResult
 * 
 * @example
 * // Success result
 * const result: ToolResult = {
 *   success: true,
 *   data: {
 *     command: "git status",
 *     stdout: "On branch main...",
 *     executionTime: 45
 *   }
 * };
 * 
 * @example
 * // Error result
 * const result: ToolResult = {
 *   success: false,
 *   error: {
 *     code: "GIT_COMMAND_FAILED",
 *     message: "Git command failed",
 *     command: "git commit",
 *     recoverable: true,
 *     suggestion: "Check git status and try again"
 *   }
 * };
 */
export interface ToolResult {
    /** Whether the tool execution was successful */
    success: boolean;
    
    /** Data returned from successful tool execution */
    data?: any;
    
    /** Error information if the tool execution failed */
    error?: {
        /** Machine-readable error code */
        code: string;
        /** Human-readable error message */
        message: string;
        /** The command that was executed (if applicable) */
        command?: string;
        /** Additional error context and details */
        details?: any;
        /** Whether the error can be recovered from */
        recoverable: boolean;
        /** Suggested action to resolve the error */
        suggestion?: string;
    };
    
    /** Non-critical warnings that don't prevent execution */
    warnings?: string[];
    
    /** Partial results when operation partially succeeds */
    partialResults?: Record<string, any>;
}
