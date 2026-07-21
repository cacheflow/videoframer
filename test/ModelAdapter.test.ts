import assert from "node:assert/strict";
import test from "node:test";

import ChatGPTAdapter from "../adapters/ChatGPTAdapter.js";
import ModelAdapter from "../adapters/ModelAdapter.js";

test("requires an API key and model name", () => {
  assert.throws(
    () => new ModelAdapter({ apiKey: null, modelName: "gpt-5.6" }),
    /API key is required/,
  );
  assert.throws(
    () => new ModelAdapter({ apiKey: "test-key", modelName: 'gpt-5.5' }),
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

test("rejects unsupported models instead of constructing an invalid adapter", () => {
  assert.throws(
    () => new ModelAdapter({ apiKey: "test-key", modelName: "grok-future" }),
    /could not be resolved/,
  );
});
