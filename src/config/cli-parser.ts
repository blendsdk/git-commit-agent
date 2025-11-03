/**
 * @fileoverview CLI argument parser using yargs. Defines all command-line options and their validation rules.
 *
 * @module config/cli-parser
 */

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import type { PromptConfig } from "./prompt-config.js";
import { VALID_COMMIT_TYPES, isValidCommitType } from "./prompt-config.js";

/**
 * Parse command-line arguments and return a partial PromptConfig. Values not provided via CLI will be undefined,
 * allowing them to be filled by environment variables or defaults.
 *
 * @returns Partial configuration from CLI arguments
 */
export function parseCliArguments(): Partial<PromptConfig> {
    const argv = yargs(hideBin(process.argv))
        .scriptName("git-commit-agent")
        .usage("$0 [options]", "AI-powered git commit message generator")
        .version()
        .help("help")
        .alias("help", "h")
        .alias("version", "v")

        // ============================================================================
        // COMMIT MESSAGE FORMAT OPTIONS
        // ============================================================================
        .group(
            ["commit-type", "scope", "subject-max-length", "detail-level", "file-breakdown"],
            "Commit Message Format:"
        )

        .option("commit-type", {
            type: "string",
            description: "Force specific commit type",
            choices: [...VALID_COMMIT_TYPES]
        })

        .option("scope", {
            type: "string",
            description: "Set commit scope (e.g., auth, api, ui)"
        })

        .option("subject-max-length", {
            type: "number",
            description: "Maximum subject line length",
            default: undefined // Will use config default if not specified
        })

        .option("detail-level", {
            type: "string",
            description: "Commit message detail level",
            choices: ["brief", "normal", "detailed"]
        })

        .option("file-breakdown", {
            type: "boolean",
            description: "Include file-by-file breakdown in commit body",
            default: undefined
        })

        // ============================================================================
        // BEHAVIOR CONTROL OPTIONS
        // ============================================================================
        .group(["auto-stage", "push", "no-verify", "conventional-strict"], "Behavior Controls:")

        .option("auto-stage", {
            type: "string",
            description: "Automatic staging behavior",
            choices: ["all", "modified", "none"]
        })

        .option("push", {
            type: "boolean",
            description: "Push changes to remote repository after committing",
            default: undefined
        })

        .option("no-verify", {
            type: "boolean",
            description: "Skip commit verification hooks",
            default: undefined
        })

        .option("conventional-strict", {
            type: "boolean",
            description: "Enforce strict conventional commit format",
            default: undefined
        })

        // ============================================================================
        // EXECUTION OPTIONS
        // ============================================================================
        .group(["dry-run", "verbose", "config"], "Execution:")

        .option("dry-run", {
            type: "boolean",
            description: "Analyze and generate message without committing",
            default: undefined
        })

        .option("verbose", {
            type: "boolean",
            description: "Enable verbose logging",
            default: undefined
        })

        .option("config", {
            type: "string",
            description: "Path to custom config file"
        })

        // ============================================================================
        // EXAMPLES
        // ============================================================================
        .example("$0", "Use defaults from .env or built-in")
        .example("$0 --commit-type feat --scope auth", "Force commit type and scope")
        .example("$0 --detail-level brief --no-file-breakdown", "Brief commit message")
        .example("$0 --dry-run", "Preview commit message without committing")
        .example("$0 --auto-stage all --push", "Stage all files and push")
        .example("$0 --verbose", "Enable verbose output for debugging")

        .epilogue("For more information, visit: https://github.com/blendsdk/git-commit-agent")
        .parseSync();

    // Build partial config from CLI arguments
    const config: Partial<PromptConfig> = {};

    // Commit format options
    if (argv.commitType !== undefined) {
        if (isValidCommitType(argv.commitType)) {
            config.commitType = argv.commitType;
        } else {
            throw new Error(
                `Invalid commit type: ${argv.commitType}. Must be one of: ${VALID_COMMIT_TYPES.join(", ")}`
            );
        }
    }

    if (argv.scope !== undefined) {
        config.scope = argv.scope;
    }

    if (argv.subjectMaxLength !== undefined) {
        if (argv.subjectMaxLength < 20 || argv.subjectMaxLength > 200) {
            throw new Error("Subject max length must be between 20 and 200 characters");
        }
        config.subjectMaxLength = argv.subjectMaxLength;
    }

    if (argv.detailLevel !== undefined) {
        config.detailLevel = argv.detailLevel as "brief" | "normal" | "detailed";
    }

    if (argv.fileBreakdown !== undefined) {
        config.includeFileBreakdown = argv.fileBreakdown;
    }

    // Behavior options
    if (argv.autoStage !== undefined) {
        config.autoStage = argv.autoStage as "all" | "modified" | "none";
    }

    if (argv.push !== undefined) {
        config.push = argv.push;
    }

    if (argv.noVerify !== undefined) {
        config.skipVerification = argv.noVerify;
    }

    if (argv.conventionalStrict !== undefined) {
        config.conventionalStrict = argv.conventionalStrict;
    }

    // Execution options
    if (argv.dryRun !== undefined) {
        config.dryRun = argv.dryRun;
    }

    if (argv.verbose !== undefined) {
        config.verbose = argv.verbose;
    }

    return config;
}
