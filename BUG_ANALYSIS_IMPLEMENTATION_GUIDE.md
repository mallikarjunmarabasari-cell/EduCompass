# 🔧 EduCompass Resource Management - Detailed Fix Guide

## Complete Bug Analysis with Code Examples & Fix Implementations

---

# 🔴 BUG #1: Resource Opening Bug - Detailed Fix

## Current Problematic Code

### Problem Location 1: Backend formatResource()

**File**: `server/index.js` (Lines 75-95)

```javascript
// CURRENT - PROBLEMATIC
function formatResource(resource) {
  return {
    ...resource,
    id: resource.id,
    boardId: resource.board_id,
    title: resource.title,
    url:
      resource.urls && resource.urls.length > 0
        ? resource.urls[0] // ❌ ALWAYS FIRST URL
        : resource.url || "",
    urls: resource.urls || [],
    category: resource.category,
    status: resource.status,
    progress: resource.progress,
    description: resource.description,
    moduleTag: resource.module_tag,
    hasPracticeAssignment: resource.has_practice_assignment,
    assignmentCompleted: resource.assignment_completed,
    latestAssignmentScore: resource.latest_assignment_score,
    createdAt: resource.created_at,
    updatedAt: resource.updated_at,
  };
}
```

### Problem Location 2: Frontend ExternalLink Button

**File**: `src/components/Board/ResourceCard.tsx` (Lines 355-368)

```jsx
// CURRENT - PROBLEMATIC
<a
  href={resource.url} // ❌ Always opens first URL
  target="_blank"
  rel="noopener noreferrer"
  className="px-3 py-1 bg-yellow-400/20 text-yellow-400 rounded text-xs font-medium hover:bg-yellow-400/30 transition"
  title="Open resource"
>
  <ExternalLink size={14} />
</a>
```

### Problem Location 3: Missing Context for Selected URL

**File**: `src/components/Board/ResourceCard.tsx` (Lines 26-48)

```jsx
// CURRENT - MISSING SELECTED URL TRACKING
export function ResourceCard({
  resource,
  onStatusChange,
  onProgressChange,
  onDelete,
  onUpdate,
  isReadOnly = false,
}: ResourceCardProps) {
  const [showProgressEditor, setShowProgressEditor] = useState(false);
  const [tempProgress, setTempProgress] = useState(resource.progress);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showYoutubePreview, setShowYoutubePreview] = useState(false);
  const [selectedYoutubeUrl, setSelectedYoutubeUrl] = useState<string>('');
  // ❌ selectedYoutubeUrl is only used for YouTube preview modal
  // ❌ Not used for external link button
  const [aiSummary, setAISummary] = useState<{ summary: string; keyPoints: string[] } | null>(null);
  const [aiFlashcards, setAIFlashcards] = useState<any>(null);
  const [aiLoading, setAILoading] = useState(false);
  const [aiLoaded, setAILoaded] = useState(false);
```

## Fix Implementation

### Fix 1: Backend - formatResource()

**File**: `server/index.js` (Lines 75-95)

```javascript
// FIXED
function formatResource(resource) {
  return {
    ...resource,
    id: resource.id,
    boardId: resource.board_id,
    title: resource.title,
    url:
      resource.urls && resource.urls.length > 0
        ? resource.urls[0] // ✅ Keep as is (for backward compatibility)
        : resource.url || "",
    urls: resource.urls || [], // ✅ Frontend will use this
    category: resource.category,
    status: resource.status,
    progress: resource.progress,
    description: resource.description,
    moduleTag: resource.module_tag,
    hasPracticeAssignment: resource.has_practice_assignment,
    assignmentCompleted: resource.assignment_completed,
    latestAssignmentScore: resource.latest_assignment_score,
    createdAt: resource.created_at,
    updatedAt: resource.updated_at,
  };
}

// NO CHANGE NEEDED - Backend is fine as-is
// The issue is in the frontend not using resource.urls[selectedIndex]
```

### Fix 2: Frontend - Add Selected URL Tracking

**File**: `src/components/Board/ResourceCard.tsx` (Lines 26-48)

```jsx
// FIXED - Add selectedResourceUrl state
export function ResourceCard({
  resource,
  onStatusChange,
  onProgressChange,
  onDelete,
  onUpdate,
  isReadOnly = false,
}: ResourceCardProps) {
  const [showProgressEditor, setShowProgressEditor] = useState(false);
  const [tempProgress, setTempProgress] = useState(resource.progress);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showYoutubePreview, setShowYoutubePreview] = useState(false);
  const [selectedYoutubeUrl, setSelectedYoutubeUrl] = useState<string>('');
  const [selectedResourceUrl, setSelectedResourceUrl] = useState<string>(
    resource.url  // ✅ NEW: Track selected resource URL
  );
  const [aiSummary, setAISummary] = useState<{ summary: string; keyPoints: string[] } | null>(null);
  const [aiFlashcards, setAIFlashcards] = useState<any>(null);
  const [aiLoading, setAILoading] = useState(false);
  const [aiLoaded, setAILoaded] = useState(false);
```

