/**
 * Custom error class for Git operations
 */
export class GitError extends Error {
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
 * Standard result format for tool operations
 */
export interface ToolResult {
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
