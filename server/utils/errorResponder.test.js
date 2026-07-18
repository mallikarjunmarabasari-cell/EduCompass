import test from "node:test";
import assert from "node:assert/strict";
import { formatErrorPayload } from "./errorResponder.js";

test("maps HTTP validation errors to a structured validation code", () => {
  const payload = formatErrorPayload({
    statusCode: 400,
    message: "No files uploaded",
  });

  assert.equal(payload.error, "No files uploaded");
  assert.equal(payload.code, "VALIDATION_ERROR");
});

test("preserves hints when formatting validation errors", () => {
  const payload = formatErrorPayload({
    statusCode: 400,
    message: "File type not supported",
    hint: "Try a PDF or text file instead.",
  });

  assert.equal(payload.hint, "Try a PDF or text file instead.");
  assert.equal(payload.code, "VALIDATION_ERROR");
});

test("keeps default messages when no explicit error payload is provided", () => {
  const payload = formatErrorPayload({ statusCode: 500 });

  assert.equal(payload.error, "An unexpected error occurred");
  assert.equal(payload.code, "INTERNAL_ERROR");
});
