# 🚀 EduCompass Resource Management - Quick Fix Reference

## 5-Bug Summary with Quick Fixes

### 🔴 BUG #1: Resource Opening Bug (CRITICAL)

**Problem**: External link button always opens first resource  
**Root Cause**: `formatResource()` in server always returns first URL in `resource.url` field

**Quick Reference**:

- File: `server/index.js` Line 77-80
- Function: `formatResource(resource)`
- Issue: `url: resource.urls[0]` (always first)
- Also: `ResourceCard.tsx` Line 361 uses `resource.url` instead of selected URL

**Minimal Fix Steps** (30 min):

1. Modify formatResource() to set `url` as first non-empty URL
2. Modify ResourceCard to track selected URL separately
3. Pass selected URL to external link button

---

### 🟠 BUG #2: Missing Tags in Edit Modal (HIGH)

**Problem**: Tags input doesn't appear when editing resources  
**Root Cause**: No suggestions prop passed to TagInput, tag conversion issues

**Quick Reference**:

- File: `EditResourceModal.tsx` Lines 24-30, 330-338
- Issue 1: Tags converted with temp IDs
- Issue 2: No suggestions prop (Line 330)
- Issue 3: Tag conversion back to string on save (Line 88)

**Minimal Fix Steps** (20 min):

1. Load all available tags (from API or props)
2. Pass as `suggestions` prop to TagInput
3. Use proper tag IDs from database

---

### 🟠 BUG #3: Multiple YouTube Resources (HIGH)

**Problem**: Multiple YouTube videos appear identical (same thumbnail)  
**Root Cause**: Single `thumbnailUrl` field for multiple URLs

**Quick Reference**:

- File: `src/types/index.ts` Line 22 (thumbnailUrl is single field)
- File: `AddResourceModal.tsx` Lines 85-95 (only generates from first URL)
- File: `EditResourceModal.tsx` Lines 61-90 (same issue)
- Database: `SUPABASE_DATABASE_SCHEMA.sql` Line 150 (urls is JSONB array)

**Minimal Fix Steps** (1-2 hours):

1. Add `thumbnailsByUrl` JSONB field or thumbnail array
2. Generate thumbnails for each YouTube URL
3. Update UI to show correct thumbnail per URL
4. Handle duplicate video detection

---

### 🟡 BUG #4: Single PDF Upload (MEDIUM)

**Problem**: Can only upload one PDF per resource  
**Root Cause**: Frontend state is `File | null`, backend uses `upload.single()`

**Quick Reference**:

- Frontend State: `EditResourceModal.tsx` Line 40-45 (`const [pdfFile, setPdfFile]`)
- File Input: `EditResourceModal.tsx` Line 155 (no `multiple` attribute)
- Takes only: Line 158 (`e.target.files?.[0]`)
- Backend: `server/index.js` Line ~800 (`upload.single('file')`)

**Minimal Fix Steps** (1-2 hours):

1. Change `pdfFile` state to `File[]`
2. Add `multiple` attribute to input
3. Change backend to `upload.array('file')`
4. Implement batch upload handling

---

### 🟡 BUG #5: Limited File Formats (MEDIUM)

**Problem**: Only PDF supported; no code (.py, .java), text, or archives  
**Root Cause**: Hard-coded accept=".pdf", backend fileFilter only allows PDF

**Quick Reference**:

- Frontend Input: `EditResourceModal.tsx` Line 155 (`accept=".pdf"`)
- Also: `AddResourceModal.tsx` Line 131 (same)
- Backend Filter: `server/index.js` Lines 37-40 (checks `mimetype === "application/pdf"`)
- Categories: `src/types/index.ts` Line 15 (enum has only 5 types)
- Detection: `src/utils/linkUtils.ts` Lines 20-42 (no code file detection)

**Minimal Fix Steps** (2-3 hours):

1. Expand category enum in types
2. Update file input `accept` attribute with new types
3. Update backend fileFilter for new MIME types
4. Add detection logic for code/doc files
5. Increase file size limits if needed

---

## File Location Quick Map

