/**
 * @fileoverview Validation utilities for git commit messages.
 * Provides functions to validate commit messages against conventional commit standards.
 * 
 * @module utils/validators
 */

/**
 * Validate a commit message against conventional commit format standards.
 * 
 * Conventional commit format: `type(scope): description`
 * 
 * Valid types:
 * - feat: A new feature
 * - fix: A bug fix
 * - docs: Documentation only changes
 * - style: Changes that don't affect code meaning (white-space, formatting, etc)
 * - refactor: Code change that neither fixes a bug nor adds a feature
 * - perf: Code change that improves performance
 * - test: Adding missing tests or correcting existing tests
 * - build: Changes that affect the build system or external dependencies
 * - ci: Changes to CI configuration files and scripts
 * - chore: Other changes that don't modify src or test files
 * - revert: Reverts a previous commit
 * 
 * @param {string} message - The commit message to validate
 * @returns {Object} Validation result
 * @returns {boolean} return.valid - Whether the message is valid
 * @returns {string[]} return.errors - Array of validation error messages
 * 
 * @example
 * // Valid commit message
 * const result = validateCommitMessage("feat(auth): add login functionality");
 * console.log(result.valid); // true
 * console.log(result.errors); // []
 * 
 * @example
 * // Invalid commit message
 * const result = validateCommitMessage("added some stuff");
 * console.log(result.valid); // false
 * console.log(result.errors); // ["First line should follow conventional commit format..."]
 * 
 * @example
 * // Valid with multi-line body
 * const result = validateCommitMessage(`fix(api): resolve timeout issue
 * 
 * Increased timeout from 5s to 30s to handle slow connections.
 * Added retry logic for failed requests.`);
 * console.log(result.valid); // true
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
