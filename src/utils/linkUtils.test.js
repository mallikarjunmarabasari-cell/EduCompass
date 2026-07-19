import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveResourceCategory,
  hasResourceFormChanges,
  inferCategoryFromFile,
  inferCategoryFromFiles,
  detectCategory,
  getUploadRoute,
  extractUploadedFileUrl,
  extractUploadErrorMessage,
  buildThumbnailsByUrl,
  normalizeTagNames,
  resolveResourceUrl,
  formatResourceLinkLabel,
  formatResourceLinkHint,
  getAISummaryEmptyStateMessage,
  getAISummaryActionLabel,
  getAISummaryLoadingMessage,
  getAISummaryHeading,
  getAISummaryKeyPointsHeading,
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

test("infers a category from the first supported file in a selected batch", () => {
  assert.equal(inferCategoryFromFiles(["notes.pdf", "script.py"]), "PDF");
  assert.equal(inferCategoryFromFiles(["script.py", "notes.txt"]), "Code");
});

test("uses the generic upload endpoint for non-PDF files", () => {
  assert.equal(getUploadRoute("notes.txt"), "/api/upload/file");
  assert.equal(getUploadRoute("solution.py"), "/api/upload/file");
});

test("detects file categories for URLs with query strings", () => {
  assert.equal(
    detectCategory("https://example.com/script.py?version=1"),
    "Code",
  );
  assert.equal(
    detectCategory("https://example.com/archive.zip#download"),
    "Archive",
  );
  assert.equal(
    detectCategory("https://example.com/readme.md?view=true"),
    "Text",
  );
});

test("infers text file categories for modern document formats", () => {
  assert.equal(inferCategoryFromFile("presentation.pptx"), "Text");
  assert.equal(inferCategoryFromFile("spreadsheet.xlsx"), "Text");
  assert.equal(inferCategoryFromFile("notes.odt"), "Text");
  assert.equal(inferCategoryFromFile("ebook.epub"), "Text");
});

test("keeps the legacy PDF endpoint for PDF uploads", () => {
  assert.equal(getUploadRoute("notes.pdf"), "/api/upload/pdf");
});

test("formats upload failures into a readable message", () => {
  assert.equal(
    extractUploadErrorMessage({
      error: "No files uploaded",
      code: "VALIDATION_ERROR",
    }),
    "No files uploaded",
  );
  assert.equal(
    extractUploadErrorMessage({
      error: "File type not supported",
      hint: "Try a PDF or text file instead.",
    }),
    "File type not supported. Try a PDF or text file instead.",
  );
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
  assert.equal(
    extractUploadedFileUrl({ url: "/uploads/pdfs/notes.pdf" }),
    "/uploads/pdfs/notes.pdf",
  );
  assert.equal(
    extractUploadedFileUrl({
      files: [{ url: "/uploads/pdfs/data.csv" }],
    }),
    "/uploads/pdfs/data.csv",
  );
});

test("builds thumbnail mappings for YouTube URLs while preserving existing entries", () => {
  const thumbnails = buildThumbnailsByUrl(
    [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://example.com/notes",
    ],
    {
      "https://example.com/existing": "https://example.com/existing-thumb.jpg",
    },
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

test("normalizes mixed tag formats into trimmed, unique names", () => {
  assert.deepEqual(
    normalizeTagNames([
      "  Alpha  ",
      "#beta",
      "alpha",
      { id: 7, name: "Gamma" },
      { id: 8, name: " gamma " },
      "",
      null,
    ]),
    ["Alpha", "beta", "Gamma"],
  );
});

test("formats resource links into compact display labels", () => {
  assert.equal(
    formatResourceLinkLabel("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "YouTube",
  );
  assert.equal(formatResourceLinkLabel("/uploads/pdfs/notes.pdf"), "PDF");
  assert.equal(
    formatResourceLinkLabel("https://example.com/guide"),
    "example.com",
  );
});

test("describes the resource link type for better UI hints", () => {
  assert.equal(
    formatResourceLinkHint("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
    "YouTube video",
  );
  assert.equal(formatResourceLinkHint("/uploads/pdfs/notes.pdf"), "PDF file");
  assert.equal(formatResourceLinkHint("https://example.com/guide"), "Website link");
});

test("returns compact copy helpers for the AI summary panel", () => {
  assert.equal(
    getAISummaryEmptyStateMessage(),
    "Add some content or upload a file to generate a quick summary and key points.",
  );
  assert.equal(getAISummaryActionLabel(false), "Generate AI Summary");
  assert.equal(getAISummaryLoadingMessage(), "Generating AI content...");
  assert.equal(getAISummaryHeading(), "AI Summary");
  assert.equal(getAISummaryKeyPointsHeading(), "Key Points");
});

test("keeps the AI helper text concise for empty summaries", () => {
  assert.equal(
    formatResourceLinkLabel("https://example.com/guide"),
    "example.com",
  );
});

test("prefers the selected resource URL when present, otherwise falls back to the first available link", () => {
  assert.equal(
    resolveResourceUrl(
      {
        url: "https://example.com/primary",
        urls: ["https://example.com/first", "https://example.com/second"],
      },
      "https://example.com/second",
    ),
    "https://example.com/second",
  );

  assert.equal(
    resolveResourceUrl(
      {
        url: "https://example.com/fallback",
        urls: ["https://example.com/first"],
      },
      "",
    ),
    "https://example.com/first",
  );

  assert.equal(
    resolveResourceUrl(
      {
        url: "https://example.com/fallback",
        urls: [],
      },
      "",
    ),
    "https://example.com/fallback",
  );
});