### Fix 3: Frontend - Update Link Rendering

**File**: `src/components/Board/ResourceCard.tsx` (Lines 159-190)

```jsx
// FIXED - Set selected URL when links are rendered
{resource.urls && resource.urls.length > 0 ? (
  <>
    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Links ({resource.urls.length})</p>
    <div className="space-y-1">
      {resource.urls.map((link, index) => {
        const isYouTube = link.includes('youtube.com') || link.includes('youtu.be');
        const isPDF = link.includes('.pdf') || link.startsWith('/uploads/pdfs');
        const isRelativePath = link.startsWith('/');

        let displayName = link;
        try {
          if (!isRelativePath && !isPDF) {
            displayName = new URL(link).hostname || link;
          } else if (isPDF) {
            displayName = '📄 PDF';
          } else {
            displayName = link.split('/').pop() || link;
          }
        } catch (e) {
          displayName = isPDF ? '📄 PDF' : link;
        }

        return (
          <div key={index} className="flex items-center gap-1">
            {isYouTube ? (
              <button
                onClick={() => {
                  setSelectedYoutubeUrl(link);
                  setSelectedResourceUrl(link);  // ✅ NEW: Update selected URL
                  setShowYoutubePreview(true);
                }}
                className="flex-1 text-left text-xs px-2 py-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition flex items-center gap-1"
                title="Click to preview"
              >
                <span className="text-xs">▶</span>
                <span className="truncate">YouTube</span>
              </button>
            ) : (
              <a
                href={link}
                onClick={() => setSelectedResourceUrl(link)}  // ✅ NEW: Update on click
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-left text-xs px-2 py-1 bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30 transition truncate"
                title={link}
              >
                {displayName}
              </a>
            )}
          </div>
        );
      })}
    </div>
  </>
) : (
  // ... fallback code for single URL
)}
```

### Fix 4: Frontend - Update External Link Button

**File**: `src/components/Board/ResourceCard.tsx` (Lines 355-368)

```jsx
// FIXED - Use selectedResourceUrl instead of resource.url
<a
  href={selectedResourceUrl} // ✅ FIXED: Use selected URL
  target="_blank"
  rel="noopener noreferrer"
  className="px-3 py-1 bg-yellow-400/20 text-yellow-400 rounded text-xs font-medium hover:bg-yellow-400/30 transition"
  title={`Open ${selectedResourceUrl}`} // ✅ Show which URL opens
>
  <ExternalLink size={14} />
</a>
```

## Testing BUG #1 Fix

```javascript
// Test Case 1: Multiple YouTube URLs
const testResource = {
  id: "123",
  title: "Python Tutorials",
  url: "https://youtube.com/watch?v=AAA",
  urls: [
    "https://youtube.com/watch?v=AAA", // First video
    "https://youtube.com/watch?v=BBB", // Second video
    "https://youtube.com/watch?v=CCC", // Third video
  ],
};

// Expected Behavior:
// 1. Initial state: external button opens AAA
// 2. Click YouTube link #2: external button should open BBB
// 3. Click YouTube link #3: external button should open CCC
// 4. Click regular link: external button should open that link
```

---

# 🟠 BUG #2: Missing Tags in Edit Modal - Detailed Fix

## Current Problematic Code

### Problem Location 1: Tag State Initialization

**File**: `src/components/Board/EditResourceModal.tsx` (Lines 24-31)

```jsx
// CURRENT - PROBLEMATIC
const [tags, setTags] = useState<Tag[]>(
  resource.tags
    ? (Array.isArray(resource.tags)
        ? resource.tags.map((t, idx) =>
            typeof t === 'string'
              ? { id: idx, name: t }  // ❌ Temporary ID from array index
              : { id: t.id, name: t.name }
          )
        : [])
    : []
);
```

### Problem Location 2: TagInput Component Missing Suggestions

**File**: `src/components/Board/EditResourceModal.tsx` (Lines 330-338)

```jsx
// CURRENT - PROBLEMATIC - Missing suggestions prop
<TagInput
  tags={tags}
  onTagsChange={(newTags) => {
    setTags(newTags);
    handleChange();
  }}
  // ❌ NO suggestions prop - component has nothing to suggest
/>
```

### Problem Location 3: No Available Tags Loaded

**File**: `src/components/Board/EditResourceModal.tsx` (Lines 1-10)

