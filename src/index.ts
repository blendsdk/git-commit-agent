#!/usr/bin/env node

/**
 * @fileoverview Main entry point for the Git Commit Agent CLI tool.
 * This module initializes the LangChain agent with OpenAI integration and executes
 * the git commit workflow to analyze changes and generate conventional commit messages.
 * 
 * @module index
 */

import { ChatOpenAI } from "@langchain/openai";
import { createAgent, HumanMessage } from "langchain";
import { loadEnvironment } from "./config/env-loader.js";
import { GIT_PROMPT, SYSTEM_PROMPT } from "./prompts/index.js";
import { execute_git_command_tool } from "./tools/git-master.tool.js";

// ============================================================================
// ENVIRONMENT SETUP
// ============================================================================

/**
 * Load environment variables from global and local configuration files.
 * This must be done before initializing the OpenAI client.
 */
await loadEnvironment();

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
 * Create the LangChain agent with the configured model and git command tool.
 * The agent uses the system prompt to understand its role and capabilities.
 * 
 * @type {Agent}
 */
const agent = createAgent({
    model,
    tools: [execute_git_command_tool],
    systemPrompt: SYSTEM_PROMPT
});

// ============================================================================
// MAIN EXECUTION
// ============================================================================

console.log("\n🚀 Starting Git Commit Agent...\n");

/**
 * Invoke the agent with the git commit task prompt.
 * The agent will analyze git changes, generate a commit message, stage files, and commit.
 * 
 * @type {Promise<AgentResponse>}
 */
const streamResponse = await agent.invoke({
    messages: [new HumanMessage(GIT_PROMPT)]
});

// Display the agent's final response
console.log("\n" + "=".repeat(80));
console.log("AGENT RESPONSE:");
console.log("=".repeat(80));
console.log(streamResponse.messages.at(-1)?.content || "No response from agent.");
console.log("=".repeat(80) + "\n");
