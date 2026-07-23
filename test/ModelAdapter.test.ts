import assert from "node:assert/strict";
import test from "node:test";

import ChatGPTAdapter from "../dist/adapters/ChatGPTAdapter.js";
import ClaudeAdapter from "../dist/adapters/ClaudeAdapter.js";
import GeminiAdapter from "../dist/adapters/GeminiAdapter.js";
import ModelAdapter from "../dist/adapters/ModelAdapter.js";

const prompt = "Test prompt";

// test("requires an API key and model name", () => {
//   assert.throws(
//     () => new ModelAdapter({ apiKey: null, model: "gpt-5.6", prompt }),
//     /API key is required/,
//   );
//   assert.throws(
//     () => new ModelAdapter({provider: 'openai', apiKey: "test-key", model: "", prompt }),
//     /Model name is required/,
//   );
// });

test("loads the ChatGPT adapter for supported OpenAI models", () => {
  const modelAdapter = new ModelAdapter({
    provider: "openai",
    apiKey: "test-key",
    model: "gpt-5.6",
    prompt,
  });

  assert.ok(modelAdapter.adapter instanceof ChatGPTAdapter);
  assert.equal(modelAdapter.model, "gpt-5.6");
});

test("loads the Claude adapter for supported Anthropic models", () => {
  const modelAdapter = new ModelAdapter({
    provider: "anthropic",
    apiKey: "test-key",
    model: "claude-3.5-sonnet",
    prompt,
  });

  assert.ok(modelAdapter.adapter instanceof ClaudeAdapter);
  assert.equal(modelAdapter.model, "claude-3.5-sonnet");
});

test("loads the Gemini adapter for supported Google models", () => {
  const modelAdapter = new ModelAdapter({
    provider: "google",
    apiKey: "test-key",
    model: "gemini-2.5-pro",
    prompt,
  });

  assert.ok(modelAdapter.adapter instanceof GeminiAdapter);
  assert.equal(modelAdapter.model, "gemini-2.5-pro");
});

test("rejects unsupported models instead of constructing an invalid adapter", () => {
  assert.throws(
    () =>
      new ModelAdapter({
        provider: "spacexai",
        apiKey: "test-key",
        model: "grok-future",
        prompt,
      }),
    /could not be resolved/,
  );
});
