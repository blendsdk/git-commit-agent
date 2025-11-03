/**
 * @fileoverview Central export point for all prompt templates and generators used by the Git Commit Agent.
 * 
 * @module prompts
 */

// Export generator functions (recommended)
export { generateSystemPrompt } from "./system-prompt.js";
export { generateGitPrompt } from "./git-prompt-generator.js";

// Export legacy constants for backward compatibility
export { SYSTEM_PROMPT } from "./system-prompt.js";
export { GIT_PROMPT } from "./git-prompt.js";
