import dotenv from "dotenv";
import os from "os";
import path from "path";

/**
 * Load environment variables from multiple sources
 * 1. Global .agent-config in user's home directory (if exists)
 * 2. Local .env file (overrides global settings)
 */
export async function loadEnvironment(): Promise<void> {
    // Load from global .agent-config in user's home directory (if exists)
    const globalEnvPath = path.join(os.homedir(), ".agent-config");
    try {
        const fsSync = await import("fs");
        if (fsSync.existsSync(globalEnvPath)) {
            console.log(`Loading global config from: ${globalEnvPath}`);
            dotenv.config({ path: globalEnvPath });
        }
    } catch (error) {
        // Ignore if file doesn't exist
    }

    // Load from local .env (overrides global settings)
    dotenv.config();
}
