/**
 * Validate conventional commit message format
 */
export function validateCommitMessage(message: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!message || message.trim().length === 0) {
        errors.push("Commit message cannot be empty");
        return { valid: false, errors };
    }

    const lines = message.split("\n");
    const firstLine = lines[0] || "";

    // Check conventional commit format: type(scope): description
    const conventionalCommitRegex = /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?: .+/;

    if (!conventionalCommitRegex.test(firstLine)) {
        errors.push(
            "First line should follow conventional commit format: type(scope): description\n" +
                "Valid types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert"
        );
    }

    if (firstLine.length > 72) {
        errors.push("First line should be 72 characters or less");
    }

    return { valid: errors.length === 0, errors };
}