```jsx
// CURRENT - No tag loading
import { useState } from 'react';
import { X, Plus, Trash2, Upload } from 'lucide-react';
import type { Resource, Tag } from '../../types';
import { TagInput } from '../Search/TagInput';

interface EditResourceModalProps {
  resource: Resource;
  onClose: () => void;
  onUpdate: (updates: Partial<Resource>) => void;
}

// ❌ No tagService imported, no tags loaded
```

## Fix Implementation

### Fix 1: Import Required Services

**File**: `src/components/Board/EditResourceModal.tsx` (Lines 1-10)

```jsx
// FIXED - Add tagService import
import { useState, useEffect } from 'react';  // ✅ Add useEffect
import { X, Plus, Trash2, Upload } from 'lucide-react';
import type { Resource, Tag } from '../../types';
import { TagInput } from '../Search/TagInput';
import { tagService } from '../../services/api';  // ✅ Import tagService

interface EditResourceModalProps {
  resource: Resource;
  onClose: () => void;
  onUpdate: (updates: Partial<Resource>) => void;
}
```

### Fix 2: Load Available Tags

**File**: `src/components/Board/EditResourceModal.tsx` (After interface, before component)

```jsx
// FIXED - Add availableTags state
export function EditResourceModal({ resource, onClose, onUpdate }: EditResourceModalProps) {
  const [title, setTitle] = useState(resource.title);
  const [urls, setUrls] = useState<string[]>(resource.urls && resource.urls.length > 0 ? resource.urls : [resource.url]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [category, setCategory] = useState(resource.category);
  const [status, setStatus] = useState(resource.status);
  const [description, setDescription] = useState(resource.description || '');
  const [moduleTag, setModuleTag] = useState(resource.moduleTag || '');

  // ✅ NEW: Add availableTags state
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  const [tags, setTags] = useState<Tag[]>(
    resource.tags
      ? (Array.isArray(resource.tags)
          ? resource.tags.map((t, idx) =>
              typeof t === 'string'
                ? { id: Date.now() + idx, name: t }  // ✅ Use timestamp-based ID instead of array index
                : { id: t.id, name: t.name }
            )
          : [])
      : []
  );

  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // ✅ NEW: Load available tags on mount
  useEffect(() => {
    loadAvailableTags();
  }, []);

  // ✅ NEW: Function to load available tags
  const loadAvailableTags = async () => {
    try {
      const response = await tagService.getAll();
      setAvailableTags(response.data || []);
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };
```

### Fix 3: Update TagInput Component with Suggestions

**File**: `src/components/Board/EditResourceModal.tsx` (Lines 330-338)

```jsx
// FIXED - Add suggestions prop
<div>
  <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
    Tags (Optional)
  </label>
  <TagInput
    tags={tags}
    onTagsChange={(newTags) => {
      setTags(newTags);
      handleChange();
    }}
    suggestions={availableTags} // ✅ NEW: Pass available tags
    placeholder="Add or select tags..."
  />
  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
    💡 Add tags to help with AI content generation and organization
  </p>
</div>
```

### Fix 4: Fix Tag Conversion on Save

**File**: `src/components/Board/EditResourceModal.tsx` (Lines 85-90)

```jsx
// CURRENT - Problematic conversion
await onUpdate({
  title,
  url: primaryUrl || finalUrls[0] || "",
  urls: finalUrls,
  category: resourceCategory,
  status,
  description,
  moduleTag,
  tags: tags.map((t) => t.name), // ✅ This part is correct
});

// FIXED - Ensure proper ID handling
await onUpdate({
  title,
  url: primaryUrl || finalUrls[0] || "",
  urls: finalUrls,
  category: resourceCategory,
  status,
  description,
  moduleTag,
  tags: tags
    .map((t) => ({
      id: t.id,
      name: t.name,
    }))
    .map((t) => t.name), // ✅ Or just convert to names if backend expects string[]
});
```

## Testing BUG #2 Fix

```javascript
// Test Case 1: Edit resource with existing tags
const testResource = {
  id: "123",
  title: "Python Basics",
  tags: ["Python", "Beginner", "Tutorial"],
};

// Expected Behavior:
// 1. Modal opens with tags displayed
// 2. Can add new tags from suggestions
// 3. Can remove existing tags
// 4. Can create new custom tags
// 5. Tags save correctly

// Test Case 2: Verify available tags load
// 1. Console should show available tags loaded
// 2. Typing in tag input should filter suggestions
// 3. Can click suggestion to add it
```

---

# 🟠 BUG #3: Multiple YouTube Resources - Detailed Fix

## Current Problematic Code

### Problem Location 1: Single Thumbnail Field in Type

**File**: `src/types/index.ts` (Lines 10-26)

