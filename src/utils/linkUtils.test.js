import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveResourceCategory,
  hasResourceFormChanges,
  inferCategoryFromFile,
  getUploadRoute,
  extractUploadedFileUrl,
  buildThumbnailsByUrl,
} from "./linkUtils.ts";

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

test("infers a code category for common developer file formats", () => {
  assert.equal(inferCategoryFromFile("component.jsx"), "Code");
  assert.equal(inferCategoryFromFile("data.json"), "Code");
});

test("infers a code category for additional web and data file formats", () => {
  assert.equal(inferCategoryFromFile("styles.css"), "Code");
  assert.equal(inferCategoryFromFile("query.sql"), "Code");
});

test("uses the generic upload endpoint for non-PDF files", () => {
  assert.equal(getUploadRoute("notes.txt"), "/api/upload/file");
  assert.equal(getUploadRoute("solution.py"), "/api/upload/file");
});

test("keeps the legacy PDF endpoint for PDF uploads", () => {
  assert.equal(getUploadRoute("notes.pdf"), "/api/upload/pdf");
});

test("extracts a file URL from either single-file or multi-file upload responses", () => {
  assert.equal(
    extractUploadedFileUrl({ fileUrl: "/uploads/pdfs/example.pdf" }),
    "/uploads/pdfs/example.pdf",
  );
  assert.equal(
    extractUploadedFileUrl({
      files: [{ fileUrl: "/uploads/pdfs/archive.zip" }],
    }),
    "/uploads/pdfs/archive.zip",
  );
});

test("builds thumbnail mappings for YouTube URLs while preserving existing entries", () => {
  const thumbnails = buildThumbnailsByUrl(
    [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://example.com/notes",
    ],
    { "https://example.com/existing": "https://example.com/existing-thumb.jpg" },
  );

  assert.equal(
    thumbnails["https://www.youtube.com/watch?v=dQw4w9WgXcQ"],
    "https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  );
  assert.equal(
    thumbnails["https://example.com/existing"],
    "https://example.com/existing-thumb.jpg",
  );
});
