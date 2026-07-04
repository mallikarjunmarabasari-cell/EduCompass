import test from "node:test";
import assert from "node:assert/strict";
import { resolveResourceCategory, hasResourceFormChanges } from "./linkUtils.ts";

test("prefers the inferred file category when a file upload is detected", () => {
  assert.equal(
    resolveResourceCategory({
      selectedCategory: "Reading",
      inferredCategory: "Code",
    }),
    "Code",
  );
});

test("keeps the selected category when no file category can be inferred", () => {
  assert.equal(
    resolveResourceCategory({
      selectedCategory: "Reading",
      inferredCategory: null,
    }),
    "Reading",
  );
});

test("treats file changes as meaningful updates in the editor", () => {
  assert.equal(
    hasResourceFormChanges({
      hasChanges: false,
      hasMeaningfulChanges: false,
      hasFileChanges: true,
    }),
    true,
  );
});

test("keeps form changes disabled when nothing meaningful changed", () => {
  assert.equal(
    hasResourceFormChanges({
      hasChanges: false,
      hasMeaningfulChanges: false,
      hasFileChanges: false,
    }),
    false,
  );
});