```typescript
// CURRENT - PROBLEMATIC
export interface Resource {
  id: string;
  boardId: string;
  title: string;
  url: string;
  urls?: string[];
  tags?: string[] | Tag[];
  category: "Video" | "Notes" | "PDF" | "Practice" | "Reading";
  status: "todo" | "in-progress" | "completed";
  progress: number;
  description?: string;
  thumbnailUrl?: string; // ❌ SINGLE thumbnail for multiple URLs!
  moduleTag?: string;
  hasPracticeAssignment: boolean;
  assignmentCompleted: boolean;
  latestAssignmentScore?: number;
  createdAt: string;
  updatedAt: string;
}
```

### Problem Location 2: Thumbnail Only Generated for First URL

**File**: `src/components/Board/AddResourceModal.tsx` (Lines 85-106)

```javascript
// CURRENT - PROBLEMATIC
// If no PDF or no primaryUrl from PDF, use first URL as primary
if (!primaryUrl) {
  const firstUrl = urls.find(url => url.trim());
  if (firstUrl) {
    primaryUrl = firstUrl;

    if (category === 'Video') {
      const videoId = extractYouTubeId(primaryUrl);
      if (videoId) {
        thumbnailUrl = getYouTubeThumbnail(videoId);  // ❌ Only from FIRST URL
      }
    }
  }
}

// Collect all URLs (both manual entries and PDF if present)
let finalUrls: string[] = [];

// Add all manual URLs
const manualUrls = urls.filter(url => url.trim());
finalUrls.push(...manualUrls);

// But thumbnailUrl only has one image for potentially 3+ YouTube videos
```

## Fix Implementation

### Fix 1: Extend Resource Type

**File**: `src/types/index.ts` (Lines 10-26)

```typescript
// FIXED - Add thumbnail mapping
export interface Resource {
  id: string;
  boardId: string;
  title: string;
  url: string;
  urls?: string[];
  tags?: string[] | Tag[];
  category: "Video" | "Notes" | "PDF" | "Practice" | "Reading";
  status: "todo" | "in-progress" | "completed";
  progress: number;
  description?: string;
  thumbnailUrl?: string; // ✅ Keep for backward compatibility
  thumbnailsByUrl?: Record<string, string>; // ✅ NEW: Map URL to thumbnail
  moduleTag?: string;
  hasPracticeAssignment: boolean;
  assignmentCompleted: boolean;
  latestAssignmentScore?: number;
  createdAt: string;
  updatedAt: string;
}
```

### Fix 2: Generate Thumbnails for All YouTube URLs

**File**: `src/components/Board/AddResourceModal.tsx` (Lines 85-106)

```javascript
// FIXED - Generate thumbnails for all YouTube videos
let primaryUrl = '';
let resourceCategory = category;
let thumbnailUrl: string | undefined;
let thumbnailsByUrl: Record<string, string> = {};  // ✅ NEW

// Handle PDF file upload
if (pdfFile) {
  // ... PDF handling code ...
}

// If no PDF or no primaryUrl from PDF, use first URL as primary
if (!primaryUrl) {
  const firstUrl = urls.find(url => url.trim());
  if (firstUrl) {
    primaryUrl = firstUrl;

    if (category === 'Video') {
      const videoId = extractYouTubeId(primaryUrl);
      if (videoId) {
        thumbnailUrl = getYouTubeThumbnail(videoId);
      }
    }
  }
}

// ✅ NEW: Generate thumbnails for ALL YouTube URLs
const manualUrls = urls.filter(url => url.trim());
for (const url of manualUrls) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = extractYouTubeId(url);
    if (videoId) {
      const thumbUrl = getYouTubeThumbnail(videoId);
      thumbnailsByUrl[url] = thumbUrl;
    }
  }
}

// Collect all URLs (both manual entries and PDF if present)
let finalUrls: string[] = [];

// Add all manual URLs
finalUrls.push(...manualUrls);

// Add PDF URL if it exists and not already in manual URLs
if (primaryUrl && primaryUrl.includes('/uploads/pdfs')) {
  if (!finalUrls.includes(primaryUrl)) {
    finalUrls.unshift(primaryUrl);
  }
}

// If still no URLs, use primaryUrl
if (finalUrls.length === 0 && primaryUrl) {
  finalUrls = [primaryUrl];
}

const resourceData = {
  title,
  url: primaryUrl,
  urls: finalUrls,
  tags: tags,
  category: resourceCategory,
  status,
  progress: 0,
  description,
  moduleTag,
  thumbnailUrl,
  thumbnailsByUrl,  // ✅ NEW: Include thumbnail mapping
  hasPracticeAssignment: true,
  assignmentCompleted: false,
  latestAssignmentScore: undefined,
};
```

