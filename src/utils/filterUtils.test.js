import test from "node:test";
import assert from "node:assert/strict";
import { applyResourceFilters, getEmptyStateMessage } from "./filterUtils.js";

test("returns the correct message when a column has no resources", () => {
  assert.equal(
    getEmptyStateMessage({ hasResources: false, hasActiveFilters: false }),
    "No resources yet",
  );
});

test("returns a stage-specific message when the board is empty but not filtered", () => {
  assert.equal(
    getEmptyStateMessage({ hasResources: true, hasActiveFilters: false }),
    "No resources in this stage yet",
  );
});

test("returns a filter-specific message when the board is empty after filtering", () => {
  assert.equal(
    getEmptyStateMessage({ hasResources: true, hasActiveFilters: true }),
    "No resources match the current filters in this stage",
  );
});

test("filters resources by category, status, and matching tags", () => {
  const resources = [
    {
      id: "1",
      title: "React Basics",
      category: "Reading",
      status: "todo",
      tags: ["frontend", "react"],
    },
    {
      id: "2",
      title: "TypeScript Guide",
      category: "Code",
      status: "todo",
      tags: [{ name: "typescript" }],
    },
    {
      id: "3",
      title: "Algorithms",
      category: "Reading",
      status: "completed",
      tags: ["algorithms"],
    },
  ];

  const filtered = applyResourceFilters(resources, {
    category: "Reading",
    status: "todo",
    tags: ["frontend"],
  });

  assert.deepEqual(
    filtered.map((resource) => resource.id),
    ["1"],
  );
});

test("matches text search across titles and tags", () => {
  const resources = [
    {
      id: "1",
      title: "Python Notes",
      category: "Reading",
      status: "todo",
      tags: ["python"],
    },
    {
      id: "2",
      title: "Algorithms",
      category: "Reading",
      status: "todo",
      tags: ["math"],
    },
  ];

  const filtered = applyResourceFilters(resources, { query: "python" });

  assert.deepEqual(
    filtered.map((resource) => resource.id),
    ["1"],
  );
});

test("matches selected tags case-insensitively", () => {
  const resources = [
    {
      id: "1",
      title: "React Basics",
      category: "Reading",
      status: "todo",
      tags: ["React", "frontend"],
    },
    {
      id: "2",
      title: "TypeScript Guide",
      category: "Code",
      status: "todo",
      tags: ["typescript"],
    },
  ];

  const filtered = applyResourceFilters(resources, { tags: ["react"] });

  assert.deepEqual(
    filtered.map((resource) => resource.id),
    ["1"],
  );
});
