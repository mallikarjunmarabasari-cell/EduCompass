export const SUPPORTED_FILE_TYPES = {
  pdf: { extensions: ['.pdf'], category: 'PDF' },
  code: { extensions: ['.py', '.java', '.js', '.ts', '.cpp', '.c', '.cs', '.rb', '.go', '.rs', '.php', '.swift'], category: 'Code' },
  text: { extensions: ['.txt', '.md', '.doc', '.docx'], category: 'Text' },
  archive: { extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'], category: 'Archive' },
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

export function detectCategory(url: string): 'Video' | 'Notes' | 'PDF' | 'Practice' | 'Reading' | 'Code' | 'Text' | 'Archive' {
  const lowercaseUrl = url.toLowerCase();

  if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) {
    return 'Video';
  }
  if (lowercaseUrl.includes('drive.google.com')) {
    return 'Notes';
  }

  for (const type of Object.values(SUPPORTED_FILE_TYPES)) {
    if (type.extensions.some((ext) => lowercaseUrl.endsWith(ext))) {
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
