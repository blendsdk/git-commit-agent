/**
 * @fileoverview Configuration merger that combines CLI arguments, environment variables, and defaults into a final
 * configuration object. Priority: CLI > ENV > Defaults.
 *
 * @module config/config-merger
 */

import type { PromptConfig } from "./prompt-config.js";
import { DEFAULT_CONFIG } from "./prompt-config.js";

/**
 * Load configuration from environment variables. Returns a partial config with only the values that are set in the
 * environment.
 *
 * @returns Partial configuration from environment variables
 */
export function loadConfigFromEnv(): Partial<PromptConfig> {
    const config: Partial<PromptConfig> = {};

    // Commit format options
    if (process.env.COMMIT_TYPE) {
        config.commitType = process.env.COMMIT_TYPE;
    }

    if (process.env.COMMIT_SCOPE) {
        config.scope = process.env.COMMIT_SCOPE;
    }

    if (process.env.COMMIT_SUBJECT_MAX_LENGTH) {
        const length = parseInt(process.env.COMMIT_SUBJECT_MAX_LENGTH, 10);
        if (!isNaN(length)) {
            config.subjectMaxLength = length;
        }
    }

    if (process.env.COMMIT_DETAIL_LEVEL) {
        const level = process.env.COMMIT_DETAIL_LEVEL.toLowerCase();
        if (level === "brief" || level === "normal" || level === "detailed") {
            config.detailLevel = level;
        }
    }

    if (process.env.COMMIT_FILE_BREAKDOWN) {
        config.includeFileBreakdown = process.env.COMMIT_FILE_BREAKDOWN.toLowerCase() === "true";
    }

    // Behavior options
    if (process.env.AUTO_STAGE) {
        const stage = process.env.AUTO_STAGE.toLowerCase();
        if (stage === "all" || stage === "modified" || stage === "none") {
            config.autoStage = stage;
        }
    }

    if (process.env.PUSH) {
        config.push = process.env.PUSH.toLowerCase() === "true";
    }

    if (process.env.SKIP_VERIFICATION) {
        config.skipVerification = process.env.SKIP_VERIFICATION.toLowerCase() === "true";
    }

    if (process.env.CONVENTIONAL_STRICT) {
        config.conventionalStrict = process.env.CONVENTIONAL_STRICT.toLowerCase() === "true";
    }

    // Execution options
    if (process.env.DRY_RUN) {
        config.dryRun = process.env.DRY_RUN.toLowerCase() === "true";
    }

    if (process.env.VERBOSE) {
        config.verbose = process.env.VERBOSE.toLowerCase() === "true";
    }

    return config;
}

/**
 * Merge configurations with priority: CLI > ENV > Defaults. Creates a complete PromptConfig object with all
 * required fields populated.
 *
 * @param cliConfig - Configuration from CLI arguments
 * @param envConfig - Configuration from environment variables
 * @returns Complete configuration object
 */
export function mergeConfigs(cliConfig: Partial<PromptConfig>, envConfig: Partial<PromptConfig>): PromptConfig {
    const merged = {
        // Commit format - CLI > ENV > Default (optional fields can be undefined)
        ...(cliConfig.commitType !== undefined || envConfig.commitType !== undefined
            ? { commitType: cliConfig.commitType ?? envConfig.commitType }
            : {}),
        ...(cliConfig.scope !== undefined || envConfig.scope !== undefined
            ? { scope: cliConfig.scope ?? envConfig.scope }
            : {}),
        subjectMaxLength: cliConfig.subjectMaxLength ?? envConfig.subjectMaxLength ?? DEFAULT_CONFIG.subjectMaxLength,
        detailLevel: cliConfig.detailLevel ?? envConfig.detailLevel ?? DEFAULT_CONFIG.detailLevel,
        includeFileBreakdown:
            cliConfig.includeFileBreakdown ?? envConfig.includeFileBreakdown ?? DEFAULT_CONFIG.includeFileBreakdown,

        // Behavior - CLI > ENV > Default
        autoStage: cliConfig.autoStage ?? envConfig.autoStage ?? DEFAULT_CONFIG.autoStage,
        push: cliConfig.push ?? envConfig.push ?? DEFAULT_CONFIG.push,
        skipVerification: cliConfig.skipVerification ?? envConfig.skipVerification ?? DEFAULT_CONFIG.skipVerification,
        conventionalStrict:
            cliConfig.conventionalStrict ?? envConfig.conventionalStrict ?? DEFAULT_CONFIG.conventionalStrict,

        // Execution - CLI > ENV > Default
        dryRun: cliConfig.dryRun ?? envConfig.dryRun ?? DEFAULT_CONFIG.dryRun,
        verbose: cliConfig.verbose ?? envConfig.verbose ?? DEFAULT_CONFIG.verbose
    } as PromptConfig;

    return merged;
}

/**
 * Load and merge all configuration sources into a final configuration object.
 *
 * @param cliConfig - Configuration from CLI arguments
 * @returns Complete configuration object
 */
export function loadFinalConfig(cliConfig: Partial<PromptConfig>): PromptConfig {
    const envConfig = loadConfigFromEnv();
    return mergeConfigs(cliConfig, envConfig);
}