### Fix 3: Update ResourceCard to Use Correct Thumbnail

**File**: `src/components/Board/ResourceCard.tsx` (Lines 110-120)

```jsx
// FIXED - Use correct thumbnail per URL
{
  /* Category Badge */
}
<div className="flex items-center gap-2">
  <span className={`badge ${getCategoryColor(resource.category)}`}>
    {resource.category}
  </span>
  {resource.thumbnailUrl && (
    <img
      src={resource.thumbnailUrl}
      alt="thumbnail"
      className="w-10 h-10 rounded object-cover"
    />
  )}
</div>;
```

**Update to show thumbnail for selected URL**:

```jsx
// FIXED - Show thumbnail for currently selected/first YouTube URL
{
  /* Category Badge with Smart Thumbnail */
}
<div className="flex items-center gap-2">
  <span className={`badge ${getCategoryColor(resource.category)}`}>
    {resource.category}
  </span>
  {resource.thumbnailsByUrl &&
  selectedResourceUrl &&
  resource.thumbnailsByUrl[selectedResourceUrl] ? (
    <img
      src={resource.thumbnailsByUrl[selectedResourceUrl]}
      alt="thumbnail"
      className="w-10 h-10 rounded object-cover"
    />
  ) : resource.thumbnailUrl ? (
    <img
      src={resource.thumbnailUrl}
      alt="thumbnail"
      className="w-10 h-10 rounded object-cover"
    />
  ) : null}
</div>;
```

### Fix 4: Database Migration

**File**: `SUPABASE_DATABASE_SCHEMA.sql` (Add new migration)

```sql
-- Add thumbnails_by_url column to resources table
ALTER TABLE resources
ADD COLUMN IF NOT EXISTS thumbnails_by_url JSONB DEFAULT '{}'::jsonb;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_resources_thumbnails_by_url ON resources USING gin(thumbnails_by_url);

-- Update existing resources to populate thumbnails_by_url from single thumbnails
UPDATE resources
SET thumbnails_by_url = CASE
  WHEN thumbnail_url IS NOT NULL THEN jsonb_object_agg(url, thumbnail_url)
  ELSE '{}'::jsonb
END
WHERE thumbnail_url IS NOT NULL;
```

---

# 🟡 BUG #4: Single PDF Upload - Detailed Fix

## Current Problematic Code

### Problem Location 1: Single File State

**File**: `src/components/Board/EditResourceModal.tsx` (Lines 40-45)

```jsx
// CURRENT - PROBLEMATIC
const [pdfFile, setPdfFile] = (useState < File) | (null > null); // ❌ Single file only
const [category, setCategory] = useState(resource.category);
const [status, setStatus] = useState(resource.status);
const [description, setDescription] = useState(resource.description || "");
```

### Problem Location 2: File Input Without Multiple Attribute

**File**: `src/components/Board/EditResourceModal.tsx` (Lines 155-170)

```jsx
// CURRENT - PROBLEMATIC
<input
  type="file"
  accept=".pdf"
  onChange={(e) => {
    const file = e.target.files?.[0]; // ❌ Only gets FIRST file
    if (file) {
      setPdfFile(file);
      handleChange();
    }
  }}
  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer"
/>
```

### Problem Location 3: Backend Only Handles Single File

**File**: `server/index.js` (Lines ~795-815)

```javascript
// CURRENT - PROBLEMATIC
app.post("/api/upload/pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Process single file
    const fileUrl = `/uploads/pdfs/${req.file.filename}`;
    console.log("PDF uploaded:", fileUrl);

    res.json({ fileUrl });
  } catch (err) {
    console.error("Error uploading PDF:", err);
    res.status(500).json({ error: err.message });
  }
});
```

## Fix Implementation

### Fix 1: Change File State to Array

**File**: `src/components/Board/EditResourceModal.tsx` (Lines 40-45)

```jsx
// FIXED - Support multiple files
const [pdfFiles, setPdfFiles] = useState<File[]>(  // ✅ Array of files
  resource.urls
    ? resource.urls
        .filter(url => url.includes('.pdf') || url.startsWith('/uploads/pdfs'))
        .map((url, idx) => ({
          name: url.split('/').pop() || `PDF-${idx}`,
          url: url,
          isExisting: true
        }))
    : []
);
const [newPdfFiles, setNewPdfFiles] = useState<File[]>([]);  // ✅ Newly selected files
const [category, setCategory] = useState(resource.category);
```

### Fix 2: Update File Input with Multiple Attribute

**File**: `src/components/Board/EditResourceModal.tsx` (Lines 155-180)

