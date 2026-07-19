import type { Resource } from '../types';

export const SUPPORTED_FILE_TYPES = {
  pdf: { extensions: ['.pdf'], category: 'PDF' },
  code: {
    extensions: [
      '.py', '.java', '.js', '.jsx', '.ts', '.tsx', '.cpp', '.c', '.cs', '.rb', '.go', '.rs', '.php', '.swift', '.json', '.yaml', '.yml', '.css', '.scss', '.sass', '.sql', '.sh', '.bash', '.ps1', '.env', '.toml', '.ini', '.cfg', '.xml', '.html', '.htm',
    ],
    category: 'Code',
  },
  text: {
    extensions: [
      '.txt', '.md', '.doc', '.docx', '.odt', '.ppt', '.pptx', '.xls', '.xlsx', '.csv', '.epub', '.mobi',
    ],
    category: 'Text',
  },
  archive: { extensions: ['.zip', '.rar', '.7z', '.tar', '.gz', '.tgz'], category: 'Archive' },
} as const;

export function getAllowedFileAccept(): string {
  return Object.values(SUPPORTED_FILE_TYPES)
    .flatMap((type) => type.extensions)
    .join(',');
}

export function inferCategoryFromFile(fileName: string): 'PDF' | 'Code' | 'Text' | 'Archive' | null {
  const lowercaseName = fileName.toLowerCase();

  for (const type of Object.values(SUPPORTED_FILE_TYPES)) {
    if (type.extensions.some((ext) => lowercaseName.endsWith(ext))) {
      return type.category as 'PDF' | 'Code' | 'Text' | 'Archive';
    }
  }

  return null;
}

export function inferCategoryFromFiles(fileNames: string[]): 'PDF' | 'Code' | 'Text' | 'Archive' | null {
  for (const fileName of fileNames) {
    const inferredCategory = inferCategoryFromFile(fileName);
    if (inferredCategory) {
      return inferredCategory;
    }
  }

  return null;
}

export function resolveResourceCategory({
  selectedCategory,
  inferredCategory,
}: {
  selectedCategory: Resource['category'];
  inferredCategory: 'PDF' | 'Code' | 'Text' | 'Archive' | null;
}): Resource['category'] {
  return inferredCategory ? (inferredCategory as Resource['category']) : selectedCategory;
}

export function hasResourceFormChanges({
  hasChanges,
  hasMeaningfulChanges,
  hasFileChanges,
}: {
  hasChanges: boolean;
  hasMeaningfulChanges: boolean;
  hasFileChanges: boolean;
}): boolean {
  return hasChanges || hasMeaningfulChanges || hasFileChanges;
}

export function getUploadRoute(fileName: string): string {
  return fileName.toLowerCase().endsWith('.pdf') ? '/api/upload/pdf' : '/api/upload/file';
}

export function extractUploadedFileUrl(response: { fileUrl?: string; url?: string; files?: Array<{ fileUrl?: string; url?: string }> | undefined }): string | null {
  const directUrl = response.fileUrl || response.url;
  if (directUrl) {
    return directUrl;
  }

  if (Array.isArray(response.files)) {
    const firstEntry = response.files[0];
    if (firstEntry?.fileUrl || firstEntry?.url) {
      return firstEntry.fileUrl || firstEntry.url || null;
    }
  }

  return null;
}

export function extractUploadErrorMessage(payload: { error?: string; message?: string; hint?: string; code?: string } | null | undefined): string {
  if (!payload) return 'Upload failed. Please try again.';

  const message = payload.error || payload.message || 'Upload failed. Please try again.';
  if (!payload.hint) return message;

  const normalizedHint = payload.hint.trim();
  const separator = message.endsWith('.') || message.endsWith('!') || message.endsWith('?') ? ' ' : '. ';
  return `${message}${separator}${normalizedHint}`;
}

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

export function buildThumbnailsByUrl(
  urls: string[] = [],
  existingThumbnailsByUrl: Record<string, string> = {},
): Record<string, string> {
  const thumbnailsByUrl: Record<string, string> = { ...existingThumbnailsByUrl };

  for (const url of urls) {
    if (!url) continue;

    const videoId = extractYouTubeId(url);
    if (videoId) {
      thumbnailsByUrl[url] = getYouTubeThumbnail(videoId);
    }
  }

  return thumbnailsByUrl;
}

export function normalizeTagNames(tags: Array<string | { id?: number; name?: string } | null | undefined>): string[] {
  const uniqueNames = new Map<string, string>();

  for (const tag of tags || []) {
    if (!tag) continue;

    const rawName = typeof tag === 'string' ? tag : tag.name;
    if (!rawName) continue;

    const normalized = rawName.trim().replace(/^#/, '');
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (!uniqueNames.has(key)) {
      uniqueNames.set(key, normalized);
    }
  }

  return Array.from(uniqueNames.values());
}

export function resolveResourceUrl(resource: Pick<Resource, 'url' | 'urls'>, selectedUrl = ''): string {
  if (selectedUrl) return selectedUrl;
  if (resource.urls && resource.urls.length > 0) {
    return resource.urls.find((url) => !!url) || resource.url || '';
  }
  return resource.url || '';
}

export function formatResourceLinkLabel(link: string): string {
  if (!link) return 'Resource';

  if (link.includes('youtube.com') || link.includes('youtu.be')) {
    return 'YouTube';
  }

  if (link.includes('.pdf') || link.startsWith('/uploads/pdfs')) {
    return 'PDF';
  }

  const isRelativePath = link.startsWith('/');
  if (isRelativePath) {
    return link.split('/').filter(Boolean).pop() || 'Resource';
  }

  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return link;
  }
}

export function formatResourceLinkHint(link: string): string {
  if (!link) return 'Resource link';

  if (link.includes('youtube.com') || link.includes('youtu.be')) {
    return 'YouTube video';
  }

  if (link.includes('.pdf') || link.startsWith('/uploads/pdfs')) {
    return 'PDF file';
  }

  if (link.startsWith('/')) {
    return 'Local file link';
  }

  return 'Website link';
}

function getUrlPath(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch (_) {
    return url.toLowerCase();
  }
}

export function detectCategory(url: string): 'Video' | 'Notes' | 'PDF' | 'Practice' | 'Reading' | 'Code' | 'Text' | 'Archive' {
  const lowercaseUrl = url.toLowerCase();
  const path = getUrlPath(url);

  if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) {
    return 'Video';
  }
  if (lowercaseUrl.includes('drive.google.com')) {
    return 'Notes';
  }

  for (const type of Object.values(SUPPORTED_FILE_TYPES)) {
    if (type.extensions.some((ext) => path.endsWith(ext))) {
      return type.category as 'Video' | 'Notes' | 'PDF' | 'Practice' | 'Reading' | 'Code' | 'Text' | 'Archive';
    }
  }

  if (
    lowercaseUrl.includes('leetcode.com') ||
    lowercaseUrl.includes('hackerrank.com') ||
    lowercaseUrl.includes('codewars.com') ||
    lowercaseUrl.includes('codeforces.com')
  ) {
    return 'Practice';
  }

  return 'Reading';
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Video: 'badge-video',
    Notes: 'badge-notes',
    PDF: 'badge-pdf',
    Practice: 'badge-practice',
    Reading: 'badge-reading',
    Code: 'badge-code',
    Text: 'badge-text',
    Archive: 'badge-archive',
  };
  return colors[category] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100';
}
