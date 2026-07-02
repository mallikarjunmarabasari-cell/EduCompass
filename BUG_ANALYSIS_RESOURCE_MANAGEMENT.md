# 🐛 EduCompass Resource Management - Bug Analysis Report

**Analysis Date**: April 24, 2026  
**Scope**: Resource opening, tags editing, YouTube handling, PDF uploads, file format support

---

## 📋 Executive Summary

Found **5 critical bugs** in resource management affecting user experience:

| #   | Bug                                        | Severity        | Status     |
| --- | ------------------------------------------ | --------------- | ---------- |
| 1   | Resource Opening (links to first URL only) | 🔴 **CRITICAL** | ❌ Unfixed |
| 2   | Missing Tags Input in Edit Modal           | 🟠 **HIGH**     | ❌ Unfixed |
| 3   | Multiple YouTube Resources Handling        | 🟠 **HIGH**     | ❌ Unfixed |
| 4   | Single PDF Upload Limitation               | 🟡 **MEDIUM**   | ❌ Unfixed |
| 5   | Limited File Format Support                | 🟡 **MEDIUM**   | ❌ Unfixed |

---

# 🐛 BUG #1: Resource Opening Bug (Critical)

## Issue Description

**User Report**: Only the first YouTube resource opens. All resources link to the first one regardless of which link is selected.

## Root Cause Analysis

### Problem 1: API Always Returns First URL