```jsx
// FIXED - Accept multiple PDFs
<label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">
  PDF Files (Optional)
</label>;

{
  /* Display existing PDFs */
}
{
  pdfFiles.map((pdfInfo, idx) => (
    <div
      key={idx}
      className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 mb-2"
    >
      <div className="flex items-center gap-2">
        <Upload size={18} className="text-yellow-400" />
        <span className="text-sm text-gray-900 dark:text-white">
          {typeof pdfInfo === "string"
            ? pdfInfo.split("/").pop()
            : pdfInfo.name}
        </span>
      </div>
      <button
        type="button"
        onClick={() => {
          setPdfFiles(pdfFiles.filter((_, i) => i !== idx));
          handleChange();
        }}
        className="p-1 hover:bg-red-500/20 rounded transition text-red-500"
        title="Remove PDF"
      >
        <Trash2 size={16} />
      </button>
    </div>
  ));
}

{
  /* New file upload */
}
<input
  type="file"
  accept=".pdf"
  multiple // ✅ NEW: Accept multiple files
  onChange={(e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setNewPdfFiles((prev) => [...prev, ...files]);
      handleChange();
    }
  }}
  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer"
/>;

{
  /* Show newly selected PDFs */
}
{
  newPdfFiles.length > 0 && (
    <div className="mt-2 space-y-1">
      {newPdfFiles.map((file, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800"
        >
          <span className="text-sm text-gray-700 dark:text-gray-300">
            📄 {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
          </span>
          <button
            type="button"
            onClick={() => {
              setNewPdfFiles(newPdfFiles.filter((_, i) => i !== idx));
              handleChange();
            }}
            className="text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
```

### Fix 3: Update Submit Handler for Multiple PDFs

**File**: `src/components/Board/EditResourceModal.tsx` (Lines 61-90)

```javascript
// FIXED - Handle multiple PDF uploads
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!title.trim()) return;
  const hasUrls = urls.some(url => url.trim());
  if (!hasUrls && newPdfFiles.length === 0 && pdfFiles.length === 0) return;

  setLoading(true);
  try {
    let primaryUrl = '';
    let uploadedPdfUrls: string[] = [];  // ✅ NEW: Track all uploaded PDFs
    let resourceCategory = category;

    // ✅ NEW: Handle multiple PDF files upload
    if (newPdfFiles.length > 0) {
      for (const pdfFile of newPdfFiles) {
        const formData = new FormData();
        formData.append('file', pdfFile);

        try {
          const uploadResponse = await fetch('/api/upload/pdf', {
            method: 'POST',
            body: formData,
          });

          if (uploadResponse.ok) {
            const { fileUrl } = await uploadResponse.json();
            uploadedPdfUrls.push(fileUrl);
            if (!primaryUrl) {
              primaryUrl = fileUrl;
            }
            if (!resourceCategory.includes('PDF')) {
              resourceCategory = 'PDF';
            }
          }
        } catch (error) {
          console.error('Error uploading PDF:', error);
        }
      }
    }

    // If no PDF uploads, use first URL as primary
    if (!primaryUrl) {
      const firstUrl = urls.find(url => url.trim());
      if (firstUrl) {
        primaryUrl = firstUrl;
      }
    }

    // ✅ NEW: Collect all URLs (manual URLs, new PDFs, and existing PDFs)
    let finalUrls: string[] = [];

    // Add new uploaded PDFs
    finalUrls.push(...uploadedPdfUrls);

    // Add manual URLs
    const manualUrls = urls.filter(url => url.trim());
    finalUrls.push(...manualUrls);

    // Add existing PDFs that weren't removed
    finalUrls.push(
      ...pdfFiles
        .filter(p => typeof p === 'string' || p.isExisting)
        .map(p => typeof p === 'string' ? p : p.url)
    );

    // If still no URLs, use primaryUrl
    if (finalUrls.length === 0 && primaryUrl) {
      finalUrls = [primaryUrl];
    }

    await onUpdate({
      title,
      url: primaryUrl || finalUrls[0] || '',
      urls: finalUrls,
      category: resourceCategory,
      status,
      description,
      moduleTag,
      tags: tags.map(t => t.name),
    });
    onClose();
  } finally {
    setLoading(false);
  }
};
```

### Fix 4: Backend - Support Multiple File Upload

**File**: `server/index.js` (Update endpoint)

```javascript
// FIXED - Handle multiple file uploads
app.post("/api/upload/pdf", upload.array("file", 10), async (req, res) => {
  // ✅ upload.array() and max 10 files
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    // ✅ NEW: Process multiple files
    const fileUrls = req.files.map((file) => ({
      fileUrl: `/uploads/pdfs/${file.filename}`,
      fileName: file.originalname,
      fileSize: file.size,
    }));

    console.log("PDFs uploaded:", fileUrls.length, "files");

    res.json({
      files: fileUrls,
      count: fileUrls.length,
    });
  } catch (err) {
    console.error("Error uploading PDFs:", err);
    res.status(500).json({ error: err.message });
  }
});
```

