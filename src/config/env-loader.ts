/**
 * @fileoverview Environment configuration loader for the Git Commit Agent.
 * Handles loading environment variables from multiple sources with priority ordering.
 * 
 * @module config/env-loader
 */

import dotenv from "dotenv";
import os from "os";
import path from "path";

/**
 * Load environment variables from multiple sources with priority ordering.
 * 
 * Loading order (later sources override earlier ones):
 * 1. Global .agent-config in user's home directory (if exists)
 * 2. Local .env file in current working directory (overrides global settings)
 * 
 * This allows users to have a global configuration for all projects while
 * still being able to override settings on a per-project basis.
 * 
 * Expected environment variables:
 * - OPENAI_API_KEY: API key for OpenAI (required)
 * - OPENAI_MODEL: Model name to use (optional, defaults to gpt-5-nano-2025-08-07)
 * 
 * @async
 * @returns {Promise<void>} Resolves when environment variables are loaded
 * 
 * @example
 * // Load environment variables before initializing the agent
 * await loadEnvironment();
 * const apiKey = process.env.OPENAI_API_KEY;
 */
export async function loadEnvironment(): Promise<void> {
    // Load from global .agent-config in user's home directory (if exists)
    // This provides a way to set default configuration across all projects
    const globalEnvPath = path.join(os.homedir(), ".agent-config");
    try {
        const fsSync = await import("fs");
        if (fsSync.existsSync(globalEnvPath)) {
            console.log(`Loading global config from: ${globalEnvPath}`);
            dotenv.config({ path: globalEnvPath });
        }
    } catch (error) {
        // Silently ignore if file doesn't exist or can't be read
        // This is expected behavior when no global config is set up
    }

    // Load from local .env file in current working directory
    // This overrides any global settings for project-specific configuration
    dotenv.config();
}
