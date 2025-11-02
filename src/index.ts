#!/usr/bin/env node

import { ChatOpenAI } from "@langchain/openai";
import { createAgent, HumanMessage } from "langchain";
import { loadEnvironment } from "./config/env-loader.js";
import { GIT_PROMPT, SYSTEM_PROMPT } from "./prompts.js";
import { execute_git_command_tool } from "./tools/git-master.tool.js";

// ============================================================================
// ENVIRONMENT SETUP
// ============================================================================

await loadEnvironment();

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

const model = new ChatOpenAI({
    model: process.env.OPENAI_MODEL?.toString() || "gpt-5-nano-2025-08-07",
    apiKey: process.env.OPENAI_API_KEY || "<NEED API KEY>",
    maxRetries: 3
});

const agent = createAgent({
    model,
    tools: [execute_git_command_tool],
    systemPrompt: SYSTEM_PROMPT
});

// ============================================================================
// MAIN EXECUTION
// ============================================================================

console.log("\n🚀 Starting Git Commit Agent...\n");

const streamResponse = await agent.invoke({
    messages: [new HumanMessage(GIT_PROMPT)]
});

console.log("\n" + "=".repeat(80));
console.log("AGENT RESPONSE:");
console.log("=".repeat(80));
console.log(streamResponse.messages.at(-1)?.content || "No response from agent.");
console.log("=".repeat(80) + "\n");
