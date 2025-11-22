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

  return 'Reading';
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Video: 'badge-video',
    Notes: 'badge-notes',
    PDF: 'badge-pdf',
    Practice: 'badge-practice',
    Reading: 'badge-reading',
  };
  return colors[category] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100';
}