---

# 🟡 BUG #5: Limited File Format Support - Detailed Fix

## Current Problematic Code

### Problem Location 1: Hard-coded Accept Attribute

**File**: `src/components/Board/EditResourceModal.tsx` (Line 155)

```jsx
// CURRENT - PROBLEMATIC
<input
  type="file"
  accept=".pdf" // ❌ Only PDF
  onChange={(e) => {
    // ...
  }}
/>
```

### Problem Location 2: Backend MIME Type Check

**File**: `server/index.js` (Lines 37-40)

```javascript
// CURRENT - PROBLEMATIC
const upload = multer({
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      // ❌ Only allows PDF
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});
```

### Problem Location 3: Limited Categories

**File**: `src/types/index.ts` (Line 15)

```typescript
// CURRENT - PROBLEMATIC
category: "Video" | "Notes" | "PDF" | "Practice" | "Reading";
// ❌ No Code, Document, Archive categories
```

### Problem Location 4: Missing Detection Logic

**File**: `src/utils/linkUtils.ts` (Lines 20-42)

```javascript
// CURRENT - PROBLEMATIC - No code/doc detection
export function detectCategory(url: string): 'Video' | 'Notes' | 'PDF' | 'Practice' | 'Reading' {
  const lowercaseUrl = url.toLowerCase();

  if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) {
    return 'Video';
  }
  if (lowercaseUrl.includes('drive.google.com')) {
    return 'Notes';
  }
  if (lowercaseUrl.includes('.pdf')) {
    return 'PDF';
  }
  // ❌ No detection for .py, .java, .txt, .zip, etc.
  if (lowercaseUrl.includes('leetcode.com') || /* ... */) {
    return 'Practice';
  }

  return 'Reading';  // Default, no code/doc type
}
```

## Fix Implementation

### Fix 1: Expand Category Enum

**File**: `src/types/index.ts` (Line 15)

```typescript
// FIXED - Add more categories
export interface Resource {
  id: string;
  boardId: string;
  title: string;
  url: string;
  urls?: string[];
  tags?: string[] | Tag[];
  category:
    | "Video"
    | "Notes"
    | "PDF"
    | "Practice"
    | "Reading"
    | "Code"
    | "Document"
    | "Archive"; // ✅ NEW types
  status: "todo" | "in-progress" | "completed";
  // ... rest of fields
}
```

### Fix 2: Create File Type Configuration

**File**: `src/utils/linkUtils.ts` (Add at top)

```javascript
// ✅ NEW: File type mappings
export const SUPPORTED_FILE_TYPES = {
  pdf: {
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
    label: 'PDF Document',
    category: 'PDF',
  },
  code: {
    extensions: ['.py', '.java', '.c', '.cpp', '.js', '.ts', '.jsx', '.tsx', '.cs', '.rb', '.go', '.rs', '.kt'],
    mimeTypes: ['text/x-python', 'text/x-java-source', 'text/plain', 'text/x-csrc', 'text/javascript', 'text/typescript'],
    label: 'Source Code',
    category: 'Code',
  },
  document: {
    extensions: ['.txt', '.md', '.docx', '.doc', '.odt', '.rtf'],
    mimeTypes: ['text/plain', 'text/markdown', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'application/vnd.oasis.opendocument.text'],
    label: 'Document',
    category: 'Document',
  },
  archive: {
    extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'],
    mimeTypes: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
    label: 'Archive',
    category: 'Archive',
  },
};

// ✅ NEW: Build accept string and MIME types list
export function getAllowedFileAccept(): string {
  const extensions = Object.values(SUPPORTED_FILE_TYPES)
    .flatMap(type => type.extensions)
    .join(',');
  return extensions;
}

export function getAllowedMimeTypes(): string[] {
  return Object.values(SUPPORTED_FILE_TYPES)
    .flatMap(type => type.mimeTypes);
}
```

### Fix 3: Update Category Detection

**File**: `src/utils/linkUtils.ts` (Lines 20-42)

