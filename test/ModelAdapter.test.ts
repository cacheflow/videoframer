import assert from "node:assert/strict";
import test from "node:test";

import ChatGPTAdapter from "../dist/adapters/ChatGPTAdapter.js";
import ClaudeAdapter from "../dist/adapters/ClaudeAdapter.js";
import GeminiAdapter from "../dist/adapters/GeminiAdapter.js";
import ModelAdapter from "../dist/adapters/ModelAdapter.js";

test("requires an API key and model name", () => {
  assert.throws(
    () => new ModelAdapter({ apiKey: null, modelName: "gpt-5.6" }),
    /API key is required/,
  );
  assert.throws(
    () => new ModelAdapter({ apiKey: "test-key", modelName: "" }),
    /Model name is required/,
  );
});

test("loads the ChatGPT adapter for supported OpenAI models", () => {
  const adapter = new ModelAdapter({
    apiKey: "test-key",
    modelName: "gpt-5.6",
  });

  assert.ok(adapter.model instanceof ChatGPTAdapter);
  assert.equal(adapter.model.model, "gpt-5.6");
});

test("loads the Claude adapter for supported Anthropic models", () => {
  const adapter = new ModelAdapter({
    apiKey: "test-key",
    modelName: "claude-3.5-sonnet",
  });

  assert.ok(adapter.model instanceof ClaudeAdapter);
  assert.equal(adapter.model.model, "claude-3.5-sonnet");
});

test("loads the Gemini adapter for supported Google models", () => {
  const adapter = new ModelAdapter({
    apiKey: "test-key",
    modelName: "gemini-2.5-pro",
  });

  assert.ok(adapter.model instanceof GeminiAdapter);
  assert.equal(adapter.model.model, "gemini-2.5-pro");
});

test("rejects unsupported models instead of constructing an invalid adapter", () => {
  assert.throws(
    () => new ModelAdapter({ apiKey: "test-key", modelName: "grok-future" }),
    /could not be resolved/,
  );
});