**File**: [server/index.js](server/index.js#L77-L80)

```javascript
// Line 77-80
function formatResource(resource) {
  return {
    ...resource,
    url:
      resource.urls && resource.urls.length > 0
        ? resource.urls[0] // ⚠️ ALWAYS FIRST URL!
        : resource.url || "",
    urls: resource.urls || [],
    // ...
  };
}
```

**Problem**: The `url` field is hardcoded to return the first item from `urls` array, even if the user is viewing a different resource.

### Problem 2: External Link Button Uses Primary URL

**File**: [src/components/Board/ResourceCard.tsx](src/components/Board/ResourceCard.tsx#L361-L367)

```jsx
// Line 361-367
<a
  href={resource.url} // ⚠️ Always opens first URL!
  target="_blank"
  rel="noopener noreferrer"
  className="px-3 py-1 bg-yellow-400/20 text-yellow-400 rounded text-xs font-medium hover:bg-yellow-400/30 transition"
  title="Open resource"
>
  <ExternalLink size={14} />
</a>
```

**Problem**: External link button doesn't respond to which YouTube link the user selected. It always opens `resource.url` (the first URL).

## Flow of the Bug

```
1. Resource has 3 URLs: [url1, url2, url3]
2. API response sets url = url1
3. User sees all 3 links displayed ✓
4. User clicks YouTube link for url3 → Preview opens correctly
5. User clicks External Link button → Opens url1 (WRONG!)
6. User confused: "I clicked url3 but it opened url1"
```

## Files Affected & Line Numbers

| File                                                                                     | Lines   | Issue                                                              |
| ---------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------ |
| [server/index.js](server/index.js#L77-L80)                                               | 77-80   | formatResource() returns first URL in `url` field                  |
| [src/components/Board/ResourceCard.tsx](src/components/Board/ResourceCard.tsx#L361-L367) | 361-367 | External link button ignores selected URL                          |
| [src/components/Board/ResourceCard.tsx](src/components/Board/ResourceCard.tsx#L159-L190) | 159-190 | YouTube preview selection works but external button doesn't use it |

## Impact Assessment

- ❌ Users cannot open specific resources they select
- ❌ UI shows multiple links but external button always opens first one
- ❌ Confusing user experience (appears to be a bug)
- ❌ YouTube preview modal works but external button doesn't respect selection

## Fix Complexity: **LOW** (30 minutes)

---

# 🐛 BUG #2: Missing Tags Input in Edit Modal

## Issue Description

Tags input box doesn't appear when editing resources, while it works correctly in Add modal.

## Root Cause Analysis

### Problem 1: TagInput Component Not Receiving Required Props

**File**: [src/components/Board/EditResourceModal.tsx](src/components/Board/EditResourceModal.tsx#L330-L338)

```jsx
// Line 330-338
<TagInput
  tags={tags}
  onTagsChange={(newTags) => {
    setTags(newTags);
    handleChange();
  }}
  // ⚠️ Missing: suggestions={} prop - falls back to default []
/>
```

**Problem**: No `suggestions` prop passed, so TagInput has no suggestions to filter/display.

### Problem 2: Tag Type Conversion Inconsistency

**File**: [src/components/Board/EditResourceModal.tsx](src/components/Board/EditResourceModal.tsx#L24-L30)

```jsx
// Line 24-30
const [tags, setTags] = useState<Tag[]>(
  resource.tags
    ? (Array.isArray(resource.tags)
        ? resource.tags.map((t, idx) =>
            typeof t === 'string'
              ? { id: idx, name: t }  // ⚠️ Creates temp ID
              : { id: t.id, name: t.name }
          )
        : [])
    : []
);
```

**Problem**: Tags are converted from `string[]` to `Tag[]` objects with temporary IDs, but:

- When saved (line 88), they're converted back to `string[]`
- No proper tag ID management
- Suggestions never loaded

### Problem 3: No Suggestion Loading

**File**: [src/components/Board/EditResourceModal.tsx](src/components/Board/EditResourceModal.tsx#L1-L10)

The component doesn't import or load any tag suggestions, unlike the search components that do.

**Compare with working AddResourceModal**:

- [src/components/Board/AddResourceModal.tsx](src/components/Board/AddResourceModal.tsx#L1-L25) - Uses simple string tags

## TagInput Component Interface

**File**: [src/components/Search/TagInput.tsx](src/components/Search/TagInput.tsx#L1-L10)

```typescript
interface TagInputProps {
  tags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  suggestions?: Tag[]; // Optional but component works better with it
  placeholder?: string;
  maxTags?: number;
}
```

## Files Affected & Line Numbers

| File                                                                                               | Lines   | Issue                         |
| -------------------------------------------------------------------------------------------------- | ------- | ----------------------------- |
| [src/components/Board/EditResourceModal.tsx](src/components/Board/EditResourceModal.tsx#L24-L30)   | 24-30   | Tag conversion with temp IDs  |
| [src/components/Board/EditResourceModal.tsx](src/components/Board/EditResourceModal.tsx#L330-L338) | 330-338 | Missing suggestions prop      |
| [src/components/Search/TagInput.tsx](src/components/Search/TagInput.tsx#L1-L10)                    | 1-10    | Component expects suggestions |

## Impact Assessment

- ⚠️ Users cannot add/edit tags when editing resources
- ⚠️ Tag functionality incomplete in edit modal
- ⚠️ Inconsistent with Add modal behavior

## Fix Complexity: **LOW** (20 minutes)

---

# 🐛 BUG #3: Multiple YouTube Resources Handling

## Issue Description

Multiple YouTube resources might collapse into one or appear identical due to thumbnail/category conflicts.

## Root Cause Analysis

### Problem 1: Single Thumbnail Field for Multiple URLs

**File**: [src/types/index.ts](src/types/index.ts#L10-L26)

```typescript
export interface Resource {
  id: string;
  boardId: string;
  title: string;
  url: string;
  urls?: string[]; // ✓ Can have multiple URLs
  tags?: string[] | Tag[];
  category: "Video" | "Notes" | "PDF" | "Practice" | "Reading";
  status: "todo" | "in-progress" | "completed";
  progress: number;
  description?: string;
  thumbnailUrl?: string; // ⚠️ Only ONE thumbnail for potentially multiple YouTube videos!
  // ...
}
```

**Problem**: Resource can have multiple YouTube URLs but only one `thumbnailUrl` field. If same video is added twice, both show identical thumbnail.

### Problem 2: Thumbnail Only Set on First URL

**File**: [src/components/Board/AddResourceModal.tsx](src/components/Board/AddResourceModal.tsx#L85-L95)

```javascript
// Line 85-95
// If no PDF or no primaryUrl from PDF, use first URL as primary
if (!primaryUrl) {
  const firstUrl = urls.find((url) => url.trim());
  if (firstUrl) {
    primaryUrl = firstUrl;

    if (category === "Video") {
      const videoId = extractYouTubeId(primaryUrl);
      if (videoId) {
        thumbnailUrl = getYouTubeThumbnail(videoId); // ⚠️ Only from FIRST URL
      }
    }
  }
}
```

**Problem**: Thumbnail is extracted only from the first URL, even if multiple YouTube videos are added.

### Problem 3: YouTube ID Extraction

**File**: [src/utils/linkUtils.ts](src/utils/linkUtils.ts#L1-L13)

```javascript
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
```

**Works correctly** - properly extracts IDs from different YouTube URLs, but only called on first URL.

## Scenario Example

```
Resource: "Python Tutorials"
URLs: [
  "https://youtube.com/watch?v=AAAA",  // Tutorial 1
  "https://youtube.com/watch?v=BBBB",  // Tutorial 2
  "https://youtube.com/watch?v=AAAA"   // Same as first!
]

Result:
- thumbnailUrl = thumbnail for AAAA (only first video)
- All 3 links show same thumbnail
- User confused: "Why do all YouTube links look the same?"
```

## Files Affected & Line Numbers

| File                                                                                             | Lines | Issue                                           |
| ------------------------------------------------------------------------------------------------ | ----- | ----------------------------------------------- |
| [src/types/index.ts](src/types/index.ts#L22)                                                     | 22    | Single thumbnailUrl field                       |
| [src/components/Board/AddResourceModal.tsx](src/components/Board/AddResourceModal.tsx#L85-L95)   | 85-95 | Thumbnail only from first URL                   |
| [src/components/Board/EditResourceModal.tsx](src/components/Board/EditResourceModal.tsx#L61-L90) | 61-90 | Same issue on edit                              |
| [src/utils/linkUtils.ts](src/utils/linkUtils.ts#L15-L18)                                         | 15-18 | Correctly implemented but not used for all URLs |

## Impact Assessment

- ⚠️ Multiple YouTube videos appear identical
- ⚠️ Duplicate YouTube URLs not detected
- ⚠️ Poor UX when adding multiple videos from same source

## Fix Complexity: **MEDIUM** (1-2 hours)

Requires:

- Schema change to support thumbnail array or thumbnailByUrl map
- Frontend changes to handle multiple thumbnails
- Migration of existing resources

---

# 🐛 BUG #4: PDF Multiple Upload Limitation

## Issue Description

Only a single PDF file can be uploaded per resource. No support for uploading multiple PDF files.

## Root Cause Analysis

### Problem 1: Frontend State Only Handles Single File

**File**: [src/components/Board/EditResourceModal.tsx](src/components/Board/EditResourceModal.tsx#L40-L45)

```jsx
// Line 40-45
const [pdfFile, setPdfFile] = (useState < File) | (null > null);
const [category, setCategory] = useState(resource.category);
const [status, setStatus] = useState(resource.status);
const [description, setDescription] = useState(resource.description || "");
const [moduleTag, setModuleTag] = useState(resource.moduleTag || "");
```

**Problem**: `pdfFile` is `File | null`, not `File[]`. Only one file can be stored.

### Problem 2: File Input Only Accepts Single File

**File**: [src/components/Board/EditResourceModal.tsx](src/components/Board/EditResourceModal.tsx#L155-L170)

```jsx
// Line 155-170
<input
  type="file"
  accept=".pdf"
  onChange={(e) => {
    const file = e.target.files?.[0]; // ⚠️ Only gets FIRST file!
    if (file) {
      setPdfFile(file);
      handleChange();
    }
  }}
  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 cursor-pointer"
/>
```

**Problem**: Input element doesn't have `multiple` attribute, and code only takes `[0]` (first file).

### Problem 3: Backend Only Handles Single File Upload

**File**: [server/index.js](server/index.js#L26-L47)

```javascript
// Line 26-47
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// Line 800 (approx)
app.post("/api/upload/pdf", upload.single("file"), async (req, res) => {
  // Only handles single file
  // ⚠️ Uses upload.single('file'), NOT upload.array('file')
});
```

**Problem**:

- Uses `upload.single('file')` instead of `upload.array('file')`
- Endpoint only processes one file
- No array handling logic

### Problem 4: URL Handling Doesn't Support Multiple PDFs

**File**: [src/components/Board/EditResourceModal.tsx](src/components/Board/EditResourceModal.tsx#L61-L90)

```javascript
// Line 61-90
if (pdfFile) {
  const formData = new FormData();
  formData.append('file', pdfFile);  // ⚠️ Single file

  try {
    const uploadResponse = await fetch('/api/upload/pdf', {
      method: 'POST',
      body: formData,
    });

    if (uploadResponse.ok) {
      const { fileUrl } = await uploadResponse.json();
      primaryUrl = fileUrl;
      // Only one URL is set as primary
    }
  }
}
```

## Database Schema Supports It!

**File**: [SUPABASE_DATABASE_SCHEMA.sql](SUPABASE_DATABASE_SCHEMA.sql#L150-L152)

```sql
CREATE TABLE IF NOT EXISTS resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  // ...
  urls JSONB DEFAULT '[]'::jsonb,  // ✓ Can store multiple URLs!
  // ...
);
```

The database `urls` array CAN store multiple PDFs, but frontend and backend prevent it.

## Files Affected & Line Numbers

| File                                                                                               | Lines   | Issue                               |
| -------------------------------------------------------------------------------------------------- | ------- | ----------------------------------- |
| [src/components/Board/EditResourceModal.tsx](src/components/Board/EditResourceModal.tsx#L40-L45)   | 40-45   | Single file state                   |
| [src/components/Board/EditResourceModal.tsx](src/components/Board/EditResourceModal.tsx#L155-L170) | 155-170 | Input doesn't accept multiple files |
| [src/components/Board/EditResourceModal.tsx](src/components/Board/EditResourceModal.tsx#L61-L90)   | 61-90   | Only one PDF URL set                |
| [src/components/Board/AddResourceModal.tsx](src/components/Board/AddResourceModal.tsx#L131)        | 131     | Same limitation in add modal        |
| [server/index.js](server/index.js#L26-L47)                                                         | 26-47   | Backend only handles single file    |

## Impact Assessment

- ❌ Users cannot upload multiple PDFs per resource
- ❌ Workaround: Create multiple resources (poor UX)
- ❌ Database supports it, but frontend/backend don't

## Fix Complexity: **MEDIUM** (1-2 hours)

Requires:

1. Change file input to accept multiple (`multiple` attribute)
2. Change state to `File[]`
3. Implement batch upload in backend
4. Handle multiple PDF URLs in submission

---

# 🐛 BUG #5: Limited File Format Support

## Issue Description

Only PDF files can be uploaded. No support for other document formats (.txt, .c, .py, .java, .docx, .md, etc.)

## Root Cause Analysis

### Problem 1: Frontend Only Accepts PDF

**File**: [src/components/Board/EditResourceModal.tsx](src/components/Board/EditResourceModal.tsx#L155)

```jsx
// Line 155
<input
  type="file"
  accept=".pdf" // ⚠️ Hard-coded to PDF only!
  onChange={(e) => {
    // ...
  }}
/>
```

### Problem 2: Backend Rejects Non-PDF Files

**File**: [server/index.js](server/index.js#L37-L40)

```javascript
// Line 37-40
const upload = multer({
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed")); // ⚠️ Rejects everything else
    }
  },
});
```

**Problem**: Explicit check restricts to PDF only. Other MIME types rejected.

### Problem 3: Resource Category Enum Limited

**File**: [src/types/index.ts](src/types/index.ts#L15)

```typescript
export interface Resource {
  // ...
  category: "Video" | "Notes" | "PDF" | "Practice" | "Reading";
  // ⚠️ No categories for Code, Documents, Compressed, etc.
}
```

**Problem**: Only 5 categories exist. Adding new formats requires schema changes.

### Problem 4: Category Detection Missing for Other Formats

**File**: [src/utils/linkUtils.ts](src/utils/linkUtils.ts#L20-L42)

```javascript
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
  if (
    lowercaseUrl.includes('leetcode.com') ||
    lowercaseUrl.includes('hackerrank.com') ||
    lowercaseUrl.includes('codewars.com') ||
    lowercaseUrl.includes('codeforces.com')
  ) {
    return 'Practice';
  }

  return 'Reading';  // Default catch-all, no specific code/doc detection
}
```

**Problem**: No detection for:

- Code files (.py, .java, .c, .cpp, .js, .ts)
- Documents (.txt, .md, .docx, .pptx)
- Archives (.zip, .rar, .7z)
- Other formats

## Supported Formats Currently

| Format Type   | Status           | Extension   |
| ------------- | ---------------- | ----------- |
| PDF           | ✅ Supported     | .pdf        |
| YouTube       | ✅ Supported     | (URLs)      |
| Google Drive  | ✅ Supported     | (URLs)      |
| Online Judges | ✅ Supported     | (URLs)      |
| Python Code   | ❌ Not Supported | .py         |
| Java Code     | ❌ Not Supported | .java       |
| C/C++ Code    | ❌ Not Supported | .c, .cpp    |
| JavaScript    | ❌ Not Supported | .js, .ts    |
| Text Files    | ❌ Not Supported | .txt, .md   |
| Word Docs     | ❌ Not Supported | .docx, .odt |
| Zip Archives  | ❌ Not Supported | .zip        |

## Files Affected & Line Numbers

| File                                                                                          | Lines | Issue                          |
| --------------------------------------------------------------------------------------------- | ----- | ------------------------------ |
| [src/components/Board/EditResourceModal.tsx](src/components/Board/EditResourceModal.tsx#L155) | 155   | accept=".pdf" hard-coded       |
| [src/components/Board/AddResourceModal.tsx](src/components/Board/AddResourceModal.tsx#L131)   | 131   | Same limitation                |
| [server/index.js](server/index.js#L37-L40)                                                    | 37-40 | fileFilter rejects non-PDF     |
| [src/types/index.ts](src/types/index.ts#L15)                                                  | 15    | Category enum too limited      |
| [src/utils/linkUtils.ts](src/utils/linkUtils.ts#L20-L42)                                      | 20-42 | detectCategory missing formats |

## Impact Assessment

- ❌ Cannot upload code files (.py, .java, etc.)
- ❌ Cannot upload text documents (.txt, .md)
- ❌ Cannot upload archives (.zip)
- ❌ Limited resource types for computer science education
- ❌ Workaround: Students must use external links

## Fix Complexity: **MEDIUM** (2-3 hours)

Requires:

1. Expand category enum
2. Update detectCategory() for new formats
3. Update file input accept list
4. Update backend fileFilter with new MIME types
5. Potentially increase file size limits for larger code projects
6. Add file type icons/badges

---

## 📊 Fix Priority Matrix

```
        Impact
          ↑
          │
    HIGH │ ●BUG#2  ●BUG#1  ●BUG#3
          │
   MEDIUM │           ●BUG#4
          │               ●BUG#5
     LOW  │
          └────────────────────→ Effort
            LOW   MEDIUM  HIGH
```

**Recommended Fix Order**:

1. **First**: Bug #1 (Critical, 30 min) - Users can't open correct resources
2. **Second**: Bug #2 (High, 20 min) - Quick tag fix
3. **Third**: Bug #3 (High, 1-2 hr) - Proper YouTube handling
4. **Fourth**: Bug #4 (Medium, 1-2 hr) - Multiple PDFs
5. **Fifth**: Bug #5 (Medium, 2-3 hr) - File format support

---

## 🔧 Additional Recommendations

### Database Schema Improvements Needed

1. **Add file metadata table** (if implementing file uploads):

   ```sql
   CREATE TABLE file_metadata (
     id UUID PRIMARY KEY,
     resource_id UUID NOT NULL REFERENCES resources(id),
     file_url TEXT NOT NULL,
     file_name TEXT,
     file_size INTEGER,
     mime_type TEXT,
     uploaded_at TIMESTAMP,
     FOREIGN KEY (resource_id) REFERENCES resources(id)
   );
   ```

2. **Add thumbnail mapping** for multiple videos:
   ```sql
   ALTER TABLE resources ADD COLUMN thumbnails JSONB DEFAULT '{}';
   -- Example: {"https://youtube.com/watch?v=ABC": "https://img.youtube.com/..."}
   ```

### Code Quality Improvements

1. Add validation middleware for file uploads
2. Add tests for URL extraction (YouTube, PDF detection)
3. Add integration tests for multi-URL resources
4. Consider creating a FileUploadService abstraction

---

## 📝 Notes for Development

### Environment Setup Required

- Backend needs proper MIME type configuration for new file types
- Consider virus scanning for uploaded files
- Implement rate limiting for file uploads

### Performance Considerations

- Batch PDF uploads could impact server load (implement queue)
- Thumbnail generation for multiple videos (consider caching)
- Database queries with JSONB arrays need indexing

### Security Considerations

- Validate file extensions server-side (not just MIME type)
- Implement file size limits per format
- Scan uploaded files for malware
- Prevent path traversal attacks

---

**End of Analysis Report**
