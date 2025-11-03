#!/usr/bin/env node

/**
 * @fileoverview Main entry point for the Git Commit Agent CLI tool. This module initializes the LangChain agent
 * with OpenAI integration, parses CLI arguments, loads configuration, and executes the git commit workflow to
 * analyze changes and generate conventional commit messages.
 * 
 * @module index
 */

import { ChatOpenAI } from "@langchain/openai";
import { createAgent, HumanMessage } from "langchain";
import { loadEnvironment } from "./config/env-loader.js";
import { parseCliArguments } from "./config/cli-parser.js";
import { loadFinalConfig } from "./config/config-merger.js";
import { generateSystemPrompt, generateGitPrompt } from "./prompts/index.js";
import { execute_git_command_tool } from "./tools/git-master.tool.js";

// ============================================================================
// CONFIGURATION SETUP
// ============================================================================

/**
 * Load environment variables from global and local configuration files.
 * This must be done before parsing CLI arguments to ensure env vars are available.
 */
await loadEnvironment();

/**
 * Parse command-line arguments to get user-specified configuration.
 */
const cliConfig = parseCliArguments();

/**
 * Merge CLI arguments, environment variables, and defaults into final configuration.
 * Priority: CLI > ENV > Defaults
 */
const config = loadFinalConfig(cliConfig);

/**
 * Display configuration if verbose mode is enabled.
 */
if (config.verbose) {
    console.log("\n📋 Configuration:");
    console.log("=".repeat(80));
    console.log(JSON.stringify(config, null, 2));
    console.log("=".repeat(80) + "\n");
}

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

/**
 * Initialize the OpenAI chat model with configuration from environment variables.
 * Falls back to default model if not specified in environment.
 * 
 * @type {ChatOpenAI}
 */
const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL?.toString() || "gpt-5-nano-2025-08-07",
    apiKey: process.env.OPENAI_API_KEY || "<NEED API KEY>",
    maxRetries: 3
});

/**
 * Generate prompts based on configuration.
 */
const systemPrompt = generateSystemPrompt(config);
const gitPrompt = generateGitPrompt(config);

/**
 * Create the LangChain agent with the configured model and git command tool.
 * The agent uses the generated system prompt to understand its role and capabilities.
 * 
 * @type {Agent}
 */
const agent = createAgent({
    model,
    tools: [execute_git_command_tool],
    systemPrompt: systemPrompt
});

// ============================================================================
// MAIN EXECUTION
// ============================================================================

console.log(`\n🚀 Starting Git Commit Agent${config.dryRun ? " (DRY RUN MODE)" : ""}...\n`);

if (config.verbose) {
    console.log("📝 Using configuration:");
    console.log(`   - Detail Level: ${config.detailLevel}`);
    console.log(`   - Subject Max Length: ${config.subjectMaxLength}`);
    console.log(`   - Auto Stage: ${config.autoStage}`);
    console.log(`   - File Breakdown: ${config.includeFileBreakdown}`);
    if (config.commitType) console.log(`   - Commit Type: ${config.commitType}`);
    if (config.scope) console.log(`   - Scope: ${config.scope}`);
    console.log();
}

/**
 * Invoke the agent with the generated git commit task prompt.
 * The agent will analyze git changes, generate a commit message, stage files, and commit.
 * 
 * @type {Promise<AgentResponse>}
 */
const streamResponse = await agent.invoke({
    messages: [new HumanMessage(gitPrompt)]
});

// Display the agent's final response
console.log("\n" + "=".repeat(80));
console.log("AGENT RESPONSE:");
console.log("=".repeat(80));
console.log(streamResponse.messages.at(-1)?.content || "No response from agent.");
console.log("=".repeat(80) + "\n");