```
Critical Files for Fixes:

Frontend Components:
  ├─ src/components/Board/
  │  ├─ ResourceCard.tsx          [BUG #1, #3]
  │  ├─ EditResourceModal.tsx     [BUG #2, #3, #4, #5]
  │  └─ AddResourceModal.tsx      [BUG #3, #4, #5]
  ├─ src/types/index.ts           [BUG #3, #5]
  └─ src/utils/linkUtils.ts       [BUG #5]

Backend:
  ├─ server/index.js              [BUG #1, #4, #5]
  │  ├─ Line 77-80: formatResource()
  │  ├─ Line 26-47: multer config
  │  └─ Line ~800: upload endpoint

Database:
  └─ SUPABASE_DATABASE_SCHEMA.sql [BUG #3, #4]
     └─ Line 150: urls JSONB field
```

---

## Testing Checklist After Fixes

### BUG #1 Fix Verification

- [ ] Create resource with 3 YouTube URLs
- [ ] Click each YouTube link → Preview opens correct video
- [ ] Click external link button → Should open currently selected URL
- [ ] Verify other YouTube links still clickable

### BUG #2 Fix Verification

- [ ] Open Edit modal for resource with tags
- [ ] Tags input should be visible
- [ ] Should be able to add new tags
- [ ] Should be able to remove existing tags
- [ ] Tags should save when resource updated

### BUG #3 Fix Verification

- [ ] Add resource with multiple YouTube URLs
- [ ] Each URL should show different thumbnail
- [ ] Duplicate URLs handled correctly
- [ ] Thumbnails persist after edit

### BUG #4 Fix Verification

- [ ] Upload multiple PDF files to one resource
- [ ] All PDFs listed in resource.urls
- [ ] Can remove individual PDFs
- [ ] PDFs properly accessible

### BUG #5 Fix Verification

- [ ] Upload .py file (Python code)
- [ ] Upload .java file (Java code)
- [ ] Upload .txt file (Text)
- [ ] Upload .zip file (Archive)
- [ ] File size limits working
- [ ] Categories auto-detected correctly

---

## Git Commit Message Template

```
Fix: Resource management bugs (#X)

- Fix #1: External link button now opens selected URL (not first)
- Fix #2: Add suggestions to TagInput in edit modal
- Fix #3: Generate thumbnails for each YouTube URL
- Fix #4: Support multiple PDF uploads per resource
- Fix #5: Add support for code and document file formats

Files changed:
  - server/index.js
  - src/components/Board/ResourceCard.tsx
  - src/components/Board/EditResourceModal.tsx
  - src/types/index.ts
  - src/utils/linkUtils.ts
  - SUPABASE_DATABASE_SCHEMA.sql (migration)
```

---

## Priority Ranking

| Fix # | Priority    | Effort | Impact | Start Date       |
| ----- | ----------- | ------ | ------ | ---------------- |
| 1     | 🔴 CRITICAL | 30 min | HIGH   | Immediately      |
| 2     | 🟠 HIGH     | 20 min | HIGH   | After #1         |
| 3     | 🟠 HIGH     | 1-2 hr | MEDIUM | After #2         |
| 4     | 🟡 MEDIUM   | 1-2 hr | MEDIUM | Parallel with #3 |
| 5     | 🟡 MEDIUM   | 2-3 hr | LOW    | Later this week  |

**Estimated Total Time**: 6-8 hours (full stack work)

---

## Code Examples for Quick Reference

### Issue 1 - formatResource() Current

```javascript
// Line 77-80 - PROBLEMATIC
url: resource.urls && resource.urls.length > 0
    ? resource.urls[0]  // Always returns first
    : resource.url || "",
```

### Issue 4 - File State Current

```jsx
// Line 40 - PROBLEMATIC
const [pdfFile, setPdfFile] = useState<File | null>(null);  // Only one file

// Should be:
const [pdfFiles, setPdfFiles] = useState<File[]>([]);  // Multiple files
```

### Issue 5 - Accept Attribute Current

```jsx
// Line 155 - PROBLEMATIC
<input type="file" accept=".pdf" />  // Only PDF

// Should be:
<input type="file" accept=".pdf,.txt,.py,.java,.c,.cpp,.zip" multiple />
```

---

## Related Issues to Watch

- Database schema change needed for BUG #3 (thumbnail mapping)
- Potential migration needed for existing resources
- File storage strategy (local vs cloud)
- Rate limiting for file uploads
- Virus scanning for uploaded files

---

**Last Updated**: April 24, 2026  
**Analysis Tool**: Automated codebase analysis  
**Status**: Ready for development
