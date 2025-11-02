#!/usr/bin/env node

import { ChatOpenAI } from "@langchain/openai";
import { createAgent, HumanMessage } from "langchain";
import { loadEnvironment } from "./config/env-loader.js";
import { GIT_PROMPT, SYSTEM_PROMPT } from "./prompts.js";
import { git_add_tool } from "./tools/git-add.tool.js";
import { git_commit_tool } from "./tools/git-commit.tool.js";
import { git_diff_tool } from "./tools/git-diff.tool.js";
import { git_status_tool } from "./tools/git-status.tool.js";

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
    tools: [git_status_tool, git_diff_tool, git_add_tool, git_commit_tool],
    systemPrompt: SYSTEM_PROMPT
});

// ============================================================================
// MAIN EXECUTION
// ============================================================================

const streamResponse = await agent.invoke({
    messages: [new HumanMessage(GIT_PROMPT)]
});

console.log(streamResponse.messages.at(-1)?.content || "No response from agent.");
