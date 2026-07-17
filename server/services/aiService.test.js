import test from "node:test";
import assert from "node:assert/strict";
import { buildFallbackContent } from "./aiService.js";
import { generateAIContent } from "./aiService.js";

test("buildFallbackContent creates summary, key points, and flashcards from source text", () => {
  const text =
    "Artificial intelligence helps students organize study materials. It can summarize articles and generate flashcards. This makes review faster.";

  const fallback = buildFallbackContent(text, "article_text");

  assert.match(fallback.summary, /Artificial intelligence/i);
  assert.ok(Array.isArray(fallback.keyPoints));
  assert.ok(fallback.keyPoints.length > 0);
  assert.ok(Array.isArray(fallback.flashcards));
  assert.ok(fallback.flashcards.length > 0);
});

test("buildFallbackContent splits multi-line notes into multiple key points", () => {
  const text = "First concept\nSecond concept\nThird concept";

  const fallback = buildFallbackContent(text, "article_text");

  assert.ok(fallback.keyPoints.length >= 3);
  assert.ok(fallback.flashcards.length >= 3);
  assert.match(fallback.summary, /First concept/i);
});

test("generateAIContent uses fallback when GEMINI_API_KEY is missing", async () => {
  // Ensure GEMINI_API_KEY is undefined for this test
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const sample = "This is a simple sample content used to trigger fallback generation.";

  try {
    const res = await generateAIContent(sample, "article_text");
    assert.equal(res.source, "fallback");
    assert.ok(res.summary && typeof res.summary === 'string');
    assert.ok(Array.isArray(res.flashcards));
  } finally {
    // Restore original environment
    if (originalKey !== undefined) process.env.GEMINI_API_KEY = originalKey;
  }
});
