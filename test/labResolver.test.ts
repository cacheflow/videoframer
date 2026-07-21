import assert from "node:assert/strict";
import test from "node:test";

import labResolver from "../resolvers/labResolver.js";

test("resolves known model names case-insensitively", () => {
  assert.equal(labResolver("GPT-5.6"), "openai");
  assert.equal(labResolver("claude-opus-4"), "anthropic");
  assert.equal(labResolver("gemini-2.5-pro"), "google");
});

test("falls back to model prefixes for newer model names", () => {
  assert.equal(labResolver("gpt-6-preview"), "openai");
  assert.equal(labResolver("claude-future"), "anthropic");
  assert.equal(labResolver("mistral-next"), "mistral");
});

test("returns an empty string for missing or unknown model names", () => {
  assert.equal(labResolver(), "");
  assert.equal(labResolver("unknown-model"), "");
});