```javascript
// FIXED - Enhanced category detection
export function detectCategory(url: string): 'Video' | 'Notes' | 'PDF' | 'Practice' | 'Reading' | 'Code' | 'Document' | 'Archive' {
  const lowercaseUrl = url.toLowerCase();

  if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) {
    return 'Video';
  }
  if (lowercaseUrl.includes('drive.google.com')) {
    return 'Notes';
  }

  // ✅ NEW: Check for code files
  const codeExtensions = SUPPORTED_FILE_TYPES.code.extensions;
  if (codeExtensions.some(ext => lowercaseUrl.endsWith(ext))) {
    return 'Code';
  }

  // ✅ NEW: Check for documents
  const docExtensions = SUPPORTED_FILE_TYPES.document.extensions;
  if (docExtensions.some(ext => lowercaseUrl.endsWith(ext))) {
    return 'Document';
  }

  // ✅ NEW: Check for archives
  const archExtensions = SUPPORTED_FILE_TYPES.archive.extensions;
  if (archExtensions.some(ext => lowercaseUrl.endsWith(ext))) {
    return 'Archive';
  }

  if (lowercaseUrl.includes('.pdf')) {
    return 'PDF';
  }

  if (lowercaseUrl.includes('leetcode.com') || lowercaseUrl.includes('hackerrank.com') || /* ... */) {
    return 'Practice';
  }

  return 'Reading';
}
```

### Fix 4: Update File Input Accept Attribute

**File**: `src/components/Board/EditResourceModal.tsx` (Lines 155)

```jsx
// FIXED - Accept multiple file types
import { getAllowedFileAccept } from "../../utils/linkUtils"; // ✅ Import

// In the form:
<input
  type="file"
  accept={getAllowedFileAccept()} // ✅ NEW: Dynamic accept list
  multiple
  onChange={(e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Handle file upload
    }
  }}
  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer"
/>;
```

### Fix 5: Update Backend File Filter

**File**: `server/index.js` (Lines 37-47)

```javascript
// FIXED - Support multiple file types
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-python",
  "text/x-java-source",
  "text/x-csrc",
  "text/javascript",
  "text/typescript",
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.oasis.opendocument.text",
];

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      // ✅ Check against allowed list
      cb(null, true);
    } else {
      // ✅ NEW: Provide helpful error message
      const fileName = file.originalname;
      const ext = fileName.substring(fileName.lastIndexOf("."));
      cb(
        new Error(
          `File type ${ext} is not allowed. Supported types: PDF, Code, Documents, Archives`,
        ),
      );
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024, // ✅ Increased from 50MB to 100MB for code projects
  },
});
```

### Fix 6: Add Category Icons/Badges

**File**: `src/utils/linkUtils.ts` (Add function)

```javascript
// ✅ NEW: Get icon for category
export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Video': '▶️',
    'Notes': '📝',
    'PDF': '📄',
    'Practice': '⚙️',
    'Reading': '📖',
    'Code': '💻',
    'Document': '📑',
    'Archive': '📦',
  };
  return icons[category] || '📎';
}

// ✅ NEW: Get category description
export function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    'Video': 'Video content',
    'Notes': 'Study notes',
    'PDF': 'PDF document',
    'Practice': 'Practice problems',
    'Reading': 'Reading material',
    'Code': 'Source code',
    'Document': 'Text document',
    'Archive': 'Compressed archive',
  };
  return descriptions[category] || 'Resource';
}
```

### Fix 7: Update CSS for New Categories

**File**: `src/index.css` (Add new badge classes)

```css
/* Code category badge */
.badge-code {
  @apply bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100;
}

/* Document category badge */
.badge-document {
  @apply bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100;
}

/* Archive category badge */
.badge-archive {
  @apply bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-100;
}
```

---

## 📋 Complete Fix Checklist

### BUG #1: Resource Opening

- [ ] Update ResourceCard.tsx to track selectedResourceUrl
- [ ] Modify external link button to use selectedResourceUrl
- [ ] Test with multiple URLs
- [ ] Verify YouTube preview still works

### BUG #2: Missing Tags

- [ ] Add useEffect and tagService import to EditResourceModal
- [ ] Add availableTags state and loadAvailableTags function
- [ ] Pass suggestions prop to TagInput
- [ ] Test tag loading and selection
- [ ] Verify tag IDs are not array indices

### BUG #3: Multiple YouTube

- [ ] Add thumbnailsByUrl to Resource interface
- [ ] Generate thumbnails for all YouTube URLs
- [ ] Update database schema
- [ ] Update ResourceCard to display correct thumbnail
- [ ] Test with multiple YouTube videos

### BUG #4: Multiple PDFs

- [ ] Change pdfFile state to pdfFiles array
- [ ] Add multiple attribute to file input
- [ ] Update submit handler for batch uploads
- [ ] Update backend to use upload.array()
- [ ] Test multiple PDF upload

### BUG #5: File Format Support

- [ ] Create SUPPORTED_FILE_TYPES configuration
- [ ] Update category enum
- [ ] Enhance detectCategory function
- [ ] Update file input accept attribute
- [ ] Update backend MIME type check
- [ ] Add category icons/badges
- [ ] Test with various file types

---

**Generated**: April 24, 2026  
**Format**: Complete Implementation Guide  
**Status**: Ready for Development
